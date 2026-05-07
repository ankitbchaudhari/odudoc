"use client";

// Self-service profile editor for verified doctors.
//
// The admin "Request profile completion" email links to this URL.
// Loads the doctor's current profile via /api/doctors/me, lets them
// edit the marketing / availability fields (photo, bio, fee, time
// slots, etc.), and PATCHes back. Identity-critical fields (name,
// email, specialty, commission, verified) are intentionally
// read-only — those go through admin review.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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

interface ApiResponse {
  doctor: DoctorMe;
  displayCurrency?: { code: string; symbol: string };
}

export default function DoctorProfilePage() {
  const [doctor, setDoctor] = useState<DoctorMe | null>(null);
  const [currency, setCurrency] = useState<string>("USD");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Editable form state — initialised from the GET response.
  const [form, setForm] = useState({
    imageUrl: "",
    bio: "",
    qualifications: "",
    experience: "",
    city: "",
    country: "",
    location: "",
    fee: "",
    gender: "" as "" | "Male" | "Female",
    phone: "",
    services: "",   // comma-separated in the UI
    timeSlots: "",  // one slot per line in the UI
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/doctors/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data: ApiResponse) => {
        if (cancelled) return;
        setDoctor(data.doctor);
        setCurrency(data.displayCurrency?.symbol || "$");
        setForm({
          imageUrl: data.doctor.imageUrl || "",
          bio: data.doctor.bio || "",
          qualifications: data.doctor.qualifications || "",
          experience:
            typeof data.doctor.experience === "number"
              ? String(data.doctor.experience)
              : "",
          city: data.doctor.city || "",
          country: data.doctor.country || "",
          location: data.doctor.location || "",
          fee: typeof data.doctor.fee === "number" ? String(data.doctor.fee) : "",
          gender: data.doctor.gender || "",
          phone: data.doctor.phone || "",
          services: (data.doctor.services || []).join(", "),
          timeSlots: (data.doctor.timeSlots || []).join("\n"),
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      setForm((f) => ({ ...f, imageUrl: url }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setMsg(null);
    setSaving(true);
    try {
      const services = form.services
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const timeSlots = form.timeSlots
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const patch = {
        imageUrl: form.imageUrl,
        bio: form.bio,
        qualifications: form.qualifications,
        experience: form.experience.trim() ? Number(form.experience) : 0,
        city: form.city,
        country: form.country,
        location: form.location,
        fee: form.fee.trim() ? Number(form.fee) : 0,
        gender: form.gender || undefined,
        phone: form.phone,
        services,
        timeSlots,
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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-600">
          My profile
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Complete your public profile
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Anything you save here goes live on your patient-facing profile within
          seconds. Profiles with a real headshot and 80+ words of bio get
          roughly <b>3.4×</b> more bookings.
        </p>
      </header>

      {msg && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            msg.kind === "ok"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Read-only details</h2>
        <p className="mt-1 text-xs text-slate-500">
          To change any of these, contact{" "}
          <a className="text-primary-600 hover:underline" href="mailto:support@odudoc.com">
            support@odudoc.com
          </a>
          .
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" value={doctor.name} />
          <Field label="Email" value={doctor.email} />
          <Field label="Specialty" value={doctor.specialty} />
          <Field
            label="Verification"
            value={doctor.verified ? "Verified" : "Pending"}
          />
        </dl>
      </section>

      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Profile photo
          </h2>
          <div className="mt-3 flex items-start gap-4">
            <div className="h-24 w-24 flex-none overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
              {form.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl text-slate-400">
                  👤
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Upload new photo
              </button>
              {form.imageUrl && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                  className="ml-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                >
                  Remove
                </button>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Square image, at least 200×200 px, under 4 MB.
              </p>
            </div>
          </div>
        </div>

        <Input
          label="Phone"
          value={form.phone}
          onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
          placeholder="+1 555 123 4567"
        />

        <Textarea
          label="Bio"
          value={form.bio}
          onChange={(v) => setForm((f) => ({ ...f, bio: v }))}
          placeholder="Briefly describe your training, focus areas, and what patients can expect from a consultation. 80–200 words is ideal."
          rows={5}
          hint={`${form.bio.trim().length} / 600 characters`}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Qualifications"
            value={form.qualifications}
            onChange={(v) => setForm((f) => ({ ...f, qualifications: v }))}
            placeholder="MBBS, MD (Internal Medicine)"
          />
          <Input
            label="Years of experience"
            type="number"
            value={form.experience}
            onChange={(v) => setForm((f) => ({ ...f, experience: v }))}
            placeholder="5"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="City"
            value={form.city}
            onChange={(v) => setForm((f) => ({ ...f, city: v }))}
            placeholder="Mumbai"
          />
          <Input
            label="Country (ISO 2-letter)"
            value={form.country}
            onChange={(v) => setForm((f) => ({ ...f, country: v.toUpperCase().slice(0, 2) }))}
            placeholder="IN"
          />
        </div>

        <Input
          label="Clinic / address (optional)"
          value={form.location}
          onChange={(v) => setForm((f) => ({ ...f, location: v }))}
          placeholder="Street, area"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={`Consultation fee (${currency})`}
            type="number"
            value={form.fee}
            onChange={(v) => setForm((f) => ({ ...f, fee: v }))}
            placeholder="500"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Gender (optional)
            </label>
            <select
              value={form.gender}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  gender: (e.target.value as "" | "Male" | "Female") || "",
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Prefer not to say</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>

        <Textarea
          label="Services / treatments (comma-separated)"
          value={form.services}
          onChange={(v) => setForm((f) => ({ ...f, services: v }))}
          placeholder="General consultation, Diabetes management, Hypertension follow-up, Annual health check"
          rows={3}
        />

        <Textarea
          label="Weekly availability time slots (one per line)"
          value={form.timeSlots}
          onChange={(v) => setForm((f) => ({ ...f, timeSlots: v }))}
          placeholder={"Mon 09:00–13:00\nTue 09:00–13:00\nWed 17:00–20:00\nThu 09:00–13:00\nFri 17:00–20:00"}
          rows={6}
          hint="Patients can only book inside these windows."
        />
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/dashboard/doctor"
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-900">{value || "—"}</dd>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
