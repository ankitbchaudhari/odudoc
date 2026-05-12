"use client";

// Paper-Rx import flow.
//
//   1. Patient drops an image (or pastes existing text).
//   2. Tesseract.js (loaded from CDN at runtime) OCRs the image
//      → text appears in the textbox.
//   3. /api/rx-ocr/parse splits text into structured items as
//      they edit.
//   4. Each item runs through /api/rx/check (drug-safety) so the
//      user gets a heads-up on interactions before saving.
//   5. Save → row in /api/rx-ocr/imports; one click to push the
//      drugs into the pharmacy-fulfillment matcher.

import { useCallback, useEffect, useState } from "react";
import RxSafetyPanel from "@/components/RxSafetyPanel";

interface ParsedRxItem {
  drugName: string; brand?: string; strength?: string; form?: string;
  dose?: string; frequency?: string; rawFrequency?: string;
  route?: string; durationDays?: number; quantity?: number;
  instructions?: string; rawLine: string; confidence: number;
}
interface ImportRow {
  id: string; rawText: string; items: ParsedRxItem[];
  status: string; photoUrl?: string; createdAt: string;
}

const FORM_EMOJI: Record<string, string> = {
  tablet: "💊", capsule: "💊", syrup: "🥄", injection: "💉",
  drops: "💧", cream: "🧴", ointment: "🧴", gel: "🧴",
  spray: "💨", suspension: "🥄", solution: "🥄",
};

declare global {
  interface Window {
    Tesseract?: { recognize: (image: string | File | Blob, lang?: string, opts?: unknown) => Promise<{ data: { text: string } }> };
  }
}

async function ensureTesseract(): Promise<NonNullable<Window["Tesseract"]>> {
  if (typeof window === "undefined") throw new Error("ssr");
  if (window.Tesseract) return window.Tesseract;
  const sources = [
    "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
    "https://unpkg.com/tesseract.js@5/dist/tesseract.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js",
  ];
  for (const src of sources) {
    const ok = await new Promise<boolean>((resolve) => {
      const s = document.createElement("script");
      s.src = src; s.async = true; s.crossOrigin = "anonymous";
      s.onload = () => resolve(true);
      s.onerror = () => { s.remove(); resolve(false); };
      document.head.appendChild(s);
    });
    if (ok && window.Tesseract) return window.Tesseract;
  }
  throw new Error("Couldn't load Tesseract.js");
}

export default function RxImportPage() {
  const [rawText, setRawText] = useState("");
  const [items, setItems] = useState<ParsedRxItem[]>([]);
  const [unparsed, setUnparsed] = useState<string[]>([]);
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [ocrPhase, setOcrPhase] = useState<"idle" | "loading" | "running" | "done" | "error">("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const loadImports = useCallback(async () => {
    const r = await fetch("/api/rx-ocr/imports", { cache: "no-store" });
    if (r.ok) setImports((await r.json()).imports || []);
  }, []);

  useEffect(() => { loadImports(); }, [loadImports]);

  // Re-parse text on edit (debounced).
  useEffect(() => {
    if (!rawText.trim()) { setItems([]); setUnparsed([]); return; }
    const handle = setTimeout(async () => {
      const r = await fetch("/api/rx-ocr/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: rawText }) });
      if (r.ok) {
        const d = await r.json();
        setItems(d.items || []);
        setUnparsed(d.unparsed || []);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [rawText]);

  const onPhotoPick = (file: File) => {
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    setOcrPhase("idle");
    setOcrError(null);
  };

  const runOcr = async () => {
    if (!photoFile) return;
    setOcrError(null);
    setOcrPhase("loading");
    setOcrProgress(0);
    try {
      const T = await ensureTesseract();
      setOcrPhase("running");
      const r = await T.recognize(photoFile, "eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.progress) setOcrProgress(Math.round(m.progress * 100));
        },
      });
      setRawText((prev) => (prev ? prev + "\n\n" : "") + r.data.text.trim());
      setOcrPhase("done");
    } catch (e) {
      setOcrError((e as Error).message);
      setOcrPhase("error");
    }
  };

  const updateItem = (idx: number, patch: Partial<ParsedRxItem>) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const addBlankItem = () => setItems((prev) => [...prev, { drugName: "", rawLine: "(manual)", confidence: 0.6 }]);

  const save = async () => {
    if (!rawText.trim() || items.length === 0) return;
    const r = await fetch("/api/rx-ocr/imports", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText, items }),
    });
    if (r.ok) {
      setToast({ kind: "ok", text: "Saved to your records." });
      setRawText(""); setItems([]); setUnparsed([]); setPhotoFile(null); setPhotoUrl(null);
      setOcrPhase("idle");
      await loadImports();
    } else {
      setToast({ kind: "err", text: "Save failed." });
    }
  };

  const discard = async (id: string) => {
    if (!confirm("Discard this import?")) return;
    const r = await fetch(`/api/rx-ocr/imports/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "discard" }),
    });
    if (r.ok) { setToast({ kind: "ok", text: "Discarded." }); await loadImports(); }
  };

  // Drug-safety panel input.
  const newDrugs = items.filter((i) => i.drugName).map((i) => ({ name: i.drugName, strength: i.strength }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Import Paper Prescription</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Photograph or paste an old prescription. We&apos;ll OCR it in your browser, parse the drugs, run a safety check, and save it to your records — ready for refill orders.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* OCR + transcript */}
        <div className="space-y-3">
          <section className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm">
            <p className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-100">1. Add prescription image</p>
            <input
              type="file" accept="image/*" capture="environment"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhotoPick(f); }}
              className="block w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            />
            {photoUrl && (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="Prescription" className="max-h-60 w-full rounded-lg border border-slate-200 dark:border-slate-800 object-contain" />
                <button onClick={runOcr} disabled={ocrPhase === "loading" || ocrPhase === "running"} className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50">
                  {ocrPhase === "loading" ? "Loading OCR…" : ocrPhase === "running" ? `OCR ${ocrProgress}%` : "Run OCR"}
                </button>
              </div>
            )}
            {ocrError && <p className="mt-2 rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">{ocrError}</p>}
            <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">Tesseract.js runs in your browser — no image leaves your device.</p>
          </section>

          <section className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm">
            <p className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-100">2. OCR text (edit if needed)</p>
            <textarea
              rows={8} value={rawText} onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste here, or use the photo + Run OCR above. Example:&#10;&#10;Tab. Crocin 500mg 1-0-1 x 5 days&#10;Cap. Amoxicillin 500mg 1-1-1 x 7 days #21&#10;Tab. Pantoprazole 40mg OD before food x 14 days"
              className="w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 p-3 font-mono text-xs leading-5"
            />
          </section>
        </div>

        {/* Parsed items */}
        <div className="space-y-3">
          <section className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">3. Parsed medications ({items.length})</p>
              <button onClick={addBlankItem} className="text-xs font-semibold text-indigo-600">+ Add manually</button>
            </div>
            {items.length === 0 ? (
              <p className="rounded-md bg-slate-50 dark:bg-slate-900 p-3 text-sm text-slate-500 dark:text-slate-400">{rawText ? "No drugs detected yet — keep typing or check formatting." : "Paste or photograph an Rx to get started."}</p>
            ) : (
              <ul className="space-y-2">
                {items.map((it, i) => (
                  <li key={i} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{FORM_EMOJI[it.form || "tablet"] || "💊"}</span>
                        <input value={it.drugName} onChange={(e) => updateItem(i, { drugName: e.target.value })} className="rounded border border-slate-300 px-2 py-0.5 font-bold text-sm capitalize" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${it.confidence < 0.7 ? "bg-amber-200 text-amber-800" : "bg-emerald-200 text-emerald-800"}`}>{Math.round(it.confidence * 100)}%</span>
                        <button onClick={() => removeItem(i)} className="text-rose-600">✕</button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <label className="flex flex-col"><span className="font-semibold text-slate-500 dark:text-slate-400">Strength</span><input value={it.strength || ""} onChange={(e) => updateItem(i, { strength: e.target.value })} className="rounded border border-slate-300 px-1.5 py-0.5" /></label>
                      <label className="flex flex-col"><span className="font-semibold text-slate-500 dark:text-slate-400">Frequency</span><input value={it.frequency || ""} onChange={(e) => updateItem(i, { frequency: e.target.value })} className="rounded border border-slate-300 px-1.5 py-0.5" placeholder="OD / BID / TID / HS" /></label>
                      <label className="flex flex-col"><span className="font-semibold text-slate-500 dark:text-slate-400">Route</span><input value={it.route || ""} onChange={(e) => updateItem(i, { route: e.target.value })} className="rounded border border-slate-300 px-1.5 py-0.5" /></label>
                      <label className="flex flex-col"><span className="font-semibold text-slate-500 dark:text-slate-400">Duration (days)</span><input type="number" value={it.durationDays ?? ""} onChange={(e) => updateItem(i, { durationDays: Number(e.target.value) || undefined })} className="rounded border border-slate-300 px-1.5 py-0.5" /></label>
                      <label className="flex flex-col col-span-2"><span className="font-semibold text-slate-500 dark:text-slate-400">Notes</span><input value={it.instructions || ""} onChange={(e) => updateItem(i, { instructions: e.target.value })} className="rounded border border-slate-300 px-1.5 py-0.5" placeholder="before food / after meals" /></label>
                    </div>
                    <p className="mt-1 text-[10px] italic text-slate-500 dark:text-slate-400">From: &ldquo;{it.rawLine}&rdquo;</p>
                  </li>
                ))}
              </ul>
            )}

            {unparsed.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs">
                <p className="font-bold text-amber-900">Lines we couldn&apos;t parse ({unparsed.length})</p>
                <ul className="mt-1 list-disc pl-4 text-amber-800">
                  {unparsed.slice(0, 5).map((u, i) => <li key={i} className="italic">&ldquo;{u}&rdquo;</li>)}
                </ul>
                <p className="mt-1 text-[10px] text-amber-700">Edit the OCR text above to fix or add manually.</p>
              </div>
            )}
          </section>

          {/* Drug-safety check */}
          {newDrugs.length > 0 && (
            <section className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm">
              <p className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-100">4. Safety check</p>
              <RxSafetyPanel newDrugs={newDrugs} hideWhenClean={false} />
            </section>
          )}

          <button onClick={save} disabled={items.length === 0 || !rawText.trim()} className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
            Save to my records
          </button>
        </div>
      </div>

      <section className="mt-8 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">Past imports ({imports.length})</p>
        {imports.length === 0 ? (
          <p className="text-sm text-slate-400">No imports yet.</p>
        ) : (
          <ul className="space-y-2">
            {imports.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{new Date(r.createdAt).toLocaleString()} · {r.items.length} medication{r.items.length === 1 ? "" : "s"}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{r.items.map((x) => x.drugName).join(", ")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${r.status === "saved" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600 dark:text-slate-300"}`}>{r.status}</span>
                    {r.status === "saved" && <button onClick={() => discard(r.id)} className="text-[10px] text-rose-600">Discard</button>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
