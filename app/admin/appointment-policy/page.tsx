"use client";

// Admin editor for appointment penalty + refund policies.
//
// Scope selector at the top: Platform default (super-admin) ·
// Organization · Clinic · Doctor. Each level overrides the next.
// Live preview pane shows what a sample fee + outcome would resolve
// to under the current draft.

import { useEffect, useMemo, useState } from "react";

type Scope = "platform" | "organization" | "clinic" | "doctor";
type Outcome =
  | "completed"
  | "no-show"
  | "late-cancel"
  | "early-cancel"
  | "reschedule"
  | "doctor-cancel";

interface Policy {
  scope: Scope;
  scopeId: string | null;
  noShowPenaltyPercent: number;
  lateCancelPenaltyPercent: number;
  lateCancelWindowMinutes: number;
  earlyCancelRefundPercent: number;
  rescheduleFeeRupees: number;
  notes?: string;
  doctorCancelRefundsFull: true;
  updatedAt: string;
}

interface ListResponse {
  policies: Policy[];
  platformDefault: Policy;
  hardDefault: Policy;
  scopes: Scope[];
}

interface PreviewResult {
  effectiveOutcome: Outcome;
  penaltyAmount: number;
  refundAmount: number;
  description: string;
}

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";

const OUTCOMES: Array<{ id: Outcome; label: string }> = [
  { id: "completed", label: "Completed" },
  { id: "no-show", label: "No-show" },
  { id: "late-cancel", label: "Late cancel" },
  { id: "early-cancel", label: "Early cancel" },
  { id: "reschedule", label: "Reschedule" },
  { id: "doctor-cancel", label: "Doctor cancelled" },
];

export default function AdminAppointmentPolicy() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(
    null
  );

  // Active edit target
  const [scope, setScope] = useState<Scope>("platform");
  const [scopeId, setScopeId] = useState("");
  const [draft, setDraft] = useState<Policy | null>(null);

  // Preview
  const [previewFee, setPreviewFee] = useState(500);
  const [previewOutcome, setPreviewOutcome] = useState<Outcome>("no-show");
  const [previewMinutes, setPreviewMinutes] = useState<number | "">("");
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/appointment-policy", {
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as ListResponse;
      setData(j);
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // When scope/scopeId changes, seed the draft from the matching
  // existing policy or fall back to the platform default.
  useEffect(() => {
    if (!data) return;
    const existing = data.policies.find(
      (p) =>
        p.scope === scope && (p.scopeId || null) === (scopeId.trim() || null),
    );
    setDraft(
      existing
        ? { ...existing }
        : {
            ...data.platformDefault,
            scope,
            scopeId: scope === "platform" ? null : scopeId.trim() || null,
            updatedAt: new Date().toISOString(),
          },
    );
  }, [scope, scopeId, data]);

  function showToast(text: string, err = false) {
    setToast({ text, err });
    setTimeout(() => setToast(null), 2500);
  }

  function set<K extends keyof Policy>(k: K, v: Policy[K]) {
    if (!draft) return;
    setDraft({ ...draft, [k]: v });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/appointment-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      showToast("✓ Saved");
      await load();
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setSaving(false);
    }
  }

  async function revert() {
    if (!draft) return;
    if (draft.scope === "platform" && !draft.scopeId) {
      showToast("Can't revert the platform default — edit it instead.", true);
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(
        `/api/admin/appointment-policy?scope=${draft.scope}&scopeId=${encodeURIComponent(
          draft.scopeId || "",
        )}`,
        { method: "DELETE" },
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      showToast("✓ Reverted to cascade");
      await load();
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setSaving(false);
    }
  }

  // Live preview: refetch whenever draft / preview inputs change.
  useEffect(() => {
    if (!draft) return;
    let cancelled = false;
    fetch("/api/admin/appointment-policy/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feeAmount: previewFee,
        outcome: previewOutcome,
        minutesBeforeAppointment:
          previewMinutes === "" ? undefined : Number(previewMinutes),
        policy: draft,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return;
        if (j && typeof j.refundAmount === "number") setPreviewResult(j);
        else setPreviewResult(null);
      })
      .catch(() => setPreviewResult(null));
    return () => {
      cancelled = true;
    };
  }, [draft, previewFee, previewOutcome, previewMinutes]);

  const existingForScope = useMemo(() => {
    if (!data) return [];
    return data.policies.filter((p) => p.scope === scope);
  }, [data, scope]);

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-rose-300/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            ⏱ Appointment outcomes
          </div>
          <h1 className="text-2xl font-bold">Penalty &amp; refund policy</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/90">
            Set what a patient owes / gets back on a no-show, late cancel,
            early cancel, or reschedule. Cascade: doctor &gt; clinic &gt;
            organisation &gt; platform default. Doctor-initiated cancels
            always refund 100%.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
          Loading…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            {/* Scope picker */}
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Scope
                </span>
                <select
                  className={`mt-1 ${inputCls}`}
                  value={scope}
                  onChange={(e) => setScope(e.target.value as Scope)}
                >
                  <option value="platform">Platform default</option>
                  <option value="organization">Organization</option>
                  <option value="clinic">Clinic</option>
                  <option value="doctor">Doctor</option>
                </select>
              </label>
              {scope !== "platform" && (
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    {scope === "organization"
                      ? "Organization ID"
                      : scope === "clinic"
                        ? "Clinic ID"
                        : "Doctor ID"}
                  </span>
                  <input
                    className={`mt-1 ${inputCls} font-mono`}
                    value={scopeId}
                    onChange={(e) => setScopeId(e.target.value)}
                    placeholder={
                      scope === "organization"
                        ? "org-XXXXX"
                        : scope === "clinic"
                          ? "CL-NNN"
                          : "d-XXXX"
                    }
                  />
                </label>
              )}
            </div>

            {existingForScope.length > 0 && (
              <p className="mt-3 text-[11px] text-gray-500">
                {existingForScope.length} {scope}-level{" "}
                {existingForScope.length === 1 ? "override" : "overrides"}{" "}
                stored. Pick its id above to edit.
              </p>
            )}

            {draft && (
              <div className="mt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <PercentField
                    label="No-show penalty %"
                    value={draft.noShowPenaltyPercent}
                    onChange={(v) => set("noShowPenaltyPercent", v)}
                    hint="How much of the fee the patient forfeits when they don't attend."
                  />
                  <PercentField
                    label="Late-cancel penalty %"
                    value={draft.lateCancelPenaltyPercent}
                    onChange={(v) => set("lateCancelPenaltyPercent", v)}
                    hint="Penalty when the patient cancels inside the window below."
                  />
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      Late-cancel window (minutes)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={20160}
                      className={`mt-1 ${inputCls}`}
                      value={draft.lateCancelWindowMinutes}
                      onChange={(e) =>
                        set(
                          "lateCancelWindowMinutes",
                          parseInt(e.target.value || "0", 10),
                        )
                      }
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      Minutes before the slot at which a cancel is considered
                      late. 120 = 2 h. 1440 = 24 h.
                    </p>
                  </label>
                  <PercentField
                    label="Early-cancel refund %"
                    value={draft.earlyCancelRefundPercent}
                    onChange={(v) => set("earlyCancelRefundPercent", v)}
                    hint="What we refund when patient cancels before the late-cancel window."
                  />
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      Reschedule fee
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      className={`mt-1 ${inputCls}`}
                      value={draft.rescheduleFeeRupees}
                      onChange={(e) =>
                        set(
                          "rescheduleFeeRupees",
                          parseInt(e.target.value || "0", 10),
                        )
                      }
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      Flat fee per reschedule (same currency as the fee). 0 =
                      free.
                    </p>
                  </label>
                </div>

                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Notes (shown to patient on cancel / no-show)
                  </span>
                  <textarea
                    className={`mt-1 ${inputCls}`}
                    rows={3}
                    value={draft.notes || ""}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="e.g. First-time patients get a one-time exemption."
                  />
                </label>

                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Doctor-initiated cancels always refund 100% — non-editable.
                </div>

                <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || (scope !== "platform" && !scopeId.trim())}
                    className="rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save policy"}
                  </button>
                  <button
                    type="button"
                    onClick={revert}
                    disabled={saving || scope === "platform"}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Revert to cascade
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Live preview */}
          <aside className="space-y-4">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Live preview</h3>
              <p className="mt-1 text-xs text-gray-500">
                What would happen if a patient on this policy hit this
                outcome?
              </p>
              <label className="mt-3 block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Sample fee
                </span>
                <input
                  type="number"
                  min={0}
                  className={`mt-1 ${inputCls}`}
                  value={previewFee}
                  onChange={(e) =>
                    setPreviewFee(parseInt(e.target.value || "0", 10))
                  }
                />
              </label>
              <label className="mt-3 block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Outcome
                </span>
                <select
                  className={`mt-1 ${inputCls}`}
                  value={previewOutcome}
                  onChange={(e) =>
                    setPreviewOutcome(e.target.value as Outcome)
                  }
                >
                  {OUTCOMES.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {(previewOutcome === "late-cancel" ||
                previewOutcome === "early-cancel") && (
                <label className="mt-3 block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Minutes before appointment
                  </span>
                  <input
                    type="number"
                    min={0}
                    className={`mt-1 ${inputCls}`}
                    value={previewMinutes}
                    onChange={(e) =>
                      setPreviewMinutes(
                        e.target.value === "" ? "" : parseInt(e.target.value, 10),
                      )
                    }
                    placeholder="e.g. 90"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Optional — lets the engine auto-classify early vs late.
                  </p>
                </label>
              )}

              {previewResult && (
                <div className="mt-4 space-y-2 rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                  <p>
                    <strong>Effective:</strong>{" "}
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px]">
                      {previewResult.effectiveOutcome}
                    </code>
                  </p>
                  <p>
                    <strong>Refund:</strong>{" "}
                    <span className="font-bold text-emerald-300">
                      {previewResult.refundAmount.toFixed(2)}
                    </span>
                  </p>
                  <p>
                    <strong>Penalty:</strong>{" "}
                    <span className="font-bold text-rose-300">
                      {previewResult.penaltyAmount.toFixed(2)}
                    </span>
                  </p>
                  <p className="text-slate-400">{previewResult.description}</p>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Cascade</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Doctor-specific policy</li>
                <li>Clinic policy</li>
                <li>Organization policy</li>
                <li>Platform default</li>
              </ol>
              <p className="mt-2">
                First match wins. Delete an override to fall through to the
                next level.
              </p>
            </div>
          </aside>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${
            toast.err ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
        {label}
      </span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="flex-1"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) =>
            onChange(
              Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10))),
            )
          }
          className={`${inputCls} w-20`}
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </label>
  );
}
