"use client";

// Shown in the admin sidebar footer ONLY for tenant admins (not super-
// admins). Lets a hospital admin request additional modules — e.g. their
// plan has patient+opd but they want to trial pharmacy — without emailing
// support out-of-band. Submission fires an admin bell notification + email
// to every super-admin.

import { useState } from "react";

type ModuleKey =
  | "patient" | "opd" | "ipd" | "lab" | "pharmacy" | "billing"
  | "surgery" | "inventory" | "radiology" | "telemedicine" | "aiVoice";

const MODULE_LABELS: Record<ModuleKey, string> = {
  patient: "Patient management",
  opd: "OPD / Outpatient",
  ipd: "IPD / Inpatient",
  lab: "Lab",
  pharmacy: "Pharmacy",
  billing: "Billing & invoicing",
  surgery: "Surgery / OT",
  inventory: "Inventory",
  radiology: "Radiology",
  telemedicine: "Telemedicine",
  aiVoice: "AI Voice",
};

interface Props {
  collapsed: boolean;
  enabledModules: Partial<Record<ModuleKey, boolean>> | null;
}

export default function RequestModulesCard({ collapsed, enabledModules }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<ModuleKey>>(new Set());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"ok" | "error" | null>(null);

  // Only offer modules the org doesn't already have. If everything is on,
  // hide the card entirely — no reason to show it.
  const available = (Object.keys(MODULE_LABELS) as ModuleKey[]).filter(
    (k) => !enabledModules?.[k]
  );
  if (available.length === 0) return null;

  function toggle(key: ModuleKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/request-modules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ modules: Array.from(selected), note }),
      });
      if (res.ok) {
        setResult("ok");
        setSelected(new Set());
        setNote("");
        // Auto-close after a breath so the user sees the success state.
        setTimeout(() => {
          setOpen(false);
          setResult(null);
        }, 1800);
      } else {
        setResult("error");
      }
    } catch {
      setResult("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {collapsed ? (
        <button
          onClick={() => setOpen(true)}
          className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30 transition hover:bg-primary-500/25"
          title="Request more modules"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="mx-3 mb-2 flex w-[calc(100%-24px)] items-center gap-2 rounded-lg border border-primary-500/30 bg-primary-500/10 px-3 py-2 text-left text-[12px] font-medium text-primary-200 transition hover:bg-primary-500/20"
        >
          <svg className="h-4 w-4 flex-shrink-0 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="flex-1 leading-tight">
            Need more modules?
            <span className="block text-[10.5px] font-normal text-primary-300/80">Request access →</span>
          </span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Request module access</h2>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  Pick the modules you&rsquo;d like turned on. The OduDoc team will review
                  and enable them, usually within one business day.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2">
              {available.map((key) => {
                const on = selected.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className={`rounded-lg border px-3 py-2 text-left text-[12.5px] transition ${
                      on
                        ? "border-primary-500 bg-primary-50 font-semibold text-primary-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border ${
                          on ? "border-primary-500 bg-primary-500" : "border-slate-300 bg-white"
                        }`}
                      >
                        {on && (
                          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      {MODULE_LABELS[key]}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="mb-4 block">
              <span className="mb-1 block text-[12px] font-medium text-slate-600">
                Note (optional)
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Anything specific we should know? E.g. timeline, which team will use it, volume expectations."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 placeholder-slate-400 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
              />
              <span className="mt-1 block text-right text-[10.5px] text-slate-400">
                {note.length} / 500
              </span>
            </label>

            {result === "ok" && (
              <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] font-medium text-emerald-700">
                Request sent. We&rsquo;ll be in touch shortly.
              </div>
            )}
            {result === "error" && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">
                Something went wrong. Please try again, or email support@odudoc.com.
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || selected.size === 0}
                className="rounded-lg bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting
                  ? "Sending…"
                  : selected.size === 0
                  ? "Select a module"
                  : `Request ${selected.size} module${selected.size === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
