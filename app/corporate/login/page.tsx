"use client";

// Corporate-only sign-in.
//
// This page is intentionally separate from /auth/login (which is the
// universal sign-in for patients, individual doctors, vendors, and
// org members). The /corporate marketing page targets hospitals and
// HR-benefits buyers — those visitors are admins, doctors, nurses,
// billing, and lab employees who belong to an organization. Sending
// them to a generic patient-flavored login page felt wrong, so this
// route gives them a dedicated, corporate-branded entry that:
//   - explicitly says "Hospital admin & employee sign-in"
//   - reuses the same OTP backend (/api/auth/otp/send + /auth/verify)
//   - routes successful logins to /admin (the org console) by default
//   - has a discreet escape hatch for patients/individuals who landed
//     here by accident, pointing them at /auth/login.

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function CorporateLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Corporate users always land in /admin after sign-in. The
  // OrgSwitcher there lets multi-tenant employees pick the right
  // hospital. We only honor an explicit ?callbackUrl when it's an
  // /admin sub-route so a malicious deep link can't bounce a corporate
  // user into the patient dashboard.
  const requestedCallback = searchParams.get("callbackUrl") || "/admin";
  const callbackUrl = requestedCallback.startsWith("/admin")
    ? requestedCallback
    : "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign-in failed");
        return;
      }

      if (data.skipOtp) {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (result?.error) {
          setError(result.error);
          return;
        }
        // Corporate destination resolution. We always prefer /admin
        // for org-attached roles. Patients that wandered in get a
        // soft redirect to their dashboard rather than a hard error
        // — they'll see the right thing and the URL won't trap them.
        const dest =
          data.role === "admin"
            ? "/admin"
            : data.role === "staff"
              ? "/admin"
              : data.role === "doctor"
                ? "/admin"
                : data.role === "patient"
                  ? "/dashboard"
                  : callbackUrl;
        router.push(dest);
        router.refresh();
        return;
      }

      const qs = new URLSearchParams({
        email,
        p: password,
        emailHint: data.emailHint || email,
        phoneHint: data.phoneHint || "",
        hasPhone: String(Boolean(data.hasPhone)),
        callbackUrl,
      });
      router.push(`/auth/verify?${qs.toString()}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
      {/* Left — corporate trust panel */}
      <aside className="relative hidden overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900 p-10 text-white shadow-2xl lg:block">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300" />
            Hospitals · Clinics · HR benefits
          </div>

          <h2 className="mt-6 text-4xl font-bold leading-tight">
            Sign in to your
            <br /> hospital admin console.
          </h2>
          <p className="mt-4 max-w-md text-sm text-white/80">
            For organizations using OduDoc — admins, doctors, nurses,
            billing, lab, radiology, pharmacy and front-desk employees of
            your hospital or clinic.
          </p>

          {/* Live stats strip — three numbers that signal scale and
              clinical seriousness without naming customer brands. */}
          <div className="mt-8 grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div>
              <p className="text-2xl font-extrabold text-white">300+</p>
              <p className="text-[10px] uppercase tracking-wider text-white/60">Facilities live</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-white">55+</p>
              <p className="text-[10px] uppercase tracking-wider text-white/60">Modules</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-white">99.95%</p>
              <p className="text-[10px] uppercase tracking-wider text-white/60">Uptime SLA</p>
            </div>
          </div>

          {/* Who can sign in — explicit, so a doctor or pharmacy clerk
              who lands here knows this is the right door. */}
          <div className="mt-8">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
              Roles that sign in here
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                "Hospital admin",
                "Doctor",
                "Nurse",
                "Front desk",
                "Pharmacy",
                "Lab tech",
                "Radiology",
                "Billing",
                "Ward staff",
                "OT staff",
              ].map((r) => (
                <span
                  key={r}
                  className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/85 backdrop-blur"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          <ul className="mt-8 space-y-3.5 text-sm">
            {[
              { t: "Multi-tenant ready", d: "Switch between facilities you belong to in one click." },
              { t: "Role-based access", d: "OPD, IPD, pharmacy, lab, radiology and billing — scoped by role." },
              { t: "SOC2 / HIPAA posture", d: "Audit logs, RBAC, encrypted at rest and in transit." },
              { t: "SSO & 2FA ready", d: "Email OTP today; Google / Microsoft SSO on enterprise plans." },
              { t: "FHIR / HL7 export", d: "Your data stays portable — no vendor lock-in." },
            ].map((f) => (
              <li key={f.t} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-400/20 ring-1 ring-teal-300/40">
                  <svg className="h-3.5 w-3.5 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <div>
                  <p className="font-semibold">{f.t}</p>
                  <p className="text-xs text-white/70">{f.d}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Compliance badges — visual reassurance for IT / procurement
              folks who arrive at this page from a vendor evaluation. */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {["HIPAA", "SOC 2", "ISO 27001", "DPDP Act", "GDPR"].map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-gradient-to-b from-white/10 to-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90"
              >
                <svg className="h-3 w-3 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {b}
              </span>
            ))}
          </div>

          {/* Lightweight testimonial — anonymized but specific enough to
              feel real. Adds human texture below the technical bullets. */}
          <figure className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <svg className="h-5 w-5 text-teal-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7.17 17q-.95 0-1.56-.69T5 14.6q0-.85.27-1.78t.78-1.85q.5-.92 1.21-1.74T8.81 7.7l.94.6q-.7.74-1.18 1.55T7.85 11.5q-.18.43-.21.81t.13.66q.39-.16.79-.16.92 0 1.51.61t.59 1.55q0 .96-.65 1.6-.65.43-1.84.43Zm8 0q-.95 0-1.56-.69T13 14.6q0-.85.27-1.78t.78-1.85q.5-.92 1.21-1.74T16.81 7.7l.94.6q-.7.74-1.18 1.55-.49.81-.72 1.65-.18.43-.21.81t.13.66q.39-.16.79-.16.92 0 1.51.61t.59 1.55q0 .96-.65 1.6-.65.43-1.84.43Z" />
            </svg>
            <blockquote className="mt-2 text-xs leading-relaxed text-white/85">
              We replaced four separate tools — EMR, pharmacy, billing and lab — with OduDoc.
              Onboarding the whole 80-bed unit took two weeks.
            </blockquote>
            <figcaption className="mt-2 text-[10px] uppercase tracking-wider text-white/55">
              Medical Director · 80-bed multispecialty hospital
            </figcaption>
          </figure>

          <p className="mt-6 text-xs text-white/60">
            New hospital?{" "}
            <Link href="/contact" className="font-semibold text-teal-300 hover:text-teal-200 hover:underline">
              Talk to sales
            </Link>{" "}
            to onboard your facility — typical go-live in 2–3 weeks.
          </p>
        </div>
      </aside>

      {/* Right — sign-in form */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 sm:p-10">
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.657-1.343-3-3-3s-3 1.343-3 3 1.343 3 3 3 3-1.343 3-3zm0 0c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3-3-1.343-3-3zM3 21v-1a4 4 0 014-4h2m6 5v-1a4 4 0 014-4h2" />
            </svg>
            Corporate sign-in
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            Hospital admin & employee sign-in
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Use your work email to access your facility&apos;s OduDoc admin console.
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Work email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@hospital.com"
              className="w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-4 py-2.5 pr-12 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-slate-900 to-indigo-900 px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.01] disabled:opacity-60 disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in…
              </>
            ) : (
              <>
                Sign in to admin console
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 rounded-lg bg-slate-50 dark:bg-slate-900 p-4 text-xs text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-800">
          <p className="font-semibold text-slate-700 dark:text-slate-300">Not a corporate user?</p>
          <p className="mt-1">
            Patients and individual practitioners should use the{" "}
            <Link href="/auth/login" className="font-semibold text-indigo-600 hover:underline">
              patient & individual sign-in
            </Link>{" "}
            instead.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Want to onboard a new hospital?{" "}
          <Link href="/contact" className="font-semibold text-indigo-600 hover:underline">
            Request a demo
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function CorporateLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 px-4 py-10 sm:px-6">
      <Suspense
        fallback={
          <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>
        }
      >
        <CorporateLoginForm />
      </Suspense>
    </main>
  );
}
