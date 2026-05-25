"use client";

// Universal patient lookup widget — drops into any admin / pro surface
// where staff need to find a patient by phone, name, ID, insurance, or
// government ID. The first input is always the search-type picker; the
// rest of the form reshapes itself based on the picked type so the
// operator never has to guess "what should I type here?".
//
// Phone           → country-code dropdown + national digits (digits only)
// Name            → free text restricted to letters / spaces / hyphens
// OduDoc ID       → alphanumeric + dashes
// Insurance       → alphanumeric
// Government ID   → country dropdown → ID-type dropdown → number input
//                   (input pattern hint from lib/govt-id-types)
//
// Server returns redacted results (lib/patient-acl) — this component
// renders whatever fields the role is allowed to see, plus a verdicts
// summary so the operator can tell "this is hidden because of your
// role" vs "this patient has no DOB on file".

import { useEffect, useMemo, useState } from "react";
import {
  COUNTRY_GOVT_IDS,
  govtIdTypesForCountry,
  normalizeIdValue,
} from "@/lib/govt-id-types";
import {
  NATIONAL_HEALTH_IDS,
  healthIdForCountry,
} from "@/lib/national-health-ids";
import { COUNTRY_DIAL_CODES } from "@/lib/country-dial-codes";

type SearchType =
  | "phone"
  | "name"
  | "patient-id"
  | "insurance"
  | "govt-id"
  | "national-health-id";

interface SearchTypeMeta {
  id: SearchType;
  label: string;
  hint: string;
}

const SEARCH_TYPES: SearchTypeMeta[] = [
  { id: "phone", label: "Mobile number", hint: "Digits only — pick the country code first." },
  { id: "name", label: "Patient name", hint: "Letters, spaces, and hyphens." },
  { id: "patient-id", label: "OduDoc ID / MRN", hint: "Platform-wide ID or per-clinic MRN." },
  { id: "insurance", label: "Insurance policy", hint: "Policy number as printed on the card." },
  { id: "govt-id", label: "Government ID", hint: "Pick country, then ID type, then number." },
  {
    id: "national-health-id",
    label: "National health ID",
    hint: "Pick country to see the right health-system ID (ABHA, NHS, Medicare, etc.).",
  },
];

// Result shape returned by /api/admin/patients/search — keep loose so
// the component still renders if redaction adds/removes fields.
interface SearchResult {
  patient: {
    id: string;
    firstName?: string;
    lastName?: string;
    sex?: string;
    phone?: string;
    email?: string;
    address?: string;
    bloodGroup?: string;
    allergies?: string;
    chronicConditions?: string;
    notes?: string;
  };
  verdicts: Record<string, string>;
  role: string;
  mrn: string;
  fullName: string;
  _meta: {
    hasInsurance: boolean;
    hasGovtId: boolean;
    updatedAt: string;
  };
}

interface ApiResponse {
  role: string;
  isSuperAdmin: boolean;
  organizationId: string;
  count: number;
  results: SearchResult[];
  error?: string;
}

export default function PatientSearch({
  defaultType = "phone",
  compact = false,
}: {
  defaultType?: SearchType;
  compact?: boolean;
}) {
  const [type, setType] = useState<SearchType>(defaultType);
  // Phone-specific
  const [phoneCode, setPhoneCode] = useState("91");
  const [phoneDigits, setPhoneDigits] = useState("");
  // Name / patient-id / insurance share a generic text input
  const [text, setText] = useState("");
  // Govt-ID specific
  const [govtCountry, setGovtCountry] = useState("IN");
  const [govtIdType, setGovtIdType] = useState("aadhaar");
  const [govtNumber, setGovtNumber] = useState("");
  // National-health-ID specific. Country picks the health system
  // (ABHA for IN, NHS for GB, Medicare for AU, etc.) automatically;
  // user just types the number.
  const [healthCountry, setHealthCountry] = useState("IN");
  const [healthNumber, setHealthNumber] = useState("");

  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meta = SEARCH_TYPES.find((s) => s.id === type)!;
  const govtIdTypes = useMemo(
    () => govtIdTypesForCountry(govtCountry),
    [govtCountry],
  );
  // Keep the picked govt-id-type valid when the country dropdown
  // changes (e.g. user switched from India → US; "aadhaar" no longer
  // exists in the US list).
  useEffect(() => {
    if (!govtIdTypes.some((t) => t.id === govtIdType)) {
      setGovtIdType(govtIdTypes[0]?.id || "");
    }
  }, [govtIdTypes, govtIdType]);

  function reset() {
    setResponse(null);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResponse(null);
    try {
      const body: Record<string, string> = { type };
      if (type === "phone") {
        if (!phoneDigits.trim()) throw new Error("Type the patient's number.");
        body.value = phoneDigits.replace(/\D/g, "");
        body.phoneCountryCode = phoneCode;
      } else if (type === "govt-id") {
        if (!govtNumber.trim()) throw new Error("Type the ID number.");
        body.value = govtNumber;
        body.govtIdCountry = govtCountry;
      } else if (type === "national-health-id") {
        if (!healthNumber.trim())
          throw new Error("Type the health ID number.");
        const sys = healthIdForCountry(healthCountry);
        if (!sys)
          throw new Error("No national health ID is catalogued for that country yet.");
        body.value = healthNumber;
        body.healthSystemId = sys.systemId;
      } else {
        if (!text.trim()) throw new Error("Type something to search for.");
        body.value = text;
      }
      const res = await fetch("/api/admin/patients/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setResponse(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <form onSubmit={submit} className="space-y-3">
        {/* Step 1 — pick the search type */}
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Search by
          </span>
          <select
            className={`mt-1 ${inputCls}`}
            value={type}
            onChange={(e) => {
              setType(e.target.value as SearchType);
              reset();
            }}
          >
            {SEARCH_TYPES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
            {meta.hint}
          </p>
        </label>

        {/* Step 2 — type-specific inputs */}
        {type === "phone" && (
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <select
              className={inputCls}
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value)}
              aria-label="Country code"
            >
              {COUNTRY_DIAL_CODES.map((c) => (
                <option key={c.iso} value={c.dial}>
                  +{c.dial} {c.iso}
                </option>
              ))}
            </select>
            <input
              className={inputCls}
              type="tel"
              inputMode="numeric"
              placeholder="National number"
              value={phoneDigits}
              // Digits + spaces only — the API strips both.
              onChange={(e) =>
                setPhoneDigits(e.target.value.replace(/[^\d\s]/g, ""))
              }
              autoFocus
            />
          </div>
        )}

        {type === "name" && (
          <input
            className={inputCls}
            placeholder="First or last name"
            value={text}
            // Letters, spaces, hyphens, apostrophes (O'Brien, Jean-Luc).
            onChange={(e) =>
              setText(e.target.value.replace(/[^A-Za-z\s'-]/g, ""))
            }
            autoFocus
          />
        )}

        {type === "patient-id" && (
          <input
            className={`${inputCls} font-mono`}
            placeholder="pt-xxxx-xxxx or MRN-XXXX-NNNNN"
            value={text}
            onChange={(e) =>
              setText(e.target.value.replace(/[^A-Za-z0-9\-_]/g, ""))
            }
            autoFocus
          />
        )}

        {type === "insurance" && (
          <input
            className={`${inputCls} font-mono`}
            placeholder="Policy number"
            value={text}
            onChange={(e) =>
              setText(e.target.value.replace(/[^A-Za-z0-9\-/]/g, ""))
            }
            autoFocus
          />
        )}

        {type === "govt-id" && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Country
                </span>
                <select
                  className={`mt-1 ${inputCls}`}
                  value={govtCountry}
                  onChange={(e) => setGovtCountry(e.target.value)}
                >
                  {COUNTRY_GOVT_IDS.map((c) => (
                    <option key={c.country} value={c.country}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  ID type
                </span>
                <select
                  className={`mt-1 ${inputCls}`}
                  value={govtIdType}
                  onChange={(e) => setGovtIdType(e.target.value)}
                >
                  {govtIdTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {(() => {
              const t = govtIdTypes.find((x) => x.id === govtIdType);
              return (
                <input
                  className={`${inputCls} font-mono`}
                  placeholder={t?.placeholder || "ID number"}
                  value={govtNumber}
                  // Allow alphanumerics, dashes, spaces — the server
                  // normalizes via normalizeIdValue before matching.
                  onChange={(e) =>
                    setGovtNumber(
                      e.target.value.replace(/[^A-Za-z0-9\s\-.]/g, ""),
                    )
                  }
                />
              );
            })()}
            {(() => {
              const t = govtIdTypes.find((x) => x.id === govtIdType);
              if (!t?.pattern || !govtNumber) return null;
              const ok = t.pattern.test(normalizeIdValue(govtNumber));
              return (
                <p
                  className={`text-[11px] ${
                    ok ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {ok
                    ? "Format looks right."
                    : `Doesn't match the expected ${t.label} format yet.`}
                </p>
              );
            })()}
          </div>
        )}

        {type === "national-health-id" && (
          <div className="space-y-2">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Country
              </span>
              <select
                className={`mt-1 ${inputCls}`}
                value={healthCountry}
                onChange={(e) => setHealthCountry(e.target.value)}
              >
                {NATIONAL_HEALTH_IDS.map((h) => (
                  <option key={h.country} value={h.country}>
                    {h.countryName} — {h.systemName}
                  </option>
                ))}
              </select>
            </label>
            {(() => {
              const sys = healthIdForCountry(healthCountry);
              if (!sys) return null;
              return (
                <>
                  <input
                    className={`${inputCls} font-mono`}
                    placeholder={sys.format.placeholder}
                    value={healthNumber}
                    onChange={(e) =>
                      setHealthNumber(
                        e.target.value.replace(/[^A-Za-z0-9@.\s\-+]/g, ""),
                      )
                    }
                  />
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Issued by <strong>{sys.agency}</strong>.
                    {sys.digitalHealthNetwork && (
                      <>
                        {" "}
                        Linked to <strong>{sys.digitalHealthNetwork}</strong>.
                      </>
                    )}
                    {sys.format.helpText && (
                      <>
                        <br />
                        {sys.format.helpText}
                      </>
                    )}
                  </p>
                  {sys.format.pattern && healthNumber && (() => {
                    const ok = sys.format.pattern.test(
                      normalizeIdValue(healthNumber),
                    );
                    return (
                      <p
                        className={`text-[11px] ${
                          ok ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {ok
                          ? "Format looks right."
                          : `Doesn't match the expected ${sys.systemName} format yet.`}
                      </p>
                    );
                  })()}
                </>
              );
            })()}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-60"
        >
          {busy ? "Searching…" : "Find patient"}
        </button>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
      </form>

      {/* Results */}
      {response && response.count === 0 && (
        <div className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          No patients matched in your organization.
        </div>
      )}

      {response && response.count > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <span>
              {response.count} match{response.count === 1 ? "" : "es"} ·
              showing fields visible to{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {response.role}
              </code>
            </span>
          </div>
          {response.results.map((r) => (
            <ResultCard key={r.patient.id} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  const p = result.patient;
  const hidden = (key: string) => result.verdicts?.[key] === "hidden";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
            {result.fullName || "[Redacted]"}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-gray-500 dark:text-slate-400">
            MRN {result.mrn} · OduDoc ID {p.id}
          </p>
        </div>
        <div className="flex gap-1">
          {result._meta.hasInsurance && (
            <Pill tone="blue">Insurance on file</Pill>
          )}
          {result._meta.hasGovtId && (
            <Pill tone="emerald">Govt ID on file</Pill>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-slate-300 sm:grid-cols-3">
        <Field label="Sex" value={p.sex} hidden={hidden("demographicsContact")} />
        <Field label="Phone" value={p.phone} hidden={hidden("demographicsContact")} />
        <Field label="Email" value={p.email} hidden={hidden("demographicsContact")} />
        <Field label="Blood group" value={p.bloodGroup} hidden={hidden("demographicsContact")} />
        <Field
          label="Address"
          value={p.address}
          hidden={hidden("demographicsContact")}
          span={2}
        />
      </div>

      {(p.allergies || p.chronicConditions || p.notes) && (
        <div className="mt-3 space-y-1 rounded-lg bg-amber-50/60 p-2 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          {p.allergies && (
            <p>
              <strong>Allergies:</strong> {p.allergies}
            </p>
          )}
          {p.chronicConditions && (
            <p>
              <strong>Chronic conditions:</strong> {p.chronicConditions}
            </p>
          )}
          {p.notes && (
            <p>
              <strong>Notes:</strong> {p.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  hidden,
  span,
}: {
  label: string;
  value?: string;
  hidden?: boolean;
  span?: number;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
        {label}
      </span>
      <p className="truncate text-gray-900 dark:text-slate-100">
        {hidden ? (
          <span className="italic text-gray-400">Hidden by your role</span>
        ) : value ? (
          value
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </p>
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "blue" | "emerald";
  children: React.ReactNode;
}) {
  const cls =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}
