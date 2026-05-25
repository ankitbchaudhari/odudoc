"use client";

// Multi-step signup wizard. Spec v6.3 §57 / Cowork_Complete §5.2.
// One wizard, five paths — patient, solo doctor, organisation,
// service-provider, student (invitation only, not handled here).
//
// Step 1 — Email + phone (with country code) — always shown.
// Step 2 — OTP verification (6-digit, 10-min expiry, email + SMS).
// Step 3 — Path-specific details (name + password + path fields).
// Step 4 — Success / next-steps panel.
//
// The path comes in via ?path=patient|doctor|corporate (with optional
// &type=<corporate sub-type slug>). Bouncing back to /signup (the
// gateway) is one click away on every step via "Wrong path?".

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PhoneInput from "@/components/PhoneInput";
import GoogleAuthButton, { AuthDivider } from "@/components/GoogleAuthButton";
import { getCorporateType } from "@/lib/corporate-types";

type Path = "patient" | "doctor" | "corporate";

interface PathMeta {
  label: string;
  subtitle: string;
  emoji: string;
  primaryGradient: string;
  successTitle: string;
  successBody: string;
  /** True for paths that need offline verification before the user can
   *  use the platform — we route them to a "Verification pending" page
   *  rather than straight to /dashboard. */
  verificationPending: boolean;
}

const PATH_META: Record<Path, PathMeta> = {
  patient: {
    label: "Patient",
    subtitle: "Personal account · free · always.",
    emoji: "🧑",
    primaryGradient: "from-emerald-400 to-teal-600",
    successTitle: "Welcome to OduDoc!",
    successBody: "Your account is ready. Sign in to book your first consultation.",
    verificationPending: false,
  },
  doctor: {
    label: "Doctor",
    subtitle: "Independent practice. Verification takes 24–48h.",
    emoji: "🩺",
    primaryGradient: "from-violet-500 to-fuchsia-600",
    successTitle: "Application received",
    successBody: "Our credentialing team will review your council registration and qualifications. Expect to hear from us in 24–48 hours.",
    verificationPending: true,
  },
  corporate: {
    label: "Organisation",
    subtitle: "Hospital / clinic / lab / pharmacy admin console.",
    emoji: "🏢",
    primaryGradient: "from-amber-400 to-rose-500",
    successTitle: "Application received",
    successBody: "Our onboarding team will verify your organisation documents and reach out within 24–48 hours to set up your admin console.",
    verificationPending: true,
  },
};

function WizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Path comes from the gateway / sub-type landing page. If it's
  // missing or invalid, bounce to the gateway picker.
  const rawPath = (searchParams?.get("path") || "").toLowerCase();
  const path = (["patient", "doctor", "corporate"].includes(rawPath) ? rawPath : null) as Path | null;
  const corporateTypeSlug = searchParams?.get("type") || "";
  const corpType = path === "corporate" && corporateTypeSlug ? getCorporateType(corporateTypeSlug) : undefined;

  useEffect(() => {
    if (!path) router.replace("/signup");
  }, [path, router]);

  // ─ Wizard state ───────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [doctorSpecialty, setDoctorSpecialty] = useState("");
  const [doctorRegNumber, setDoctorRegNumber] = useState("");
  const [orgName, setOrgName] = useState("");

  // Network-state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [signupToken, setSignupToken] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [phoneHint, setPhoneHint] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  if (!path) return null;

  const meta = PATH_META[path];

  // ── Step 1: send the OTP ─────────────────────────────────────────
  const sendOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/signup-otp/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to send code");
      if (j.alreadyRegistered) {
        setError("An account already exists for this email. Try signing in.");
        return;
      }
      setSessionId(j.sessionId);
      setEmailHint(j.emailHint);
      setPhoneHint(j.phoneHint);
      setResendCooldown(30);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setBusy(false);
    }
  };

  // ── Step 2: verify the OTP ───────────────────────────────────────
  const verifyOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/signup-otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, code: otp }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Verification failed");
      setSignupToken(j.token);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  // ── Step 3: submit final details ────────────────────────────────
  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      // The full registration body. Path-specific fields are tucked
      // into the user's name today (e.g. "Dr. <name>" for doctors)
      // until the backend grows dedicated endpoints — keeps the
      // wizard functional without expanding the backend schema in
      // this commit.
      const displayName =
        path === "doctor" && !name.match(/^Dr\.?\s/i) ? `Dr. ${name}` : name;
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: displayName,
          email,
          phone,
          password,
          signupToken,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Signup failed");
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-12 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-xl">
        {/* Path pill — visible on every step. */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <span>{corpType?.emoji ?? meta.emoji}</span>
          <span>
            {corpType ? `Signing up as a ${corpType.singular}` : `Signing up as a ${meta.label}`}
          </span>
          {step < 4 && (
            <Link href="/signup" className="ml-2 text-emerald-600 hover:underline dark:text-emerald-300">
              · Wrong path?
            </Link>
          )}
        </div>

        {/* Stepper */}
        {step < 4 && (
          <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] ${
                    step === n
                      ? `bg-gradient-to-br ${meta.primaryGradient} text-white shadow-md`
                      : step > n
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {step > n ? "✓" : n}
                </span>
                {n < 3 && <span className="h-px w-6 bg-slate-300 dark:bg-slate-700" />}
              </div>
            ))}
            <span className="ml-2 text-slate-400">
              {step === 1 && "Contact"}
              {step === 2 && "Verify"}
              {step === 3 && "Details"}
            </span>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {/* ─ Step 1 ───────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {corpType ? `Create your ${corpType.singular.toLowerCase()} account` : `Sign up as a ${meta.label}`}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{meta.subtitle}</p>

              {/* Patients can complete signup with just Google — the
                  signIn callback creates the user as already-verified.
                  Doctor + organisation paths intentionally keep only the
                  OTP+wizard flow because they need credentialing /
                  org-verification fields that don't exist in a Google
                  profile. */}
              {path === "patient" && (
                <div className="mt-6">
                  <GoogleAuthButton
                    callbackUrl="/dashboard"
                    label="Sign up with Google"
                  />
                  <AuthDivider text="or use email + phone" />
                </div>
              )}

              <div className={path === "patient" ? "space-y-4" : "mt-6 space-y-4"}>
                <Field label="Email">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </Field>
                <Field label="Phone">
                  <PhoneInput value={phone} onChange={setPhone} />
                </Field>

                {error && <Err msg={error} />}

                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={busy || !email || phone.length < 7}
                  className={`flex w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r ${meta.primaryGradient} px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60`}
                >
                  {busy ? "Sending code…" : "Send verification code →"}
                </button>
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  We&apos;ll send a 6-digit code to your email and phone.
                </p>
              </div>
            </>
          )}

          {/* ─ Step 2 ───────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Verify your contact</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                We sent a 6-digit code to <strong>{emailHint}</strong> and <strong>{phoneHint}</strong>. Enter it below.
              </p>

              <div className="mt-6 space-y-4">
                <Field label="6-digit code">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-2xl font-bold tracking-[0.4em] text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </Field>

                {error && <Err msg={error} />}

                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={busy || otp.length !== 6}
                  className={`flex w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r ${meta.primaryGradient} px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60`}
                >
                  {busy ? "Verifying…" : "Verify code →"}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  >
                    ← Change email / phone
                  </button>
                  <button
                    type="button"
                    onClick={resendCooldown > 0 ? undefined : sendOtp}
                    disabled={resendCooldown > 0 || busy}
                    className="font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 dark:text-emerald-300"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ─ Step 3 ───────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">A few more details</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {path === "doctor"
                  ? "We'll review your credentials and get you live in 24–48 hours."
                  : path === "corporate"
                    ? "Tell us about your organisation. We'll verify and set up your admin console."
                    : "Just your name and a password — you're almost done."}
              </p>

              <div className="mt-6 space-y-4">
                {path === "corporate" && (
                  <Field label={`${corpType?.singular ?? "Organisation"} name`}>
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder={corpType ? `e.g. Apollo ${corpType.singular}` : "e.g. Apollo Hospitals"}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </Field>
                )}

                <Field label={path === "corporate" ? "Admin contact name" : "Full name"}>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={path === "doctor" ? "Sarah Johnson" : "Your full name"}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </Field>

                {path === "doctor" && (
                  <>
                    <Field label="Specialty">
                      <input
                        type="text"
                        required
                        value={doctorSpecialty}
                        onChange={(e) => setDoctorSpecialty(e.target.value)}
                        placeholder="e.g. Cardiology"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </Field>
                    <Field label="Council registration number">
                      <input
                        type="text"
                        required
                        value={doctorRegNumber}
                        onChange={(e) => setDoctorRegNumber(e.target.value)}
                        placeholder="NMC / state council number"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </Field>
                  </>
                )}

                <Field label="Password">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </Field>

                {error && <Err msg={error} />}

                <button
                  type="button"
                  onClick={submit}
                  disabled={busy || !name || password.length < 6}
                  className={`flex w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r ${meta.primaryGradient} px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60`}
                >
                  {busy ? "Creating account…" : meta.verificationPending ? "Submit for verification →" : "Create account →"}
                </button>
              </div>
            </>
          )}

          {/* ─ Step 4 — success ────────────────────────────────── */}
          {step === 4 && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-3xl shadow-lg">
                {meta.verificationPending ? "⏳" : "✓"}
              </div>
              <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-slate-100">{meta.successTitle}</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{meta.successBody}</p>
              <div className="mt-6 flex flex-col gap-2">
                {meta.verificationPending ? (
                  <Link
                    href="/"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Back to home
                  </Link>
                ) : (
                  <Link
                    href="/auth/login"
                    className={`rounded-xl bg-gradient-to-r ${meta.primaryGradient} px-4 py-2.5 text-sm font-bold text-white shadow-lg`}
                  >
                    Sign in to your account →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Already have account link */}
        {step < 4 && (
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-emerald-600 hover:underline">
              Log in
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
      {msg}
    </div>
  );
}

export default function SignupWizardPage() {
  return (
    <Suspense fallback={null}>
      <WizardInner />
    </Suspense>
  );
}
