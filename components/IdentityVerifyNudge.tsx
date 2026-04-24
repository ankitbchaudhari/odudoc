"use client";

// Soft-gate banner shown above the consult waiting room. Checks the
// signed-in user's identity status and — if they're not yet verified —
// nudges them toward the profile page. Never blocks; per product
// decision, unverified users can still start the call. If the user is
// already verified this renders nothing.
//
// Uses a small localStorage flag so a user who clicks "dismiss" won't
// see it again on the same browser for 24h.

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISS_KEY = "odudoc:identity-nudge:dismissedAt";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

type Status = "unverified" | "pending" | "verified" | "rejected";

export default function IdentityVerifyNudge() {
  const [status, setStatus] = useState<Status | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Respect a recent dismissal.
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw && Date.now() - Number(raw) < DISMISS_TTL_MS) {
        setDismissed(true);
        return;
      }
    } catch {
      /* ignore */
    }
    fetch("/api/identity/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { status?: Status } | null) => {
        if (data?.status) setStatus(data.status);
      })
      .catch(() => {
        /* silently give up — not a critical UX path */
      });
  }, []);

  if (dismissed) return null;
  if (!status || status === "verified") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const [tone, title, body] =
    status === "pending"
      ? [
          "bg-amber-50 border-amber-200 text-amber-900",
          "Your identity is being reviewed",
          "You can still join this consultation. The verified badge will appear on your profile once an admin approves your ID (usually within a business day).",
        ]
      : status === "rejected"
      ? [
          "bg-red-50 border-red-200 text-red-900",
          "Identity verification needs attention",
          "Your previous ID submission was rejected. You can still join this consultation, but please re-upload a valid ID from your profile so your account can be verified.",
        ]
      : [
          "bg-blue-50 border-blue-200 text-blue-900",
          "Verify your identity",
          "Upload a government-issued photo ID from your profile to get a verified badge. Not required to join this consultation, but it strengthens your account.",
        ];

  return (
    <div className={`mx-auto mt-4 max-w-3xl rounded-lg border p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm">{body}</p>
          {status !== "pending" && (
            <Link
              href="/profile"
              className="mt-2 inline-block text-sm font-semibold underline"
            >
              Go to profile →
            </Link>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-lg leading-none opacity-60 hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  );
}
