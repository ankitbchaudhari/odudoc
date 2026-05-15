"use client";

// Doctor → My Clinics. Lists every clinic the doctor has registered,
// lets them add a new one, edit existing ones, manage staff accounts,
// and toggle payment options. Each clinic gets its own staff login at
// /clinic/<clinicId>/login.

import { useEffect, useMemo, useState } from "react";

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
  const [hours] = useState<ClinicHours[]>(defaultHours());
  const [feeOverride, setFee] = useState("");
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
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
          feeOverride: feeOverride ? Number(feeOverride) : undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Register a clinic</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Patients will see this on your profile.</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="Clinic name *" className="sm:col-span-2" value={name} onChange={setName} required />
          <Field label="Address *" className="sm:col-span-2" value={addressLine1} onChange={setAddr1} required />
          <Field label="Address line 2" className="sm:col-span-2" value={addressLine2} onChange={setAddr2} />
          {/* Country drives the State and City option lists. Switching
              country resets both dependent fields so the doctor picks
              from the new country's options. */}
          <SelectField
            label="Country *"
            value={countryCode}
            onChange={(v) => { setCountryCode(v); setStateCode(""); setCity(""); }}
            required
            disabled={!csc}
            options={countries.map((c) => ({ value: c.isoCode, label: c.name }))}
            placeholder={csc ? "Select country" : "Loading countries…"}
          />
          {/* State / Region. country-state-city has states for ~80% of
              countries; for the rest the list is empty and we fall
              back to a free-text input so the form still works. */}
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
          {/* City. Cities are huge — ~150k worldwide. We only show the
              dropdown when a state is picked (limits to a few hundred
              max). If the package has no cities for this state, the
              doctor types one in. */}
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
          <Field label="Clinic phone" value={phone} onChange={setPhone} />
          <Field label="Google Maps URL" className="sm:col-span-2" value={mapsUrl} onChange={setMaps} />
          <Field label="Per-visit fee (USD) — leave blank to use your default" className="sm:col-span-2" value={feeOverride} onChange={setFee} type="number" />
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-gray-900 dark:text-slate-100">Hours (Mon–Sat 9–6 by default)</legend>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">You can edit hours after creation.</p>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs">
            {DAYS.map((d, i) => (
              <div key={d} className={`rounded px-1 py-1 ${hours.find((h) => h.day === i) ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500"}`}>{d}</div>
            ))}
          </div>
        </fieldset>

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm text-gray-700 dark:text-slate-300">
            Cancel
          </button>
          <button disabled={busy} className="btn-primary flex-1 disabled:opacity-60">
            {busy ? "Saving…" : "Register clinic"}
          </button>
        </div>
      </form>
    </div>
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
