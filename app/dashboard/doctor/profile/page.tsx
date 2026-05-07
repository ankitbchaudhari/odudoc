"use client";

// Self-service profile editor for verified doctors.
//
// The admin "Request profile completion" email links to this URL.
// Loads the doctor's current profile via /api/doctors/me, lets them
// edit the marketing / availability fields (photo, bio, fee, time
// slots, etc.), and PATCHes back. Identity-critical fields (name,
// email, specialty, commission, verified) are intentionally
// read-only — those go through admin review.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ISO_COUNTRIES, detectIsoCountry, isoToName } from "@/lib/iso-countries";

interface DoctorMe {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialty: string;
  verified: boolean;
  imageUrl?: string;
  bio?: string;
  qualifications?: string;
  experience?: number;
  city?: string;
  location?: string;
  country?: string;
  fee?: number;
  gender?: "Male" | "Female";
  services?: string[];
  timeSlots?: string[];
}

interface DisplayCurrency {
  code: string;
  symbol: string;
}

interface ApiResponse {
  doctor: DoctorMe;
  displayCurrency?: DisplayCurrency;
}

// Days are short ISO-style for both display and stored format. The
// existing serialised slot string we send to the backend is one line
// per day-window: "Mon 09:00–13:00", "Mon 18:00–21:00", etc.
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = (typeof DAYS)[number];

interface SlotWindow {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}
type WeekSlots = Record<Day, SlotWindow[]>;

const EMPTY_WEEK: WeekSlots = {
  Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [],
};

// Parse the on-disk string format ("Mon 09:00–13:00") into structured
// per-day windows. Tolerates both the en-dash (–) and the ASCII hyphen
// (-) plus stray whitespace.
function parseSlots(raw: string[] | undefined): WeekSlots {
  const out: WeekSlots = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
  if (!raw) return out;
  const re = /^\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})\s*$/i;
  for (const line of raw) {
    const m = re.exec(line);
    if (!m) continue;
    const day = (m[1].slice(0, 1).toUpperCase() + m[1].slice(1, 3).toLowerCase()) as Day;
    out[day].push({ start: m[2].padStart(5, "0"), end: m[3].padStart(5, "0") });
  }
  return out;
}

function serializeSlots(week: WeekSlots): string[] {
  const out: string[] = [];
  for (const day of DAYS) {
    for (const w of week[day]) {
      out.push(`${day} ${w.start}–${w.end}`);
    }
  }
  return out;
}

export default function DoctorProfilePage() {
  const [doctor, setDoctor] = useState<DoctorMe | null>(null);
  const [currency, setCurrency] = useState<DisplayCurrency>({ code: "USD", symbol: "$" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState("");
  const [bio, setBio] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [experience, setExperience] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [fee, setFee] = useState("");
  const [gender, setGender] = useState<"" | "Male" | "Female">("");
  const [phone, setPhone] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [serviceDraft, setServiceDraft] = useState("");
  const [week, setWeek] = useState<WeekSlots>(EMPTY_WEEK);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/doctors/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data: ApiResponse) => {
        if (cancelled) return;
        setDoctor(data.doctor);
        if (data.displayCurrency) setCurrency(data.displayCurrency);
        setImageUrl(data.doctor.imageUrl || "");
        setBio(data.doctor.bio || "");
        setQualifications(data.doctor.qualifications || "");
        setExperience(
          typeof data.doctor.experience === "number" ? String(data.doctor.experience) : "",
        );
        setCity(data.doctor.city || "");
        setCountry(data.doctor.country || detectIsoCountry());
        setLocation(data.doctor.location || "");
        setFee(typeof data.doctor.fee === "number" ? String(data.doctor.fee) : "");
        setGender(data.doctor.gender || "");
        setPhone(data.doctor.phone || "");
        setServices(data.doctor.services || []);
        setWeek(parseSlots(data.doctor.timeSlots));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const completionPct = useMemo(() => {
    let filled = 0;
    let total = 8;
    if (imageUrl) filled++;
    if (bio.trim().length >= 60) filled++;
    if (qualifications.trim()) filled++;
    if (experience.trim()) filled++;
    if (city.trim()) filled++;
    if (country.trim()) filled++;
    if (fee.trim() && Number(fee) > 0) filled++;
    if (
      services.length > 0 ||
      Object.values(week).some((w) => w.length > 0)
    ) {
      filled++;
    }
    return Math.round((filled / total) * 100);
  }, [imageUrl, bio, qualifications, experience, city, country, fee, services, week]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg({ kind: "err", text: "Please choose an image file." });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setMsg({ kind: "err", text: "Image must be under 4 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      setImageUrl(url);
    };
    reader.readAsDataURL(file);
  }

  function addService() {
    const v = serviceDraft.trim();
    if (!v) return;
    if (services.some((s) => s.toLowerCase() === v.toLowerCase())) {
      setServiceDraft("");
      return;
    }
    setServices([...services, v]);
    setServiceDraft("");
  }

  function removeService(idx: number) {
    setServices(services.filter((_, i) => i !== idx));
  }

  function toggleDay(day: Day) {
    setWeek((w) => ({
      ...w,
      [day]: w[day].length === 0 ? [{ start: "09:00", end: "17:00" }] : [],
    }));
  }

  function addWindow(day: Day) {
    setWeek((w) => ({ ...w, [day]: [...w[day], { start: "18:00", end: "21:00" }] }));
  }

  function updateWindow(day: Day, idx: number, patch: Partial<SlotWindow>) {
    setWeek((w) => ({
      ...w,
      [day]: w[day].map((win, i) => (i === idx ? { ...win, ...patch } : win)),
    }));
  }

  function removeWindow(day: Day, idx: number) {
    setWeek((w) => ({ ...w, [day]: w[day].filter((_, i) => i !== idx) }));
  }

  function copyMondayToWeek() {
    const src = week.Mon;
    if (src.length === 0) return;
    setWeek({
      Mon: src,
      Tue: src.map((s) => ({ ...s })),
      Wed: src.map((s) => ({ ...s })),
      Thu: src.map((s) => ({ ...s })),
      Fri: src.map((s) => ({ ...s })),
      Sat: [],
      Sun: [],
    });
  }

  async function handleSave() {
    setMsg(null);
    setSaving(true);
    try {
      const patch = {
        imageUrl,
        bio,
        qualifications,
        experience: experience.trim() ? Number(experience) : 0,
        city,
        country,
        location,
        fee: fee.trim() ? Number(fee) : 0,
        gender: gender || undefined,
        phone,
        services,
        timeSlots: serializeSlots(week),
      };
      const res = await fetch("/api/doctors/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error || `Save failed (${res.status})` });
        return;
      }
      setMsg({ kind: "ok", text: "Saved. Your public profile is updated." });
      setDoctor(data.doctor);
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message || "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Doctor profile not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          We couldn&apos;t load your doctor record. Sign out and back in, then try again.
        </p>
        <Link
          href="/dashboard/doctor"
          className="mt-4 inline-block rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50/60 via-white to-indigo-50/40 pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-slate-200/60 bg-gradient-to-br from-primary-600 via-teal-600 to-emerald-600 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">
            My profile
          </p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            Make your profile unmissable
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
            Patients decide whether to book in about 8 seconds. Profiles with a real
            headshot and 80+ words of bio earn roughly{" "}
            <b className="text-white">3.4× more bookings</b>. Save anything here and
            it goes live within seconds.
          </p>

          {/* Progress */}
          <div className="mt-6 rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-white/90">
              <span>Profile strength</span>
              <span>{completionPct}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-300 transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {msg && (
          <div
            className={`mb-6 rounded-2xl px-4 py-3 text-sm shadow-sm ${
              msg.kind === "ok"
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Identity card */}
        <Card>
          <CardHead
            label="Identity"
            title="Read-only — to change these, contact support@odudoc.com"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ReadOnly label="Name" value={doctor.name} />
            <ReadOnly label="Email" value={doctor.email} />
            <ReadOnly label="Specialty" value={doctor.specialty} />
            <ReadOnly
              label="Verification"
              value={doctor.verified ? "Verified" : "Pending"}
              tone={doctor.verified ? "ok" : "warn"}
            />
          </div>
        </Card>

        {/* Photo + bio */}
        <Card>
          <CardHead label="The basics" title="Photo, bio, and contact" />
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="group relative">
              <div className="h-28 w-28 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-100 via-sky-100 to-indigo-100 ring-4 ring-white shadow-lg">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl text-primary-400">
                    👤
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Upload new photo"
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white shadow-md ring-2 ring-white transition-transform hover:scale-105"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            <div className="flex-1 space-y-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Upload photo
                </button>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="rounded-xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Square image, at least 200 × 200 px, under 4 MB. A clear, recent
                headshot performs best.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <FieldLabel>Bio</FieldLabel>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              maxLength={600}
              placeholder="Briefly describe your training, focus areas, and what patients can expect. 80–200 words is ideal — patients skim, not read."
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
            />
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span
                className={
                  bio.trim().length >= 60 ? "text-emerald-600" : "text-slate-500"
                }
              >
                {bio.trim().length >= 60
                  ? "Looking great — patients trust this."
                  : "Aim for 60+ characters to count toward your profile strength."}
              </span>
              <span className="tabular-nums text-slate-400">{bio.length}/600</span>
            </div>
          </div>

          <div className="mt-6">
            <FieldLabel>Phone</FieldLabel>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Include country code, e.g. +1 555 123 4567"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
            />
          </div>
        </Card>

        {/* Credentials */}
        <Card>
          <CardHead label="Credentials" title="Your qualifications and experience" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Qualifications">
              <input
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                placeholder="e.g. MBBS, MD (Internal Medicine)"
                className="input-modern"
              />
            </Field>
            <Field label="Years of experience">
              <input
                type="number"
                min={0}
                max={70}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="5"
                className="input-modern"
              />
            </Field>
          </div>
        </Card>

        {/* Location & fee */}
        <Card>
          <CardHead label="Location & fee" title="Where you practice and what you charge" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="City">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Your city"
                className="input-modern"
              />
            </Field>
            <Field label="Country">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="input-modern"
              >
                <option value="">Select a country…</option>
                {ISO_COUNTRIES.map((c) => (
                  <option key={c.iso} value={c.iso}>
                    {c.name}
                  </option>
                ))}
              </select>
              {country && (
                <p className="mt-1 text-xs text-slate-500">
                  Selected: <b>{isoToName(country)}</b> · drives the currency below.
                </p>
              )}
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Clinic / address (optional)">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Street, area, landmark"
                className="input-modern"
              />
            </Field>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={`Consultation fee (${currency.code})`}>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                  {currency.symbol}
                </span>
                <input
                  type="number"
                  min={0}
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="0"
                  className="input-modern pl-9"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Patients in other countries see a converted amount automatically.
              </p>
            </Field>
            <Field label="Gender (optional)">
              <select
                value={gender}
                onChange={(e) =>
                  setGender((e.target.value as "" | "Male" | "Female") || "")
                }
                className="input-modern"
              >
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </Field>
          </div>
        </Card>

        {/* Services */}
        <Card>
          <CardHead
            label="Services"
            title="Treatments, procedures, or specialties you offer"
          />
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
            <div className="flex flex-wrap gap-2">
              {services.map((s, idx) => (
                <span
                  key={`${s}-${idx}`}
                  className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-500 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => removeService(idx)}
                    aria-label={`Remove ${s}`}
                    className="-mr-1 ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-white/90 opacity-80 transition hover:bg-white/30 hover:opacity-100"
                  >
                    ×
                  </button>
                </span>
              ))}
              {services.length === 0 && (
                <span className="text-xs text-slate-400">
                  Add 3–5 services patients are most likely to search for.
                </span>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={serviceDraft}
                onChange={(e) => setServiceDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addService();
                  } else if (
                    e.key === "Backspace" &&
                    !serviceDraft &&
                    services.length > 0
                  ) {
                    removeService(services.length - 1);
                  }
                }}
                placeholder="Type a service and press Enter"
                className="input-modern flex-1"
              />
              <button
                type="button"
                onClick={addService}
                disabled={!serviceDraft.trim()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        </Card>

        {/* Availability */}
        <Card>
          <CardHead
            label="Availability"
            title="Patients can only book inside the windows you set"
            right={
              week.Mon.length > 0 ? (
                <button
                  type="button"
                  onClick={copyMondayToWeek}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Copy Mon → Mon-Fri
                </button>
              ) : null
            }
          />
          <ul className="space-y-2">
            {DAYS.map((day) => {
              const windows = week[day];
              const on = windows.length > 0;
              return (
                <li
                  key={day}
                  className={`rounded-2xl border transition-all ${
                    on
                      ? "border-primary-200 bg-primary-50/40 shadow-sm"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleDay(day)}
                        aria-pressed={on}
                        aria-label={`${on ? "Disable" : "Enable"} ${day}`}
                        className={`relative h-6 w-11 flex-none rounded-full transition-colors ${
                          on ? "bg-gradient-to-r from-primary-500 to-teal-500" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                            on ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                      <span className="w-12 flex-none text-sm font-bold text-slate-900">
                        {day}
                      </span>
                      {!on && (
                        <span className="text-xs text-slate-400">Off</span>
                      )}
                    </div>
                    {on && (
                      <button
                        type="button"
                        onClick={() => addWindow(day)}
                        className="rounded-lg border border-primary-200 bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50"
                      >
                        + Add window
                      </button>
                    )}
                  </div>
                  {on && (
                    <ul className="space-y-2 px-4 pb-3 sm:px-5">
                      {windows.map((w, idx) => (
                        <li
                          key={idx}
                          className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200"
                        >
                          <TimeBox
                            value={w.start}
                            onChange={(v) => updateWindow(day, idx, { start: v })}
                          />
                          <span className="text-slate-400">–</span>
                          <TimeBox
                            value={w.end}
                            onChange={(v) => updateWindow(day, idx, { end: v })}
                          />
                          <span className="ml-2 text-xs text-slate-500">
                            {durationLabel(w)}
                          </span>
                          {windows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeWindow(day, idx)}
                              aria-label="Remove window"
                              className="ml-auto rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-xs text-slate-600">
            Changes go live the moment you save. You can edit again any time.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/doctor"
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-primary-600 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .input-modern {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input-modern::placeholder {
          color: rgb(148 163 184);
        }
        .input-modern:focus {
          outline: none;
          border-color: var(--color-primary-500, #14b8a6);
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.15);
        }
      `}</style>
    </div>
  );
}

// -- Small presentational helpers -------------------------------------

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {children}
    </section>
  );
}

function CardHead({
  label,
  title,
  right,
}: {
  label: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600">
          {label}
        </p>
        <h2 className="mt-0.5 text-base font-semibold text-slate-900 sm:text-lg">
          {title}
        </h2>
      </div>
      {right}
    </header>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
      {children}
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

function ReadOnly({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn";
}) {
  const toneCls =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-slate-50 text-slate-700 ring-slate-200";
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div
        className={`rounded-xl px-3 py-2.5 text-sm font-medium ring-1 ${toneCls}`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function TimeBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold tabular-nums text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
    />
  );
}

function durationLabel(w: { start: string; end: string }): string {
  const [sh, sm] = w.start.split(":").map(Number);
  const [eh, em] = w.end.split(":").map(Number);
  if (![sh, sm, eh, em].every(Number.isFinite)) return "";
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return "(invalid)";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
