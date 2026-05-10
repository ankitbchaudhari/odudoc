"use client";

// AI pricing admin — per-org overrides on top of the canonical
// AI_PRICING table. Active org id read from localStorage.

import { useCallback, useEffect, useState } from "react";

interface DefaultPricing { perUnitRupees: number; unitLabel: string; }
interface Override {
  id: string; ownerKind: string; ownerId: string;
  feature: string; perUnitRupees: number;
  reason?: string; setBy?: string; updatedAt: string;
}

const FEATURE_LABEL: Record<string, string> = {
  ddx: "Differential diagnosis", scribe: "Scribe", ocr: "OCR",
  triage: "Triage", translation: "Translation", image_analysis: "Image analysis",
  voice_transcript: "Voice transcript", rx_safety: "Rx safety", summarize: "Summarize",
};

export default function AiPricingAdminPage() {
  const [orgId, setOrgId] = useState("");
  const [defaults, setDefaults] = useState<Record<string, DefaultPricing>>({});
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setOrgId(localStorage.getItem("odudoc:active-org") || "");
  }, []);

  const load = useCallback(async () => {
    if (!orgId) return;
    const r = await fetch(`/api/ai-pricing?ownerKind=org&ownerId=${encodeURIComponent(orgId)}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setDefaults(d.defaults || {});
      setOverrides(d.overrides || []);
      // Seed drafts with current effective values (override or default).
      const seed: Record<string, string> = {};
      for (const f of Object.keys(d.defaults || {})) {
        const ov = (d.overrides || []).find((x: Override) => x.feature === f);
        seed[f] = String(ov?.perUnitRupees ?? d.defaults[f].perUnitRupees);
      }
      setDraft(seed);
    }
  }, [orgId]);
  useEffect(() => { load(); }, [load]);

  const save = async (feature: string) => {
    setBusy(feature); setMsg(null);
    try {
      const res = await fetch("/api/ai-pricing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerKind: "org", ownerId: orgId,
          feature, perUnitRupees: Number(draft[feature]),
          reason: reasons[feature] || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ kind: "err", text: data.error || "Failed" }); return; }
      setMsg({ kind: "ok", text: `${FEATURE_LABEL[feature]} updated.` });
      load();
    } finally { setBusy(null); }
  };

  const reset = async (feature: string) => {
    setBusy(feature);
    try {
      await fetch(`/api/ai-pricing?ownerKind=org&ownerId=${encodeURIComponent(orgId)}&feature=${feature}`, { method: "DELETE" });
      load();
    } finally { setBusy(null); }
  };

  if (!orgId) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Pick an organization from the header.</p>;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">AI pricing</h2>
        <p className="mt-1 text-sm text-gray-500">
          Override the per-unit rupee cost for any AI feature for this org. Empty an override to fall back to the platform default.
        </p>
      </div>

      {msg && <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${msg.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{msg.text}</div>}

      <ul className="space-y-3">
        {Object.entries(defaults).map(([feature, def]) => {
          const ov = overrides.find((o) => o.feature === feature);
          const cur = Number(draft[feature] || def.perUnitRupees);
          const dirty = cur !== (ov?.perUnitRupees ?? def.perUnitRupees);
          return (
            <li key={feature} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{FEATURE_LABEL[feature] || feature}</p>
                  <p className="text-xs text-slate-500">
                    Default ₹{def.perUnitRupees} / {def.unitLabel}
                    {ov && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">overridden</span>}
                  </p>
                  {ov && (
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Set by {ov.setBy || "—"} on {new Date(ov.updatedAt).toLocaleDateString()}
                      {ov.reason && <span className="ml-1 italic">· {ov.reason}</span>}
                    </p>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    ₹ per {def.unitLabel}
                    <input
                      type="number" min={0} step="0.5"
                      value={draft[feature] || ""}
                      onChange={(e) => setDraft({ ...draft, [feature]: e.target.value })}
                      className="mt-1 w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal tabular-nums"
                    />
                  </label>
                  <input
                    value={reasons[feature] || ""}
                    onChange={(e) => setReasons({ ...reasons, [feature]: e.target.value })}
                    placeholder="Reason (optional)"
                    className="w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                  />
                  <button
                    onClick={() => save(feature)}
                    disabled={busy === feature || !dirty}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {busy === feature ? "…" : "Save"}
                  </button>
                  {ov && (
                    <button
                      onClick={() => reset(feature)}
                      disabled={busy === feature}
                      className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-200 disabled:opacity-50"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
