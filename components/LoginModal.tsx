"use client";

// Two-door login modal — universal entry point per spec
// (v6.3 Section 57.5, Header_Footer_Final, Cowork_Complete Section 5.1).
// Opens from any "Log in" button on the public site. Shows two doors
// (User · Corporate); both end up at the existing NextAuth signIn().
// The "Corporate" door is the same auth flow today; the door selector
// is forward-compatible — once /clinic/<id>/login and corporate SSO
// land, the two doors route to different backends.

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

type Door = "user" | "corporate" | null;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function LoginModal({ open, onClose }: Props) {
  const [door, setDoor] = useState<Door>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setDoor(null);
      setEmail("");
      setPassword("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password.");
      } else if (result?.ok) {
        onClose();
        // Spec: User door → /dashboard; Corporate door → /dashboard
        // (server-side role routing inside picks the right surface).
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          aria-label="Close"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {door === null ? (
          // ── Step 1: Door selector ─────────────────────────────
          <div className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Are you signing in as a user or as an organisation?
            </p>

            <div className="mt-6 grid gap-3">
              <DoorCard
                emoji="👤"
                title="User"
                body="Patients, doctors, and family accounts."
                gradient="from-emerald-400 to-teal-600"
                onClick={() => setDoor("user")}
              />
              <DoorCard
                emoji="🏢"
                title="Corporate"
                body="Hospitals, clinics, labs, pharmacies, pharma, insurance."
                gradient="from-amber-400 to-rose-500"
                onClick={() => setDoor("corporate")}
              />
            </div>

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No account yet?{" "}
              <Link href="/signup" onClick={onClose} className="font-semibold text-emerald-600 hover:underline">
                Get started
              </Link>
            </p>
          </div>
        ) : (
          // ── Step 2: Email + password ──────────────────────────
          <div className="p-8">
            <button
              onClick={() => setDoor(null)}
              className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
            >
              ← Back
            </button>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Sign in as a {door === "user" ? "User" : "Corporate"}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {door === "user"
                ? "Patients · doctors · family accounts"
                : "Hospitals · clinics · labs · pharmacies"}
            </p>

            {/* Google sign-in — available on both doors */}
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <svg viewBox="0 0 18 18" className="h-4 w-4">
                <path fill="#4285F4" d="M16.51 8.18c0-.56-.05-1.1-.14-1.62H9v3.07h4.21c-.18.97-.74 1.79-1.57 2.34v1.93h2.54c1.49-1.37 2.34-3.39 2.34-5.72z" />
                <path fill="#34A853" d="M9 17c2.13 0 3.91-.71 5.21-1.92l-2.54-1.97c-.71.48-1.61.76-2.67.76-2.05 0-3.79-1.39-4.41-3.25H1.96v2.05A8 8 0 0 0 9 17z" />
                <path fill="#FBBC05" d="M4.59 10.62A4.83 4.83 0 0 1 4.34 9c0-.56.1-1.11.25-1.62V5.33H1.96A8 8 0 0 0 1 9c0 1.29.31 2.5.96 3.67l2.63-2.05z" />
                <path fill="#EA4335" d="M9 3.58c1.16 0 2.2.4 3.02 1.18l2.26-2.26C12.91 1.21 11.13.5 9 .5A8 8 0 0 0 1.96 5.33L4.59 7.4C5.21 5.53 6.95 3.58 9 3.58z" />
              </svg>
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              or sign in with email
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
                  <Link
                    href="/auth/forgot-password"
                    onClick={onClose}
                    className="text-xs font-semibold text-emerald-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                {busy ? "Signing in…" : "Sign in →"}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
              No account yet?{" "}
              <Link href="/signup" onClick={onClose} className="font-semibold text-emerald-600 hover:underline">
                Get started
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DoorCard({
  emoji, title, body, gradient, onClick,
}: {
  emoji: string;
  title: string;
  body: string;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-4 rounded-2xl border-2 border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-2xl shadow-md`}>
        {emoji}
      </span>
      <div className="flex-1">
        <p className="font-bold text-slate-900 dark:text-slate-100">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{body}</p>
      </div>
      <span className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600">→</span>
    </button>
  );
}
