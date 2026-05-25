"use client";

// Shared "Continue with Google" button. Used on every sign-in / sign-up
// surface so the visual treatment + NextAuth call site stay consistent.
// New Google accounts are auto-created by the signIn callback in
// lib/auth.ts (with role inferred from any matching doctor profile),
// so the same button works for both sign-in and sign-up — there's no
// separate "sign up with Google" flow to wire.

import { signIn } from "next-auth/react";

export default function GoogleAuthButton({
  callbackUrl = "/dashboard",
  label = "Continue with Google",
  className = "",
}: {
  callbackUrl?: string;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      className={
        "group flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 " +
        className
      }
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      {label}
    </button>
  );
}

// Small text-link version of the same Google sign-in trigger. Used on
// the role-picker gateway pages (/login, /signup) so the prominent
// button doesn't compete with the role-selection cards — returning
// users whose account is already Google-linked tap this to skip the
// role picker entirely. (NextAuth's signIn callback looks up the
// existing user by Google email and routes by their stored role.)
export function GoogleQuickLink({
  callbackUrl = "/dashboard",
  label = "Already signed up with Google? Quick login →",
  className = "",
}: {
  callbackUrl?: string;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      className={
        "inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200 " +
        className
      }
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      {label}
    </button>
  );
}

// A horizontal "or" divider that pairs nicely with the button above.
// Used to separate the Google block from the email/phone form below it.
export function AuthDivider({ text = "or" }: { text?: string }) {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-slate-700" />
      <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-slate-500">
        {text}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-slate-700" />
    </div>
  );
}
