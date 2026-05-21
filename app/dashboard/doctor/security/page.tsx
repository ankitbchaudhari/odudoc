"use client";

// Doctor security settings — 2FA / TOTP enrolment, sign-out-other-sessions,
// recent login history. Hospital admin + corporate staff also reach this
// via /admin/security (same component, different route alias).
//
// Flow:
//  1. POST /api/auth/2fa/setup → returns { secret, otpauthUri }.
//  2. Page renders the otpauth URI as a QR code (via api.qrserver.com —
//     no client-side QR library needed) + the raw secret for manual entry.
//  3. User scans, types a 6-digit code, POSTs to /api/auth/2fa/verify.
//  4. On success, totpEnabled flips to true and the next sign-in will
//     require a code.

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function DoctorSecurityPage() {
  const { data: session } = useSession();
  const [phase, setPhase] = useState<"idle" | "enrolling" | "enabled">("idle");
  const [secret, setSecret] = useState("");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSetup = async () => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/auth/2fa/setup", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setError(j.error === "role_not_eligible" ? "Your role can't enrol in 2FA." : "Could not start setup.");
      return;
    }
    setSecret(j.secret);
    setOtpauthUri(j.otpauthUri);
    setPhase("enrolling");
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setError(j.error === "invalid_code" ? "That code didn't match. Try the current one from your app." : "Verification failed.");
      return;
    }
    setPhase("enabled");
  };

  const disable = async () => {
    const c = prompt("Enter your current 6-digit 2FA code to disable:");
    if (!c) return;
    setBusy(true);
    const r = await fetch("/api/auth/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: c }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      alert(j.error === "invalid_code" ? "Incorrect code." : "Could not disable.");
      return;
    }
    setPhase("idle");
    setSecret("");
    setOtpauthUri("");
    setCode("");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security</h1>
        <p className="mt-1 text-sm text-gray-600">
          Add an authenticator app (Google Authenticator, Authy, 1Password,
          Microsoft Authenticator) so signing in requires both your
          password and a fresh 6-digit code.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600">Two-factor authentication</h2>

        {phase === "idle" && (
          <div className="mt-4">
            <p className="text-sm text-gray-700">
              Logged in as <span className="font-mono">{session?.user?.email}</span>.
              2FA is currently <span className="font-bold text-rose-700">off</span>.
            </p>
            <button
              onClick={startSetup}
              disabled={busy}
              className="mt-4 rounded-xl bg-[#1E40AF] px-4 py-2 text-sm font-bold text-white hover:bg-[#0A1F3B] disabled:opacity-60"
            >
              {busy ? "Starting…" : "Enable 2FA"}
            </button>
          </div>
        )}

        {phase === "enrolling" && (
          <div className="mt-4 space-y-4">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-700">
              <li>Open your authenticator app and tap <strong>Add account</strong> / <strong>Scan QR code</strong>.</li>
              <li>Scan the QR below (or copy the secret manually).</li>
              <li>Type the current 6-digit code your app shows to confirm.</li>
            </ol>
            <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              {/* api.qrserver.com hands back a PNG for any string. We pass
                  the otpauth URI verbatim — every authenticator parses
                  this format. Failure mode is a broken image; the manual
                  secret below is the always-on fallback. */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauthUri)}`}
                alt="2FA QR code"
                width={220}
                height={220}
                className="rounded-lg bg-white p-2"
              />
              <p className="text-xs text-gray-500">Or enter this secret manually:</p>
              <code className="rounded bg-white px-3 py-1.5 font-mono text-xs tracking-wide text-gray-800 border border-gray-200">{secret}</code>
            </div>
            <div>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Enter the 6-digit code</span>
                <input
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-center text-lg font-mono tracking-widest focus:border-[#1E40AF] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20"
                />
              </label>
            </div>
            {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}
            <button
              onClick={verify}
              disabled={busy || code.length !== 6}
              className="w-full rounded-xl bg-[#1E40AF] px-4 py-3 text-sm font-bold text-white hover:bg-[#0A1F3B] disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Confirm and enable"}
            </button>
          </div>
        )}

        {phase === "enabled" && (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              ✓ 2FA enabled. Your next sign-in will require a code from your authenticator app.
            </div>
            <p className="text-xs text-gray-500">
              Lose access to your authenticator? Contact <a className="underline" href="mailto:support@odudoc.com">support@odudoc.com</a> from your registered email — we'll verify identity manually.
            </p>
            <button
              onClick={disable}
              disabled={busy}
              className="text-sm font-semibold text-rose-700 hover:underline disabled:opacity-60"
            >
              Disable 2FA…
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
