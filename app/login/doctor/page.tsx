"use client";

// /login/doctor — email + password.
//
// Wraps NextAuth's credentials provider but with doctor-specific
// framing + post-login redirect to /pro/dashboard. Hospital staff
// using OduDoc Pro also land here; the corporate page is for
// non-clinical roles (insurance / pharma / education / hospital
// admin).

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function DoctorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [need2fa, setNeed2fa] = useState(false);
  const [totp, setTotp] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signIn("credentials", { email, password, totp, redirect: false });
    setBusy(false);
    if (result?.error) {
      // The credentials provider throws "2fa_required" the first time
      // it sees a 2FA-enabled user without a code. We treat that as a
      // step-up rather than a failure — reveal the TOTP field and let
      // the user retry without retyping their password.
      if (result.error.includes("2fa_required")) {
        setNeed2fa(true);
        setError(null);
        return;
      }
      setError(
        result.error.includes("banned") ? "Account deactivated. Email support@odudoc.com."
        : result.error.includes("locked") ? "Account temporarily locked — too many concurrent sessions. Contact support."
        : result.error.includes("unverified") ? "Your account is pending verification. Check your email for updates."
        : result.error.includes("2FA") ? "Incorrect 2FA code. Check your authenticator app."
        : "Incorrect email or password."
      );
      return;
    }
    // The redirect callback inside lib/auth.ts handles role-based
    // routing; for the doctor door we ALSO want a hint so the
    // post-login landing is the doctor dashboard.
    router.push("/dashboard/doctor");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <main className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <Link href="/login" className="text-xs font-semibold text-[#1E40AF] hover:underline">
          ← Back to login options
        </Link>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">Doctor login</h1>
        <p className="mt-2 text-sm text-gray-600">
          Sign in with the credentials set during verification.
          Hospital staff on OduDoc Pro use this door too.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dr.you@example.com"
              autoFocus
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-[#1E40AF] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20"
            />
          </label>
          <label className="block">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Password</span>
              <Link href="/auth/forgot-password" className="text-xs font-semibold text-[#1E40AF] hover:underline">
                Forgot?
              </Link>
            </div>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 pr-12 text-sm focus:border-[#1E40AF] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          {need2fa && (
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                Authenticator code
              </span>
              <input
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                autoFocus
                autoComplete="one-time-code"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-center text-lg font-mono tracking-widest focus:border-[#1E40AF] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20"
              />
              <p className="mt-1 text-xs text-gray-500">
                Open your authenticator app (Google Authenticator, Authy, 1Password) and enter the current 6-digit code.
              </p>
            </label>
          )}
          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}
          <button
            type="submit"
            disabled={busy || !email || !password || (need2fa && totp.length !== 6)}
            className="w-full rounded-xl bg-[#1E40AF] px-4 py-3 text-sm font-bold text-white hover:bg-[#0A1F3B] disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Log in"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Not a doctor yet on OduDoc?{" "}
          <Link href="/for-doctors/register" className="font-semibold text-[#1E40AF] hover:underline">
            Apply →
          </Link>
        </p>
      </main>
    </div>
  );
}
