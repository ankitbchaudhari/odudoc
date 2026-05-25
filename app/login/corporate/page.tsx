"use client";

// /login/corporate — staff ID OR work email + password.
//
// All non-clinical OduDoc Pro staff (hospital admin, lab, pharmacy,
// pharma, insurance surveyor, HR, finance, IT, vendor). NO self-
// registration — accounts are created by Hospital Admin.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import GoogleAuthButton, { AuthDivider } from "@/components/GoogleAuthButton";

export default function CorporateLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(""); // staff ID or email
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
    // The credentials provider takes "email" — we forward the staff
    // ID via that same field; the auth callback in lib/auth.ts
    // resolves either format (email or EMP-XXXX-NNNN / STF-NNNNN)
    // via findUserByEmployeeCode.
    const result = await signIn("credentials", { email: identifier, password, totp, redirect: false });
    setBusy(false);
    if (result?.error) {
      if (result.error.includes("2fa_required")) {
        setNeed2fa(true);
        setError(null);
        return;
      }
      setError(
        result.error.includes("banned") ? "Account deactivated. Contact your Hospital Admin."
        : result.error.includes("locked") ? "Account temporarily locked — too many concurrent sessions. Contact your Hospital Admin."
        : result.error.includes("tenant_suspended") || result.error.includes("suspended") ? "Your hospital's OduDoc subscription is inactive."
        : result.error.includes("2FA") ? "Incorrect 2FA code. Check your authenticator app."
        : "Incorrect Staff ID/email or password."
      );
      return;
    }
    router.push("/admin");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <main className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <Link href="/login" className="text-xs font-semibold text-[#854D0E] hover:underline">
          ← Back to login options
        </Link>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">Corporate login</h1>
        <p className="mt-2 text-sm text-gray-600">
          For hospital, lab, pharmacy, pharma, insurance and education
          staff. No self-registration — your Hospital Admin issues your
          Staff ID + initial password.
        </p>

        <div className="mt-6">
          <GoogleAuthButton
            callbackUrl="/admin"
            label="Continue with Google (work email)"
          />
          <AuthDivider text="or use Staff ID + password" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Staff ID or work email</span>
            <input
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="STF-00847 or you@hospital.com"
              autoFocus
              autoComplete="username"
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-[#854D0E] focus:outline-none focus:ring-2 focus:ring-[#854D0E]/20"
            />
          </label>
          <label className="block">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Password</span>
              <Link href="/auth/forgot-password" className="text-xs font-semibold text-[#854D0E] hover:underline">
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
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 pr-12 text-sm focus:border-[#854D0E] focus:outline-none focus:ring-2 focus:ring-[#854D0E]/20"
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
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-center text-lg font-mono tracking-widest focus:border-[#854D0E] focus:outline-none focus:ring-2 focus:ring-[#854D0E]/20"
              />
            </label>
          )}
          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}
          <button
            type="submit"
            disabled={busy || !identifier || !password || (need2fa && totp.length !== 6)}
            className="w-full rounded-xl bg-[#854D0E] px-4 py-3 text-sm font-bold text-white hover:bg-[#5C3209] disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Log in"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          New hospital signing up?{" "}
          <Link href="/corporate" className="font-semibold text-[#854D0E] hover:underline">
            Onboard your hospital →
          </Link>
        </p>
      </main>
    </div>
  );
}
