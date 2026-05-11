"use client";

// Self-service password change page. Users land here either from a
// dashboard banner (temp password issued by an admin, expires in 3
// days) or by clicking "Change password" in their account menu.
// Everyone with a temporary password MUST set a new one before the
// TTL elapses — once it does, lib/auth.ts refuses the sign-in.

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ChangePasswordPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?reason=temp — banner copy is tuned for "your admin gave you a
  // temp password" first-login flow; otherwise we assume a routine
  // password change initiated from the account menu.
  const isTempFlow = searchParams?.get("reason") === "temp";

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/auth/login?next=${encodeURIComponent("/auth/change-password")}`);
    }
  }, [status, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (next.length < 8) {
      setErr("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setErr("The two new password fields don't match.");
      return;
    }
    if (current === next) {
      setErr("Your new password must differ from the temporary one.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.message || data.error || "Couldn't change password.");
        return;
      }
      setOk(true);
      // Redirect users to their home — staff land on /dashboard,
      // admins on /admin. Default to /dashboard which works for both
      // since /dashboard auto-routes admin sessions to /admin.
      setTimeout(() => router.replace("/dashboard"), 1400);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/30 px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl text-white shadow-lg shadow-emerald-500/30">
            🔑
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {isTempFlow ? "Set your new password" : "Change password"}
          </h1>
          {isTempFlow ? (
            <p className="mt-2 text-sm text-slate-600">
              Your account was provisioned with a temporary password. Choose a new one now — temp passwords expire after 3 days and you'll be locked out until an admin re-issues.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              Pick a strong password. We never email passwords; if you forget it, an admin will issue a new temporary one.
            </p>
          )}
          {session?.user?.email && (
            <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Signed in as {session.user.email}
            </p>
          )}
        </div>
        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
        >
          {ok && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              ✓ Password updated. Redirecting…
            </div>
          )}
          {err && !ok && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          )}
          <Field
            label={isTempFlow ? "Current (temporary) password" : "Current password"}
            value={current}
            onChange={setCurrent}
            type="password"
            autoComplete="current-password"
          />
          <Field
            label="New password"
            value={next}
            onChange={setNext}
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters. Mix letters, numbers and a symbol for strength."
          />
          <Field
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            type="password"
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={submitting || ok}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 py-3 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {submitting ? "Saving…" : ok ? "Saved" : "Update password"}
          </button>
          <p className="text-center text-[11px] text-slate-500">
            Need help? <Link href="/contact" className="font-semibold text-emerald-700 underline">Contact your admin</Link>.
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
        {label}
      </span>
      <input
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        required
      />
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </label>
  );
}
