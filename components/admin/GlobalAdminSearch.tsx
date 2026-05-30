"use client";

// Global admin search.
//
// Fuzzy-matches typed query against a curated index of every admin
// page so an admin can jump anywhere from the header in two
// keystrokes. Replaces the dead <input> that used to live in
// app/admin/layout.tsx and never had an onChange handler.
//
// Patient / doctor / org lookups live in the dedicated
// PatientSearchLauncher (Ctrl+K) — this widget is the cheap
// nav-jump for "I want to land on /admin/reports without clicking
// through three sidebar groups."

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface PageEntry {
  href: string;
  label: string;
  /** Section breadcrumb shown next to the label in the result row. */
  group: string;
  /** Extra keywords the matcher looks at — comma-separated synonyms. */
  alias?: string;
}

// Curated index. Keep this lean — we want to surface the pages admins
// actually visit, not every route in the app. Add a row here when a
// new admin surface ships.
const INDEX: PageEntry[] = [
  // Insights
  { href: "/admin/reports", label: "Reports", group: "Insights", alias: "csv export patients financial corporate marketing" },
  { href: "/admin/kpi-dashboard", label: "KPI Dashboard", group: "Insights" },
  { href: "/admin/ai-usage", label: "AI Usage", group: "Insights", alias: "gemini tokens spend" },
  { href: "/admin/audit-log", label: "Audit Log", group: "Insights", alias: "audit history activity" },
  { href: "/admin/accountability", label: "Accountability", group: "Insights" },

  // Patients
  { href: "/admin/patient-lookup", label: "Find a patient", group: "Patients", alias: "search lookup mrn phone" },
  { href: "/admin/patients", label: "Patients", group: "Patients", alias: "patient list" },
  { href: "/admin/feedback", label: "Patient Feedback", group: "Patients" },
  { href: "/admin/health-camps", label: "Health Camps", group: "Patients" },

  // Doctors
  { href: "/admin/doctors", label: "All doctors", group: "Doctors" },
  { href: "/admin/applications", label: "Doctor applications", group: "Doctors" },
  { href: "/admin/doctor-invites", label: "Invite doctors", group: "Doctors" },
  { href: "/admin/doctors/verifications", label: "Verifications", group: "Doctors" },
  { href: "/admin/credentialing", label: "Credentialing", group: "Doctors" },
  { href: "/admin/abdm", label: "ABDM (India)", group: "Doctors" },

  // Clinical
  { href: "/admin/admissions", label: "Admissions", group: "Clinical" },
  { href: "/admin/appointments", label: "Appointments", group: "Clinical" },
  { href: "/admin/appointment-policy", label: "Appointment Policy", group: "Clinical", alias: "penalty refund cancellation" },
  { href: "/admin/prescriptions", label: "Prescriptions", group: "Clinical", alias: "rx" },
  { href: "/admin/dispensing", label: "Dispensing", group: "Clinical" },
  { href: "/admin/bed-census", label: "Bed Census", group: "Clinical", alias: "ipd beds occupancy" },
  { href: "/admin/blood-bank", label: "Blood Bank", group: "Clinical" },
  { href: "/admin/ambulance", label: "Ambulance", group: "Clinical" },
  { href: "/admin/ambulance-dispatch", label: "Ambulance Dispatch", group: "Clinical" },
  { href: "/admin/ambulance-fleet", label: "Ambulance Fleet", group: "Clinical" },

  // Pharmacy
  { href: "/admin/pharmacy", label: "Pharmacy Dashboard", group: "Pharmacy" },
  { href: "/admin/pharmacy-inventory", label: "Pharmacy Inventory", group: "Pharmacy" },
  { href: "/admin/formulary", label: "Formulary", group: "Pharmacy" },
  { href: "/admin/hospital-rx", label: "Hospital Rx", group: "Pharmacy" },
  { href: "/admin/anti-counterfeit-kiosk", label: "Anti-counterfeit Kiosk", group: "Pharmacy" },
  { href: "/admin/antimicrobial-stewardship", label: "Antimicrobial Stewardship", group: "Pharmacy" },

  // Operations
  { href: "/admin/staff", label: "Medical Staff", group: "Operations" },
  { href: "/admin/staff-schedule", label: "Staff Schedule", group: "Operations" },
  { href: "/admin/roster", label: "Shift Roster", group: "Operations" },
  { href: "/admin/auto-roster", label: "Auto-roster", group: "Operations" },
  { href: "/admin/employee-health", label: "Employee Health", group: "Operations" },
  { href: "/admin/biomedical", label: "Biomedical", group: "Operations" },
  { href: "/admin/biowaste", label: "Biowaste", group: "Operations" },

  // Multi-org
  { href: "/admin/organizations", label: "Organizations", group: "Multi-org", alias: "org clinic hospital tenant" },
  { href: "/admin/branches", label: "Branches", group: "Multi-org" },
  { href: "/admin/applications", label: "Applications", group: "Multi-org" },

  // Money
  { href: "/admin/billing", label: "Billing", group: "Money" },
  { href: "/admin/ap", label: "Accounts Payable", group: "Money", alias: "ap vendor invoice" },
  { href: "/admin/ar-receipts", label: "AR Receipts", group: "Money" },
  { href: "/admin/ai-pricing", label: "AI Pricing", group: "Money" },
  { href: "/admin/razorpay-go-live", label: "Razorpay Go-Live", group: "Money", alias: "payment gateway" },
  { href: "/admin/fx-rates", label: "FX Rates", group: "Money", alias: "currency exchange forex" },

  // Settings
  { href: "/admin/settings", label: "Settings", group: "Settings" },
  { href: "/admin/whatsapp", label: "WhatsApp Delivery", group: "Settings", alias: "wa sms messaging" },
  { href: "/admin/national-health-ids", label: "National Health IDs", group: "Settings", alias: "abha nhs medicare" },
  { href: "/admin/emergency-numbers", label: "Emergency Numbers", group: "Settings", alias: "911 112" },
  { href: "/admin/blog", label: "Blog", group: "Settings" },
  { href: "/admin/ai-feedback", label: "AI Feedback", group: "Settings" },
];

function score(entry: PageEntry, q: string): number {
  // Tiny ranking heuristic — exact-prefix on label wins biggest, then
  // word-boundary match, then any-substring. Aliases score lower than
  // label hits because aliases are usually broader. Returns 0 when
  // nothing matches so the row is dropped.
  if (!q) return 0;
  const label = entry.label.toLowerCase();
  const alias = (entry.alias || "").toLowerCase();
  const group = entry.group.toLowerCase();
  const needle = q.toLowerCase();

  if (label === needle) return 100;
  if (label.startsWith(needle)) return 80;
  if (label.includes(needle)) return 60;
  if (group.startsWith(needle)) return 55;
  if (alias.includes(needle)) return 40;
  if (group.includes(needle)) return 30;

  // Multi-word soft match — "ai us" → "AI Usage". Splits the query
  // and requires every word to appear somewhere in label+alias.
  const words = needle.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const hay = `${label} ${alias} ${group}`;
    if (words.every((w) => hay.includes(w))) return 20;
  }
  return 0;
}

interface RecordHit {
  /** "patient" / "doctor" — drives the icon + landing route. */
  kind: "patient" | "doctor";
  id: string;
  title: string;
  /** Sub-line shown under the title — MRN for patients, specialty for doctors. */
  subtitle?: string;
  href: string;
}

export default function GlobalAdminSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [records, setRecords] = useState<RecordHit[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pageResults = useMemo(() => {
    if (!q.trim()) return [] as Array<PageEntry & { score: number }>;
    return INDEX
      .map((e) => ({ ...e, score: score(e, q.trim()) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [q]);

  // Single flat list the keyboard navigates through. Pages come
  // first so muscle memory ("type 'rep', hit Enter, land on Reports")
  // never breaks when API results arrive late.
  const flatResults = useMemo(
    () => [
      ...pageResults.map((p) => ({ kind: "page" as const, page: p })),
      ...records.map((r) => ({ kind: "record" as const, record: r })),
    ],
    [pageResults, records],
  );

  // Reset highlight when results list shifts under us so Enter never
  // navigates to a result the user can't see.
  useEffect(() => {
    setHighlight(0);
  }, [q]);

  // Debounced live record search. Fires patient + doctor lookups in
  // parallel after a 250ms keystroke pause. AbortController cancels
  // in-flight requests when the query changes again so a slow patient
  // query can't overwrite a faster newer one. Silently ignores 401/403
  // — non-admins simply see admin-page results without records.
  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) {
      setRecords([]);
      setRecordsLoading(false);
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setRecordsLoading(true);
      try {
        const [patientRes, doctorRes] = await Promise.allSettled([
          fetch("/api/admin/patients/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "name", value: needle }),
            signal: ctrl.signal,
          }),
          fetch(`/api/admin/doctors?search=${encodeURIComponent(needle)}`, {
            signal: ctrl.signal,
          }),
        ]);

        const hits: RecordHit[] = [];

        if (patientRes.status === "fulfilled" && patientRes.value.ok) {
          const data = (await patientRes.value.json()) as {
            results?: Array<{
              patient?: { id?: string };
              mrn?: string;
              fullName?: string;
            }>;
          };
          for (const r of (data.results || []).slice(0, 4)) {
            const id = r.patient?.id;
            if (!id) continue;
            // No /admin/patients/[id] detail route exists yet — route
            // to the lookup page with the patient's MRN pre-filled so
            // the existing widget shows the full record in one step.
            const lookupQ = r.mrn || r.fullName || "";
            hits.push({
              kind: "patient",
              id,
              title: r.fullName || "(redacted)",
              subtitle: r.mrn ? `MRN ${r.mrn}` : undefined,
              href: `/admin/patient-lookup?q=${encodeURIComponent(lookupQ)}`,
            });
          }
        }

        if (doctorRes.status === "fulfilled" && doctorRes.value.ok) {
          const data = (await doctorRes.value.json()) as {
            doctors?: Array<{ id: string; name?: string; specialty?: string }>;
          };
          for (const d of (data.doctors || []).slice(0, 3)) {
            // No /admin/doctors/[id] detail route yet — route to the
            // listing with the search pre-filled. Listing page can
            // pick this up later via useSearchParams.
            hits.push({
              kind: "doctor",
              id: d.id,
              title: d.name || "Doctor",
              subtitle: d.specialty || undefined,
              href: `/admin/doctors?search=${encodeURIComponent(d.name || d.id)}`,
            });
          }
        }

        if (!ctrl.signal.aborted) setRecords(hits);
      } catch {
        // Aborted or network — drop silently. The UI stays on
        // page-results which is the more common case anyway.
      } finally {
        if (!ctrl.signal.aborted) setRecordsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  // Close on outside click — common dropdown pattern; without this the
  // results panel sticks around when the admin clicks elsewhere.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(idx: number) {
    const hit = flatResults[idx];
    if (!hit) return;
    setOpen(false);
    setQ("");
    const href = hit.kind === "page" ? hit.page.href : hit.record.href;
    router.push(href);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(flatResults.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(highlight);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showDropdown = open && flatResults.length > 0;
  const showEmpty =
    open && q.trim() && flatResults.length === 0 && !recordsLoading;

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder="Search reports, billing, settings…"
        aria-label="Search admin pages"
        className="w-60 rounded-lg border border-indigo-100 bg-indigo-50/40 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-200"
      />

      {showDropdown && (
        <div
          role="listbox"
          aria-label="Admin search results"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[480px] w-[360px] overflow-auto rounded-lg border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5"
        >
          {pageResults.length > 0 && (
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Pages</span>
              <span className="text-slate-400">{pageResults.length}</span>
            </div>
          )}
          {pageResults.map((r, pageIdx) => {
            const idx = pageIdx;
            return (
              <button
                key={`page-${r.href}-${idx}`}
                type="button"
                role="option"
                aria-selected={idx === highlight}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(idx);
                }}
                className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm ${
                  idx === highlight
                    ? "bg-indigo-50 text-indigo-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="truncate font-medium">{r.label}</span>
                <span className="shrink-0 text-[10.5px] uppercase tracking-wider text-slate-400">
                  {r.group}
                </span>
              </button>
            );
          })}

          {records.length > 0 && (
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Records</span>
              <span className="text-slate-400">{records.length}</span>
            </div>
          )}
          {records.map((r, recordIdx) => {
            const idx = pageResults.length + recordIdx;
            const kindLabel = r.kind === "patient" ? "Patient" : "Doctor";
            return (
              <button
                key={`record-${r.kind}-${r.id}`}
                type="button"
                role="option"
                aria-selected={idx === highlight}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(idx);
                }}
                className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 ${
                  idx === highlight
                    ? "bg-indigo-50 text-indigo-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{r.title}</span>
                  {r.subtitle && (
                    <span className="truncate text-[11px] text-slate-500">
                      {r.subtitle}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[10.5px] uppercase tracking-wider text-slate-400">
                  {kindLabel}
                </span>
              </button>
            );
          })}

          {recordsLoading && (
            <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
              Searching records…
            </div>
          )}
        </div>
      )}

      {showEmpty && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg">
          No page or record matches “{q.trim()}”.
        </div>
      )}
    </div>
  );
}
