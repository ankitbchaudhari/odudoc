"use client";

// Doctor → My Clinics. Lists every clinic the doctor has registered,
// lets them add a new one, edit existing ones, manage staff accounts,
// and toggle payment options. Each clinic gets its own staff login at
// /clinic/<clinicId>/login.

import { useEffect, useMemo, useState } from "react";
import { byCountry, byCode } from "@/lib/currencies";
import { convert } from "@/lib/currency-convert";

// Worldwide country/state/city data. Bundled lazily — the npm package
// `country-state-city` ships ~150k cities + ~5k states (≈1.6MB), so we
// dynamic-import it the first time the form mounts to avoid bloating
// the rest of the doctor-dashboard bundle.
type Csc = typeof import("country-state-city");
interface CscCountry { name: string; isoCode: string }
interface CscState { name: string; isoCode: string; countryCode: string }
interface CscCity { name: string }

interface ClinicHours {
  day: number;
  open: string;
  close: string;
  closed?: boolean;
}

interface Clinic {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  phone?: string;
  mapsUrl?: string;
  hours: ClinicHours[];
  acceptOnlinePayment: boolean;
  acceptClinicPayment: boolean;
  feeOverride?: number;
  active: boolean;
}

interface Staff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "receptionist" | "assistant" | "manager";
  active: boolean;
  lastLoginAt?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function defaultHours(): ClinicHours[] {
  return [1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    open: "09:00",
    close: "18:00",
  }));
}

/** Per-day rows for every day Sun–Sat, with Mon-Sat open 09:00–18:00
 *  and Sun marked closed. Doctors edit individual rows from the form. */
function buildAllDayHours(): ClinicHours[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    open: "09:00",
    close: "18:00",
    closed: day === 0, // Sunday closed by default
  }));
}

export default function DoctorClinicPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const loadClinics = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/doctor/clinics", { cache: "no-store" });
      const d = await r.json();
      setClinics(d.clinics || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinics();
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">My Clinics</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Register the physical clinics where you see patients in person. Patients can book at a specific clinic from your profile.
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">+ Add clinic</button>
      </header>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading…</p>
      ) : clinics.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 p-8 text-center">
          <p className="text-sm text-gray-700 dark:text-slate-300">You haven&apos;t registered any clinics yet.</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Add your clinic so patients can book in-person visits and see your location on your profile.
          </p>
          <button onClick={() => setShowNew(true)} className="btn-primary mt-4">
            Register your first clinic
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {clinics.map((c) => (
            <ClinicCard key={c.id} clinic={c} onChanged={loadClinics} expanded={selected === c.id} onToggle={() => setSelected(selected === c.id ? null : c.id)} />
          ))}
        </div>
      )}

      {showNew && (
        <NewClinicModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            loadClinics();
          }}
        />
      )}
    </main>
  );
}

function ClinicCard({ clinic, onChanged, expanded, onToggle }: { clinic: Clinic; onChanged: () => void; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">{clinic.name}</h3>
            {!clinic.active && <span className="rounded-full bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-gray-600 dark:text-slate-400">Inactive</span>}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {[clinic.addressLine1, clinic.city, clinic.state, clinic.country].filter(Boolean).join(", ")}
          </p>
          <p className="mt-1 text-xs font-mono text-gray-400 dark:text-slate-500">{clinic.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/clinic/${clinic.id}/login`} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">
            Reception login →
          </a>
          <button onClick={onToggle} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700">
            {expanded ? "Close" : "Manage"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 border-t border-gray-100 dark:border-slate-800 pt-5">
          <ClinicStaffPanel clinicId={clinic.id} />
          <div className="mt-6">
            <PaymentToggles clinic={clinic} onChanged={onChanged} />
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentToggles({ clinic, onChanged }: { clinic: Clinic; onChanged: () => void }) {
  const [online, setOnline] = useState(clinic.acceptOnlinePayment);
  const [atClinic, setAtClinic] = useState(clinic.acceptClinicPayment);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    if (!online && !atClinic) {
      setErr("Enable at least one payment method.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/doctor/clinics/${clinic.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptOnlinePayment: online, acceptClinicPayment: atClinic }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr(d.error || "Failed to save");
      } else {
        onChanged();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Payment options</h4>
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Patients pick one at booking time.</p>
      <div className="mt-3 flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
          <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} />
          Pay online at booking (Stripe / Cashfree)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
          <input type="checkbox" checked={atClinic} onChange={(e) => setAtClinic(e.target.checked)} />
          Pay at clinic (cash / UPI / card at reception)
        </label>
      </div>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      <button onClick={save} disabled={saving} className="mt-3 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function ClinicStaffPanel({ clinicId }: { clinicId: string }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"receptionist" | "assistant" | "manager">("receptionist");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await fetch(`/api/doctor/clinics/${clinicId}/staff`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setStaff(d.staff || []);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/doctor/clinics/${clinicId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone: phone || undefined, role, password }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "Failed to add staff");
        return;
      }
      setName(""); setEmail(""); setPhone(""); setPassword(""); setRole("receptionist");
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (staffId: string) => {
    if (!confirm("Remove this staff member?")) return;
    const r = await fetch(`/api/doctor/clinics/${clinicId}/staff/${staffId}`, { method: "DELETE" });
    if (r.ok) load();
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Reception staff</h4>
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
        Staff log in at <code className="rounded bg-gray-100 dark:bg-slate-800 px-1">/clinic/{clinicId}/login</code> to look up bookings.
      </p>

      {staff.length > 0 && (
        <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-800 rounded-lg border border-gray-100 dark:border-slate-800">
          {staff.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{s.name}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {s.email} · {s.role}
                  {s.lastLoginAt ? ` · last login ${new Date(s.lastLoginAt).toLocaleString()}` : ""}
                </p>
              </div>
              <button onClick={() => remove(s.id)} className="text-xs text-red-600 hover:underline">Remove</button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-4 grid gap-2 rounded-lg border border-dashed border-gray-200 dark:border-slate-700 p-3 sm:grid-cols-2">
        <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-gray-300 dark:border-slate-700 px-2 py-1.5 text-sm" />
        <input required type="email" placeholder="Email (login)" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded border border-gray-300 dark:border-slate-700 px-2 py-1.5 text-sm" />
        <input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded border border-gray-300 dark:border-slate-700 px-2 py-1.5 text-sm" />
        <select value={role} onChange={(e) => setRole(e.target.value as "receptionist" | "assistant" | "manager")} className="rounded border border-gray-300 dark:border-slate-700 px-2 py-1.5 text-sm">
          <option value="receptionist">Receptionist</option>
          <option value="assistant">Assistant</option>
          <option value="manager">Manager</option>
        </select>
        <input required type="password" placeholder="Password (min 8 chars)" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="rounded border border-gray-300 dark:border-slate-700 px-2 py-1.5 text-sm sm:col-span-2" />
        {err && <p className="text-xs text-red-600 sm:col-span-2">{err}</p>}
        <button disabled={busy} className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 sm:col-span-2">
          {busy ? "Adding…" : "Add staff member"}
        </button>
      </form>
    </div>
  );
}

function NewClinicModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [addressLine1, setAddr1] = useState("");
  const [addressLine2, setAddr2] = useState("");
  // We track ISO codes internally because country-state-city's lookup
  // helpers key on them — but we POST the human-readable names to the
  // API so the API contract (country / state / city as plain strings)
  // is unchanged.
  const [countryCode, setCountryCode] = useState("IN");  // default India
  const [stateCode, setStateCode] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPC] = useState("");
  const [phone, setPhone] = useState("");
  const [mapsUrl, setMaps] = useState("");
  const [hours, setHours] = useState<ClinicHours[]>(() => buildAllDayHours());

  // Helper to mutate one day's row by index (Sun=0..Sat=6).
  const setDayHours = (day: number, patch: Partial<ClinicHours>) => {
    setHours((prev) => prev.map((h) => (h.day === day ? { ...h, ...patch } : h)));
  };
  const [feeOverride, setFee] = useState("");

  // Tax details — collected once at registration so every invoice
  // generated at this clinic carries valid tax info.
  const [legalBusinessName, setLegalBusinessName] = useState("");
  const [taxRegistered, setTaxRegistered] = useState(false);
  const [taxIdType, setTaxIdType] = useState<"GSTIN" | "PAN" | "VAT" | "EIN" | "TRN" | "ABN" | "OTHER">("GSTIN");
  const [taxId, setTaxId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // country-state-city is ~1.6MB minified. Lazy-load on first open so
  // the rest of the doctor dashboard isn't penalised. Until the lib
  // lands the dropdowns render disabled with a "Loading…" placeholder.
  const [csc, setCsc] = useState<Csc | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("country-state-city").then((mod) => {
      if (!cancelled) setCsc(mod);
    });
    return () => { cancelled = true; };
  }, []);

  const countries: CscCountry[] = useMemo(
    () => (csc ? (csc.Country.getAllCountries() as CscCountry[]) : []),
    [csc],
  );
  const states: CscState[] = useMemo(
    () => (csc && countryCode ? (csc.State.getStatesOfCountry(countryCode) as CscState[]) : []),
    [csc, countryCode],
  );
  const cities: CscCity[] = useMemo(
    () => (csc && countryCode && stateCode
      ? (csc.City.getCitiesOfState(countryCode, stateCode) as CscCity[])
      : []),
    [csc, countryCode, stateCode],
  );

  // Resolve human-readable names for the API payload.
  const countryName = countries.find((c) => c.isoCode === countryCode)?.name || countryCode;
  const stateName = states.find((s) => s.isoCode === stateCode)?.name || stateCode;

  // Per-country currency: when the doctor picks India the fee field
  // flips to "Per-visit fee (INR ₹)"; UAE → "(AED د.إ)"; etc.
  // byCountry uses ISO-3166 alpha-2 codes which match country-state-city's
  // isoCode field exactly. Falls back to USD if the country isn't in
  // our currency table (rare — currencies.ts covers ~150 countries).
  const currency = byCountry(countryCode) || byCode("USD")!;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      // Convert the doctor-entered fee from their country's currency
      // back to USD before posting. The /api/doctor/clinics route
      // stores fees in USD as the canonical unit (matches doctors-store
      // and the existing per-currency display layer at /doctors/[id]).
      let feeUsd: number | undefined;
      if (feeOverride) {
        const raw = Number(feeOverride);
        if (Number.isFinite(raw) && raw > 0) {
          feeUsd = currency.code === "USD"
            ? raw
            : await convert(raw, currency.code, "USD");
        }
      }

      const r = await fetch("/api/doctor/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          addressLine1,
          addressLine2: addressLine2 || undefined,
          city,
          state: stateName || undefined,
          country: countryName,
          postalCode: postalCode || undefined,
          phone: phone || undefined,
          mapsUrl: mapsUrl || undefined,
          hours,
          // Both payment options are enabled by default — patients pick
          // online vs at-clinic at booking time. Doctor doesn't need to
          // configure this; we'd rather accept money any way the
          // patient wants to pay.
          acceptOnlinePayment: true,
          acceptClinicPayment: true,
          feeOverride: feeUsd,
          // Tax fields — only sent when the doctor opted in. taxId is
          // surfaced on every printed invoice; taxIdType drives the
          // label (GSTIN vs VAT vs EIN).
          legalBusinessName: legalBusinessName.trim() || undefined,
          taxCountryCode: countryCode,
          taxIdType: taxRegistered ? taxIdType : undefined,
          taxId: taxRegistered && taxId.trim() ? taxId.trim() : undefined,
          taxRegistered,
          homeStateCode: stateCode || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "Failed to register clinic");
        return;
      }
      onCreated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
      >
        {/* ── Gradient hero header ────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-5 text-white">
          {/* Decorative blurred blobs */}
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-fuchsia-300/30 blur-3xl" />

          <div className="relative flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl shadow-inner ring-1 ring-white/20 backdrop-blur">
              🏥
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">OduDoc · Clinic registration</p>
              <h2 className="mt-0.5 text-xl font-bold leading-tight">Register a clinic</h2>
              <p className="mt-1 text-sm text-white/80">Patients can book in-person visits here.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-0 top-0 -mr-1 -mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/90 transition hover:bg-white/20"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Section: Clinic basics */}
          <Section icon="✏️" iconBg="from-emerald-500 to-teal-500" title="Clinic basics" subtitle="The name and street address patients will see.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Clinic name *" className="sm:col-span-2" value={name} onChange={setName} required />
              <Field label="Address *" className="sm:col-span-2" value={addressLine1} onChange={setAddr1} required />
              <Field label="Address line 2" className="sm:col-span-2" value={addressLine2} onChange={setAddr2} />
            </div>
          </Section>

          {/* Section: Location */}
          <Section icon="🌍" iconBg="from-sky-500 to-indigo-500" title="Location" subtitle="Used for the map link and patient-facing search.">
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Country *"
                value={countryCode}
                onChange={(v) => { setCountryCode(v); setStateCode(""); setCity(""); }}
                required
                disabled={!csc}
                options={countries.map((c) => ({ value: c.isoCode, label: c.name }))}
                placeholder={csc ? "Select country" : "Loading countries…"}
              />
              {states.length > 0 ? (
                <SelectField
                  label="State / Region *"
                  value={stateCode}
                  onChange={(v) => { setStateCode(v); setCity(""); }}
                  required
                  options={states.map((s) => ({ value: s.isoCode, label: s.name }))}
                  placeholder="Select state"
                />
              ) : (
                <Field label="State / Region" value={stateCode} onChange={setStateCode} />
              )}
              {cities.length > 0 ? (
                <SelectField
                  label="City *"
                  value={city}
                  onChange={setCity}
                  required
                  options={cities.map((c) => ({ value: c.name, label: c.name }))}
                  placeholder="Select city"
                />
              ) : (
                <Field label="City *" value={city} onChange={setCity} required={!stateCode || states.length === 0} />
              )}
              <Field label="Postal code" value={postalCode} onChange={setPC} />
            </div>
          </Section>

          {/* Section: Contact */}
          <Section icon="📞" iconBg="from-rose-500 to-pink-500" title="Contact" subtitle="How patients can reach the clinic.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Clinic phone" value={phone} onChange={setPhone} />
              <Field label="Google Maps URL" value={mapsUrl} onChange={setMaps} />
            </div>
          </Section>

          {/* Section: Pricing */}
          <Section icon="💰" iconBg="from-amber-500 to-orange-500" title="Pricing" subtitle={`Charged per visit in ${currency.code}. Leave blank to use your profile default.`}>
            <Field
              label={`Per-visit fee (${currency.code} ${currency.symbol})`}
              value={feeOverride}
              onChange={setFee}
              type="number"
            />
          </Section>

          {/* Section: Tax */}
          <Section
            icon="🧾"
            iconBg="from-cyan-500 to-blue-500"
            title="Tax details"
            subtitle={
              taxRegistered
                ? `Required on every invoice issued at this clinic.`
                : `Skip if you're an individual practitioner under the threshold.`
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Legal business name"
                className="sm:col-span-2"
                value={legalBusinessName}
                onChange={setLegalBusinessName}
              />
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={taxRegistered}
                  onChange={(e) => setTaxRegistered(e.target.checked)}
                  className="h-4 w-4 accent-cyan-500"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  This clinic is registered for tax (GST / VAT / sales tax).
                  Invoices will include the tax breakdown.
                </span>
              </label>
              {taxRegistered && (
                <>
                  <SelectField
                    label="Tax ID type *"
                    value={taxIdType}
                    onChange={(v) => setTaxIdType(v as typeof taxIdType)}
                    required
                    options={[
                      { value: "GSTIN", label: "GSTIN (India)" },
                      { value: "PAN", label: "PAN (India)" },
                      { value: "VAT", label: "VAT (EU / UK / GCC)" },
                      { value: "EIN", label: "EIN (US)" },
                      { value: "TRN", label: "TRN (UAE / Saudi)" },
                      { value: "ABN", label: "ABN (Australia)" },
                      { value: "OTHER", label: "Other" },
                    ]}
                  />
                  <Field
                    label={`${taxIdType} number *`}
                    value={taxId}
                    onChange={setTaxId}
                    required={taxRegistered}
                  />
                </>
              )}
            </div>
          </Section>

          {/* Section: Hours */}
          <Section icon="🕐" iconBg="from-violet-500 to-fuchsia-500" title="Opening hours" subtitle="Tick Closed for days you don't see patients.">
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              {DAYS.map((d, i) => {
                const row = hours.find((h) => h.day === i)!;
                const closed = !!row.closed;
                return (
                  <div
                    key={d}
                    className={`grid grid-cols-[3.5rem_1fr_1fr_5rem] items-center gap-2 px-3 py-2 text-sm ${
                      i > 0 ? "border-t border-slate-200 dark:border-slate-700" : ""
                    } ${closed ? "bg-slate-50 dark:bg-slate-900/60" : "bg-white dark:bg-slate-900/30"}`}
                  >
                    <span className={`text-xs font-bold uppercase tracking-wider ${closed ? "text-slate-400" : "text-indigo-700 dark:text-indigo-300"}`}>{d}</span>
                    <input
                      type="time"
                      value={row.open}
                      disabled={closed}
                      onChange={(e) => setDayHours(i, { open: e.target.value })}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
                    />
                    <input
                      type="time"
                      value={row.close}
                      disabled={closed}
                      onChange={(e) => setDayHours(i, { close: e.target.value })}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
                    />
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={closed}
                        onChange={(e) => setDayHours(i, { closed: e.target.checked })}
                        className="h-3.5 w-3.5 rounded accent-rose-500"
                      />
                      Closed
                    </label>
                  </div>
                );
              })}
            </div>
          </Section>

          {err && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              {err}
            </div>
          )}
        </div>

        {/* ── Sticky footer ───────────────────────────────────────── */}
        <div className="flex gap-2 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            className="group relative flex-1 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
            <span className="relative">{busy ? "Saving…" : "✨ Register clinic"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({
  icon, iconBg, title, subtitle, children,
}: {
  icon: string;
  iconBg: string;        // tailwind gradient stops e.g. "from-emerald-500 to-teal-500"
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 last:mb-0">
      <header className="mb-3 flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${iconBg} text-base shadow-md`}>
          <span aria-hidden>{icon}</span>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, required, type = "text", className = "" }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
      />
    </label>
  );
}

type SelectOption = string | { value: string; label: string };

function SelectField({
  label, value, onChange, required, options, placeholder, className = "", disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  options: ReadonlyArray<SelectOption>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  // Accepts either plain strings (where value === label) or {value,
  // label} pairs (used by the country/state pickers where value is an
  // ISO code and label is the human-readable name).
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">{label}</span>
      <select
        required={required}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-60"
      >
        <option value="">{placeholder || `Select ${label.replace(/\s*\*$/, "").toLowerCase()}`}</option>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </label>
  );
}
