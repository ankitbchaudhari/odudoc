"use client";

// Document vault — patient uploads + browses prescriptions, lab
// reports, discharge summaries, imaging, insurance docs, vaccine
// records, consent forms.
//
// File picker reads as a data URL, gated on 4 MB / 50 docs per
// user. Listings strip the data URL — the click-to-view path
// fetches the single document by id.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Category = "prescription" | "lab_report" | "discharge" | "imaging" | "insurance" | "vaccination" | "consent" | "other";

interface DocMeta {
  id: string; userId: string; title: string; category: Category;
  mimeType: string; bytes: number;
  source?: string; documentDate?: string; uploadedAt: string; notes?: string;
}

const CATEGORY_LABEL: Record<Category, string> = {
  prescription: "Prescription", lab_report: "Lab report", discharge: "Discharge summary",
  imaging: "Imaging", insurance: "Insurance", vaccination: "Vaccination",
  consent: "Consent", other: "Other",
};
const CATEGORY_EMOJI: Record<Category, string> = {
  prescription: "💊", lab_report: "🧪", discharge: "🏥", imaging: "🩻",
  insurance: "📋", vaccination: "💉", consent: "🔐", other: "📄",
};

const MAX_BYTES = 4 * 1024 * 1024;

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/documents", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setDocs(d.documents || []);
      }
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => filter === "all" ? docs : docs.filter((d) => d.category === filter), [docs, filter]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: docs.length };
    for (const d of docs) c[d.category] = (c[d.category] || 0) + 1;
    return c;
  }, [docs]);

  const view = async (id: string) => {
    const r = await fetch(`/api/documents?id=${encodeURIComponent(id)}`);
    if (!r.ok) return;
    const d = await r.json();
    const data = d.document.data as string;
    // Open in a new tab. data: URLs work in most modern browsers
    // for images/PDFs; some browsers block data: navigations, in
    // which case we fall back to a Blob URL.
    try {
      window.open(data, "_blank");
    } catch {
      const blob = await (await fetch(data)).blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    await fetch(`/api/documents?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My documents</h1>
          <p className="mt-1 text-sm text-slate-500">
            Prescriptions, reports, imaging, insurance — one secure place. {docs.length}/50 used.
          </p>
        </div>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
        >
          {showUpload ? "Cancel" : "+ Upload document"}
        </button>
      </div>

      {showUpload && (
        <UploadForm onSaved={() => { setShowUpload(false); load(); }} />
      )}

      {/* Category chips */}
      <div className="mt-6 mb-4 flex flex-wrap gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")} count={counts.all}>All</Chip>
        {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => {
          const n = counts[c] || 0;
          if (n === 0 && filter !== c) return null;
          return (
            <Chip key={c} active={filter === c} onClick={() => setFilter(c)} count={n}>
              {CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}
            </Chip>
          );
        })}
      </div>

      {loading ? (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-3xl">📄</p>
          <p className="mt-2 text-base font-bold text-slate-700">No documents yet</p>
          <p className="mt-1 text-sm text-slate-500">Upload your first prescription or lab report to start your medical record.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((d) => (
            <li key={d.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="text-2xl flex-none">{CATEGORY_EMOJI[d.category]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{d.title}</p>
                    <p className="text-xs text-slate-500">{CATEGORY_LABEL[d.category]}</p>
                    {d.source && <p className="mt-0.5 truncate text-[11px] text-slate-500">{d.source}</p>}
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{d.documentDate ? new Date(d.documentDate).toLocaleDateString() : new Date(d.uploadedAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{fmtBytes(d.bytes)}</span>
                      <span>·</span>
                      <span className="uppercase">{d.mimeType.split("/")[1] || d.mimeType}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => remove(d.id)} aria-label="Delete" className="flex-none rounded-lg p-1.5 text-rose-500 hover:bg-rose-50">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => view(d.id)}
                className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Open document
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: React.ReactNode; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
      <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>{count}</span>
    </button>
  );
}

function UploadForm({ onSaved }: { onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("lab_report");
  const [source, setSource] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [data, setData] = useState<{ url: string; mime: string; bytes: number; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(`File is too large. Limit ${fmtBytes(MAX_BYTES)}.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      setData({ url, mime: file.type, bytes: file.size, name: file.name });
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    setError(null);
    if (!title.trim()) { setError("Add a title."); return; }
    if (!data) { setError("Choose a file."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), category,
          data: data.url,
          source: source.trim() || undefined,
          documentDate: documentDate || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error === "limit_reached" ? "You have reached the 50-document limit."
              : b.error === "too_large" ? `File too large. Max ${fmtBytes(MAX_BYTES)}.`
              : b.error || `Failed (${res.status})`);
        return;
      }
      setTitle(""); setSource(""); setDocumentDate(""); setNotes(""); setData(null);
      if (fileRef.current) fileRef.current.value = "";
      onSaved();
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-bold text-slate-900">Upload a document</p>
      {error && <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Lipid panel — March 2026"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
          >
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
              <option key={c} value={c}>{CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Source (optional)
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Hospital / doctor / lab name"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Document date (optional)
          <input
            type="date"
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="sm:col-span-2 text-xs font-semibold text-slate-700">
          Notes (optional)
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything you want to remember about this document"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
          />
        </label>
      </div>

      <div className="mt-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFile}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
        >
          {data ? `📎 ${data.name} (${fmtBytes(data.bytes)})` : "Click to choose an image or PDF"}
        </button>
        <p className="mt-1 text-[10px] text-slate-500">PDF or image up to {fmtBytes(MAX_BYTES)}.</p>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={submit}
          disabled={busy || !data}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>
    </div>
  );
}
