"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const password = params.get("p") || ""; // short-lived, url-only
  const emailHint = params.get("emailHint") || email;
  const phoneHint = params.get("phoneHint") || "your phone";
  const hasPhone = params.get("hasPhone") !== "false";

  const [emailCode, setEmailCode] = useState(["", "", "", "", "", ""]);
  const [phoneCode, setPhoneCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const emailRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email || !password) {
      router.push("/auth/login");
    }
  }, [email, password, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleBoxChange = (
    arr: string[],
    setArr: (a: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    idx: number,
    value: string
  ) => {
    const v = value.replace(/\D/g, "").slice(0, 1);
    const next = [...arr];
    next[idx] = v;
    setArr(next);
    if (v && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleBoxPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    setArr: (a: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;
    e.preventDefault();
    const arr = pasted.padEnd(6, "").split("").slice(0, 6);
    setArr(arr);
    const lastFilled = Math.min(pasted.length, 5);
    refs.current[lastFilled]?.focus();
  };

  const handleBoxKeyDown = (
    arr: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !arr[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const resend = async () => {
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to resend");
        return;
      }
      setInfo("New verification codes sent.");
      setResendCooldown(30);
    } catch {
      setError("Failed to resend codes.");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailStr = emailCode.join("");
    const phoneStr = hasPhone ? phoneCode.join("") : emailStr; // if no phone on file, use email code for both

    if (emailStr.length !== 6 || (hasPhone && phoneStr.length !== 6)) {
      setError("Please enter both 6-digit codes.");
      return;
    }

    setLoading(true);
    try {
      const verifyRes = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, emailCode: emailStr, phoneCode: phoneStr }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error || "Verification failed");
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        otpToken: verifyData.token,
        redirect: false,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }

      const session = await fetch("/api/auth/session").then((r) => r.json());
      if (session?.user?.role === "admin") router.push("/admin");
      else if (session?.user?.role === "doctor") router.push("/dashboard/doctor");
      else router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const OtpBoxes = ({
    arr,
    setArr,
    refs,
    label,
  }: {
    arr: string[];
    setArr: (a: string[]) => void;
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>;
    label: string;
  }) => (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-700">{label}</label>
      <div className="flex justify-between gap-2">
        {arr.map((v, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={v}
            onChange={(e) => handleBoxChange(arr, setArr, refs, i, e.target.value)}
            onKeyDown={(e) => handleBoxKeyDown(arr, refs, i, e)}
            onPaste={(e) => handleBoxPaste(e, setArr, refs)}
            inputMode="numeric"
            maxLength={1}
            className="h-12 w-full max-w-[48px] rounded-lg border border-gray-300 text-center text-lg font-semibold text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <Image src="/images/logo.svg" alt="OduDoc" width={440} height={108} className="mx-auto mb-6 h-14 w-auto" />
        <h1 className="text-2xl font-bold text-gray-900">Two-Step Verification</h1>
        <p className="mt-2 text-sm text-gray-500">
          To keep your account secure, we sent verification codes to your email and phone.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-lg">
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {info && !error && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{info}</div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <OtpBoxes arr={emailCode} setArr={setEmailCode} refs={emailRefs} label={`Email code (sent to ${emailHint})`} />
          {hasPhone && (
            <OtpBoxes arr={phoneCode} setArr={setPhoneCode} refs={phoneRefs} label={`Phone code (sent to ${phoneHint})`} />
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Verifying..." : "Verify & Sign in"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            onClick={resend}
            disabled={resendCooldown > 0}
            className="font-medium text-primary-600 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend codes"}
          </button>
          <Link href="/auth/login" className="font-medium text-gray-500 hover:text-gray-700">
            ← Back to sign in
          </Link>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        Codes expire in 10 minutes. If you didn&apos;t request this, ignore and your account remains safe.
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-gray-50 px-4 py-12">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <svg className="h-8 w-8 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        }
      >
        <VerifyForm />
      </Suspense>
    </div>
  );
}
