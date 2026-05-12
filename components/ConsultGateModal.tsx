"use client";

// Pre-consult gate. Before a visitor can start a video consultation we ask
// for their first name, last name, and phone, verify the phone with a
// 6-digit code delivered over both SMS and WhatsApp, and only then call
// /api/rooms with the server-issued consult token. This is lightweight KYC
// that keeps bots and fat-fingered callers out of the doctor's queue.
//
// Flow:
//   Step "details"  → enter name + phone, click Send code
//   Step "otp"      → enter 6-digit code, click Verify & start
//   Step "starting" → room is being created and user is being redirected

import { useEffect, useRef, useState } from "react";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase-client";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";

// Normalise whatever the user types into E.164 so Firebase can route it.
// Mirrors lib/consult-otp.ts server-side logic. We do NOT auto-prefix any
// country code — OduDoc is worldwide, so guessing "+91 because 10 digits"
// silently sent US / UK / EU numbers to the wrong country. The UI label
// and helper text tell the user to include their country code; if they
// don't, Firebase rejects with a clear error and they add the prefix.
function toE164Client(raw: string): string {
  const digits = (raw || "").replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return digits;
  return `+${digits}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  doctor: {
    id: string;
    name: string;
    specialty: string;
    fee: number;
  };
  onVerified: (args: {
    consultToken: string;
    firstName: string;
    lastName: string;
    phone: string;
  }) => Promise<void> | void;
}

type Step = "details" | "otp" | "starting";

export default function ConsultGateModal({ open, onClose, doctor, onVerified }: Props) {
  const [step, setStep] = useState<Step>("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneHint, setPhoneHint] = useState("");
  const [consultToken, setConsultToken] = useState("");
  const [channel, setChannel] = useState<string>("sms");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);

  // Firebase Phone Auth state. The invisible reCAPTCHA lives on a hidden
  // DOM node owned by the modal; Firebase mounts into it on demand and
  // the ConfirmationResult lets us finish the flow after the user enters
  // the code.
  const recaptchaContainer = useRef<HTMLDivElement>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  // Reset when the modal reopens so a second doctor doesn't inherit the
  // previous session's state.
  useEffect(() => {
    if (open) {
      setStep("details");
      setCode("");
      setError("");
      setConsultToken("");
      setChannel("sms");
      setResendIn(0);
      confirmationRef.current = null;
      // Tear down any reCAPTCHA left over from the previous session so
      // the next sendCode gets a fresh widget.
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch { /* ignore */ }
        recaptchaRef.current = null;
      }
    }
  }, [open]);

  // Resend timer countdown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Autofocus the OTP field when we enter that step.
  useEffect(() => {
    if (step === "otp") codeInput.current?.focus();
  }, [step]);

  if (!open) return null;

  async function sendCode() {
    setError("");
    if (!firstName.trim()) return setError("Please enter your first name.");
    if (!lastName.trim()) return setError("Please enter your last name.");
    if (!phone.trim()) return setError("Please enter your phone number.");
    if (!isFirebaseConfigured()) {
      return setError(
        "Phone verification isn't configured. Please contact support.",
      );
    }

    const e164 = toE164Client(phone);
    setBusy(true);
    try {
      const auth = getFirebaseAuth();

      // (Re)create the invisible reCAPTCHA. Firebase won't let us reuse a
      // verifier across sendCode calls once it's been consumed.
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch { /* ignore */ }
        recaptchaRef.current = null;
      }
      if (!recaptchaContainer.current) {
        throw new Error("reCAPTCHA container not mounted");
      }
      recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaContainer.current, {
        size: "invisible",
      });

      const confirmation = await signInWithPhoneNumber(
        auth,
        e164,
        recaptchaRef.current,
      );
      confirmationRef.current = confirmation;

      setPhoneHint(e164.replace(/\d(?=\d{4})/g, "•"));
      setChannel("sms");
      setStep("otp");
      setResendIn(30);
    } catch (err) {
      const msg = (err as { code?: string; message?: string }).code
        || (err as Error).message
        || "Could not send code. Please try again.";
      // Surface a friendlier error for the most common Firebase failures.
      if (/auth\/invalid-phone-number/.test(msg)) {
        setError("That phone number doesn't look right. Include the country code.");
      } else if (/auth\/too-many-requests/.test(msg)) {
        setError("Too many attempts from this device. Try again later.");
      } else if (/auth\/captcha-check-failed/.test(msg)) {
        setError("Anti-bot check failed. Please refresh and try again.");
      } else {
        setError("Could not send code. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndStart() {
    setError("");
    if (code.trim().length < 4) return setError("Enter the 6-digit code we sent you.");
    if (!confirmationRef.current) {
      return setError("Verification session expired. Please resend the code.");
    }
    setBusy(true);
    try {
      const credential = await confirmationRef.current.confirm(code.trim());
      const idToken = await credential.user.getIdToken(true);

      const res = await fetch("/api/consult/firebase/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, firstName, lastName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid code.");
        return;
      }
      setConsultToken(data.consultToken);
      setStep("starting");
      await onVerified({
        consultToken: data.consultToken,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      });
    } catch (err) {
      const msg = (err as { code?: string }).code || "";
      if (/auth\/invalid-verification-code/.test(msg)) {
        setError("That code doesn't match. Double-check and try again.");
      } else if (/auth\/code-expired/.test(msg)) {
        setError("That code expired. Please resend a new one.");
      } else {
        setError("Could not verify code. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Start video consultation</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              with {doctor.name} · {doctor.specialty}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:text-slate-300 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === "details" && (
          <div className="space-y-4 px-6 py-5">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              We&apos;ll send a one-time code to your phone and WhatsApp to keep your consultation secure.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">First name</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Priya"
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">Last name</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Sharma"
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">
                Phone number (with country code)
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="+1 555 000 1234"
                inputMode="tel"
                autoComplete="tel"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                Include your country code (e.g. +1, +44, +91). Code arrives via SMS and WhatsApp.
              </p>
            </div>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <button
              onClick={sendCode}
              disabled={busy}
              className="btn-primary w-full disabled:opacity-60"
            >
              {busy ? "Sending code…" : "Send verification code"}
            </button>
            <p className="text-center text-xs text-gray-400 dark:text-slate-500">
              Consultation fee ${doctor.fee} is charged only after the call starts.
            </p>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4 px-6 py-5">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              We sent a 6-digit code to <span className="font-semibold">{phoneHint}</span> via{" "}
              <span className="font-semibold">
                {channel === "whatsapp" ? "WhatsApp" : channel === "call" ? "voice call" : "SMS"}
              </span>
              .
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">Verification code</label>
              <input
                ref={codeInput}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") verifyAndStart();
                }}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-3 text-center text-xl font-semibold tracking-[0.5em] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••••"
              />
            </div>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <button
              onClick={verifyAndStart}
              disabled={busy || code.length < 4}
              className="btn-primary w-full disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Verify & start video consult"}
            </button>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
              <button
                onClick={() => {
                  setStep("details");
                  setError("");
                }}
                className="text-primary-600 hover:underline"
                disabled={busy}
              >
                ← Change number
              </button>
              <button
                onClick={sendCode}
                disabled={busy || resendIn > 0}
                className="text-primary-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 dark:text-slate-500 disabled:no-underline"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {/* Invisible reCAPTCHA mount point. Firebase renders its widget
            here when sendCode runs. Kept inside the dialog so it's
            removed from the DOM when the modal closes. */}
        <div ref={recaptchaContainer} />

        {step === "starting" && (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 dark:border-slate-800 border-t-primary-600" />
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Starting your video consultation…</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">Connecting you with {doctor.name}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
