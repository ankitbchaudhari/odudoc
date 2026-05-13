"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Vendor {
  id: string;
  name: string;
  status: "pending" | "approved" | "suspended" | "rejected";
  statusReason?: string;
  commissionPercent: number;
}

const benefits = [
  {
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    title: "Reach verified patients",
    desc: "Connect directly with thousands of patients actively searching for trusted pharmacies.",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    title: "Built-in prescription validation",
    desc: "We verify prescriptions so you can focus on fulfilling orders safely and quickly.",
    gradient: "from-rose-500 to-red-600",
  },
  {
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1",
    title: "Weekly payouts",
    desc: "Fast, reliable payouts every week with a fair 10% platform commission.",
    gradient: "from-orange-500 to-rose-600",
  },
];

const stats = [
  { value: "10K+", label: "Active patients", gradient: "from-amber-500 to-orange-600" },
  { value: "24hr", label: "Approval time", gradient: "from-orange-500 to-rose-600" },
  { value: "10%", label: "Flat commission", gradient: "from-rose-500 to-pink-600" },
  { value: "Weekly", label: "Payout cycle", gradient: "from-amber-500 to-yellow-600" },
];

export default function SellPage() {
  const { data: session, status: authStatus } = useSession();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    phone: "",
    addressLine: "",
    city: "",
    country: "",
    licenseNumber: "",
    bankAccount: "",
  });
  const [licenseDoc, setLicenseDoc] = useState<File | null>(null);

  useEffect(() => {
    if (authStatus !== "authenticated") { setLoading(false); return; }
    fetch("/api/vendors/me")
      .then((r) => r.json())
      .then((d) => setVendor(d.vendor))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authStatus]);

  useEffect(() => {
    if (session?.user?.name) setForm((f) => ({ ...f, ownerName: f.ownerName || session.user.name || "" }));
  }, [session]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (licenseDoc) fd.append("licenseDoc", licenseDoc, licenseDoc.name);
      const res = await fetch("/api/vendors", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to submit"); return; }
      setVendor(data.vendor);
    } finally { setSaving(false); }
  };

  // Only the initial auth probe blocks render. We intentionally no longer
  // early-return for unauthenticated visitors — hiding the pitch behind a
  // login wall killed conversions. Instead, the page renders the full
  // marketing content for everyone and the apply section swaps between
  // "sign in to continue" / "you're already a vendor" / the real form
  // based on auth + vendor state.
  if (authStatus === "loading" || loading) {
    return <div className="p-12 text-center text-gray-500 dark:text-slate-400">Loading…</div>;
  }

  if (vendor) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-rose-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="pointer-events-none absolute -top-20 -right-20 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-amber-200/40 to-orange-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-xl px-4 py-16">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 md:text-4xl">
            Vendor{" "}
            <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              application
            </span>
          </h1>
          <div className={`mt-5 rounded-2xl border-2 p-6 shadow-sm ${
            vendor.status === "approved" ? "border-green-200 bg-green-50"
              : vendor.status === "pending" ? "border-amber-200 bg-amber-50"
              : "border-rose-200 bg-rose-50"
          }`}>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{vendor.name}</p>
            <p className="mt-1 text-sm">
              Status: <span className="font-bold">{vendor.status.toUpperCase()}</span>
              {vendor.commissionPercent > 0 && (
                <span className="ml-3 text-xs text-gray-600 dark:text-slate-300">Platform commission: {vendor.commissionPercent}%</span>
              )}
            </p>
            {vendor.statusReason && <p className="mt-1 text-xs text-gray-700 dark:text-slate-300">Note: {vendor.statusReason}</p>}

            {vendor.status === "pending" && (
              <p className="mt-3 text-xs text-amber-800">Our team reviews applications within 24 hours. You&apos;ll be emailed once approved.</p>
            )}
            {vendor.status === "approved" && (
              <Link
                href="/dashboard/vendor"
                className="mt-4 inline-block rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                Go to vendor dashboard →
              </Link>
            )}
            {vendor.status === "rejected" && (
              <p className="mt-3 text-xs text-rose-800">If you believe this is a mistake, contact support@odudoc.com.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 py-20">
        <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-amber-200/40 to-orange-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-rose-200/40 to-pink-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
            <span>💼</span> Grow your pharmacy
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 dark:text-slate-100 md:text-6xl">
            Your Pharmacy on{" "}
            <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              OduDoc
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
            Join OduDoc&apos;s multivendor pharmacy marketplace. List products, fulfill orders, and track earnings from your dashboard.
          </p>
          <a
            href="#apply"
            className="mt-8 inline-block rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            Start selling
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white dark:bg-slate-900 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <p className={`bg-gradient-to-r ${s.gradient} bg-clip-text text-4xl font-extrabold text-transparent`}>
                  {s.value}
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-slate-300">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900/40 py-16">
        <div className="pointer-events-none absolute top-10 -right-20 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-amber-200/30 to-orange-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4">
          <h2 className="mb-3 text-center text-3xl font-bold text-gray-900 dark:text-slate-100 md:text-4xl">
            Why partner with{" "}
            <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              OduDoc
            </span>
          </h2>
          <p className="mb-10 text-center text-gray-600 dark:text-slate-300">Everything you need to grow your pharmacy business online.</p>
          <div className="grid gap-6 md:grid-cols-3">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="rounded-3xl border border-gray-100 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${b.gradient} text-white shadow-lg ring-4 ring-white`}
                >
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={b.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{b.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial-like trust section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-rose-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 py-16">
        <div className="pointer-events-none absolute -top-20 -left-20 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-amber-200/40 to-orange-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-rose-200/40 to-pink-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-2xl text-white shadow-lg ring-4 ring-white">
            💬
          </div>
          <p className="mt-6 text-xl font-semibold text-gray-900 dark:text-slate-100 md:text-2xl">
            &ldquo;Onboarding was effortless and our orders doubled in the first month. The weekly payouts are a game-changer.&rdquo;
          </p>
          <p className="mt-4 text-sm font-semibold text-gray-600 dark:text-slate-300">— Sutariya Medical Store, Ahmedabad</p>
        </div>
      </section>

      {/* Application form */}
      <section id="apply" className="bg-white dark:bg-slate-900 py-16">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 md:text-4xl">
            Register your{" "}
            <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              pharmacy
            </span>
          </h2>
          <p className="mt-2 text-gray-600 dark:text-slate-300">
            Fill out the form below. Our team reviews applications within 24 hours.
          </p>

          {authStatus !== "authenticated" ? (
            // Unauthenticated: show a sign-in nudge in place of the form so
            // the pitch above doesn't dead-end. Carries a callbackUrl so the
            // visitor lands right back on the form after authenticating.
            <div className="mt-8 rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-rose-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg ring-4 ring-white">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 11c0-1.104.896-2 2-2s2 .896 2 2-.896 2-2 2-2-.896-2-2zm-6 0c0-1.104.896-2 2-2s2 .896 2 2-.896 2-2 2-2-.896-2-2zm12 0c0-1.104.896-2 2-2s2 .896 2 2-.896 2-2 2-2-.896-2-2z" />
                </svg>
              </div>
              <h3 className="mt-5 text-xl font-bold text-gray-900 dark:text-slate-100">Sign in to apply</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-slate-300">
                We need a verified account on file so we can email you about approval status and payouts. It&rsquo;s free and takes under a minute.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/auth/login?callbackUrl=/sell%23apply"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                >
                  Sign in &amp; continue →
                </Link>
                <Link
                  href="/auth/register?callbackUrl=/sell%23apply"
                  className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-white dark:bg-slate-900 px-8 py-3 text-sm font-semibold text-amber-700 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50"
                >
                  Create an account
                </Link>
              </div>
              <p className="mt-4 text-xs text-gray-400 dark:text-slate-500">
                Already signed in as a patient? The same login works for vendors.
              </p>
            </div>
          ) : (
          <form
            onSubmit={submit}
            className="mt-8 space-y-4 rounded-3xl border border-gray-100 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:shadow-xl"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pharmacy / business name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required placeholder="e.g. Sutariya Medical Store" />
              <Field label="Owner name *" value={form.ownerName} onChange={(v) => setForm({ ...form, ownerName: v })} required />
              <Field label="Phone *" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required placeholder="+1 555 123 4567" />
              <Field label="Pharmacy license number *" value={form.licenseNumber} onChange={(v) => setForm({ ...form, licenseNumber: v })} required />
              <Field wide label="Business address *" value={form.addressLine} onChange={(v) => setForm({ ...form, addressLine: v })} required placeholder="Street, building, floor" />
              <Field label="City *" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
              <Field label="Country *" value={form.country} onChange={(v) => setForm({ ...form, country: v })} required />
              <Field wide label="Bank account (for payouts)" value={form.bankAccount} onChange={(v) => setForm({ ...form, bankAccount: v })} placeholder="Optional — you can add this later" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300">
                License document (PDF / image, max 5MB)
              </label>
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => setLicenseDoc(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-700 dark:text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-amber-100 file:to-orange-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-amber-700 hover:file:from-amber-200 hover:file:to-orange-200"
              />
              {licenseDoc && (
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  {licenseDoc.name} · {(licenseDoc.size / 1024).toFixed(0)} KB
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                Upload a clear scan or photo of your pharmacy/drug license. Optional now, required before first payout.
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-60 disabled:hover:scale-100"
            >
              {saving ? "Submitting…" : "Start Selling"}
            </button>

            <p className="text-xs text-gray-400 dark:text-slate-500">
              By submitting, you agree that you are a licensed pharmacy in your jurisdiction. We verify licenses before approving listings.
            </p>
          </form>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, required, wide,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300">{label}</label>
      <input required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2.5 text-sm outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
    </div>
  );
}
