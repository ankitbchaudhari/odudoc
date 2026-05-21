"use client";

// /login/patient — phone-or-email → OTP → /dashboard
//
// Step 1: enter identifier, click "Send code"
// Step 2: 6 separate digit boxes, auto-advance, auto-submit
// Step 3: success → POST credentials to NextAuth's /api/auth/callback
//         to mint a session cookie, then redirect to /dashboard

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Logo from "@/components/Logo";

export default function PatientLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState("");
  const [masked, setMasked] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // 60-second resend cooldown countdown
  useEffect(() => {
    if (step !== 2 || resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [step, resendIn]);

  const requestOtp = async (resend = false) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/auth/patient/request-otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    setBusy(false);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(
        j.error === "phone_otp_not_yet_supported" ? j.message
        : j.error === "wrong_role_for_otp" ? "This account uses email + password — pick Doctor or Corporate."
        : j.error === "cooldown" ? "Please wait a moment before requesting another code."
        : j.error === "account_banned" ? "This account has been deactivated."
        : "Couldn't send the code. Please try again."
      );
      return;
    }
    setMasked(j.maskedIdentifier);
    setStep(2);
    setResendIn(60);
    if (!resend) {
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => inputs.current[0]?.focus(), 100);
    }
  };

  const handleOtpChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
    if (digit && i === 5 && next.every((d) => d)) {
      void verifyOtp(next.join(""));
    }
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      e.preventDefault();
      const next = text.split("");
      setOtp(next);
      void verifyOtp(text);
    }
  };

  const verifyOtp = async (code: string) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/auth/patient/verify-otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, otp: code }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setBusy(false);
      setError(
        j.error === "expired" ? "Code expired. Tap Resend to get a new one."
        : j.error === "too_many_attempts" ? "Too many wrong codes. Try again in 10 minutes."
        : j.error === "invalid_code" ? "Incorrect code. Check the digits and try again."
        : "Couldn't verify the code. Please try again."
      );
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
      return;
    }
    // OTP verified — now exchange for a NextAuth session so the web
    // dashboard works. Pass the autoLoginToken as the credentials
    // password — the credentials provider recognises it as an OTP-
    // success token rather than a password.
    const result = await signIn("credentials", {
      email: identifier,
      password: `OTP:${j.autoLoginToken}`,
      redirect: false,
    });
    setBusy(false);
    if (result?.error) {
      setError("Verified, but session creation failed. Try password sign-in.");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo size="sm" />
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <Link href="/login" className="text-xs font-semibold text-[#0F6E56] hover:underline">
          ← Back to login options
        </Link>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
          {step === 1 ? "Patient login" : "Enter the code"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {step === 1
            ? "Enter your registered email. We'll send a 6-digit code."
            : <>We sent a 6-digit code to <strong>{masked}</strong>.</>
          }
        </p>

        {step === 1 ? (
          <form
            onSubmit={(e) => { e.preventDefault(); void requestOtp(); }}
            className="mt-6 space-y-4"
          >
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Email</span>
              <input
                type="email"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
              />
            </label>
            <p className="text-[11px] text-gray-500">
              Phone-OTP login is on its way. For now, use your registered email.
            </p>
            {error && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>
            )}
            <button
              type="submit"
              disabled={busy || !identifier.includes("@")}
              className="w-full rounded-xl bg-[#0F6E56] px-4 py-3 text-sm font-bold text-white hover:bg-[#0A5942] disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between gap-2">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="\d{1}"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  className="h-14 w-12 rounded-xl border border-gray-300 text-center text-2xl font-bold text-gray-900 focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                />
              ))}
            </div>
            {busy && otp.every((d) => d) && (
              <p className="text-center text-xs text-gray-500">Verifying…</p>
            )}
            {error && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>
            )}
            <button
              type="button"
              onClick={() => requestOtp(true)}
              disabled={busy || resendIn > 0}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setError(null); }}
              className="block w-full text-center text-xs font-semibold text-gray-500 hover:text-gray-700"
            >
              Change email
            </button>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-gray-600">
          No account yet?{" "}
          <Link href="/signup" className="font-semibold text-[#0F6E56] hover:underline">
            Get started →
          </Link>
        </p>
      </main>
    </div>
  );
}
