"use client";

// "Connect your ABHA" card — patient-side, India-only.
//
// Visible on /profile only when the signed-in user has country=IN
// (or a +91 phone). Lets a patient paste their 14-digit ABHA
// number and have it linked to their OduDoc account. Phase 1
// stub: link is saved but server-side validation against NHA only
// activates once admin pastes ABDM credentials at /admin/abdm.

import { useEffect, useState } from "react";

interface MeView {
  country?: string;
  phone?: string;
  abhaId?: string;
  abhaAddress?: string;
  abhaLinkedAt?: string;
}

export default function AbhaCard() {
  const [me, setMe] = useState<MeView | null>(null);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<
    { kind: "ok" | "err"; text: string; sandboxMode?: boolean } | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const u = data?.user || data;
        setMe(u);
        // India-only gate. Phone fallback for older accounts.
        const country = (u?.country || "").toLowerCase();
        const phone = (u?.phone || "").replace(/[^\d+]/g, "");
        const isIN =
          country === "in" ||
          country === "india" ||
          /^\+?91\d{10}$/.test(phone);
        setShow(!!isIN);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    if (!/^\d{2}-?\d{4}-?\d{4}-?\d{4}$/.test(draft.trim())) {
      setMessage({
        kind: "err",
        text:
          "Enter a 14-digit ABHA number (with or without dashes). Get one at healthid.ndhm.gov.in if you don't have it yet.",
      });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/abdm/abha/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ abhaNumber: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not link ABHA");
      setMe((prev) => ({
        ...(prev || {}),
        abhaId: data.abhaId,
        abhaLinkedAt: new Date().toISOString(),
      }));
      setDraft("");
      setMessage({
        kind: "ok",
        text: data.message || "ABHA linked successfully.",
        sandboxMode: data.sandboxMode,
      });
    } catch (err) {
      setMessage({
        kind: "err",
        text: err instanceof Error ? err.message : "Could not link ABHA",
      });
    } finally {
      setSaving(false);
    }
  }

  async function unlink() {
    if (!confirm("Remove the ABHA link from this account?")) return;
    setSaving(true);
    try {
      await fetch("/api/abdm/abha/connect", { method: "DELETE" });
      setMe((prev) => ({ ...(prev || {}), abhaId: undefined, abhaLinkedAt: undefined }));
      setMessage({ kind: "ok", text: "ABHA unlinked." });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !show) return null;

  const linked = !!me?.abhaId;

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 shadow-sm">
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md">
            <span className="text-lg">🇮🇳</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
              ABDM · National Digital Health Mission
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
              {linked
                ? "ABHA Health ID linked"
                : "Connect your ABHA Health ID"}
            </p>
            <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
              {linked ? (
                <>
                  Your records on OduDoc are tagged with{" "}
                  <code className="font-mono">{formatAbha(me!.abhaId!)}</code>.
                  Doctors will see this on every consultation. You can pull
                  these records into any ABDM-compatible app like Aarogya
                  Setu or eka.care.
                </>
              ) : (
                <>
                  Linking your ABHA lets OduDoc share consultation summaries
                  and prescriptions with your national health record so any
                  ABDM-compatible app can access them with your consent.
                  Don&apos;t have one? Create one free at{" "}
                  <a
                    href="https://healthid.ndhm.gov.in/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    healthid.ndhm.gov.in
                  </a>
                  .
                </>
              )}
            </p>
          </div>
        </div>

        {linked ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              ✓ Linked
              {me?.abhaLinkedAt
                ? ` · ${new Date(me.abhaLinkedAt).toLocaleDateString()}`
                : ""}
            </span>
            <button
              onClick={unlink}
              disabled={saving}
              className="rounded-lg px-3 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              Unlink
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="14-digit ABHA number"
              className="min-w-[200px] flex-1 rounded-xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-sm tracking-widest outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
            />
            <button
              onClick={submit}
              disabled={saving || !draft.trim()}
              className="rounded-xl bg-gradient-to-r from-orange-600 to-rose-600 px-5 py-2 text-sm font-semibold text-white shadow disabled:opacity-50"
            >
              {saving ? "Linking…" : "Link ABHA"}
            </button>
          </div>
        )}

        {message && (
          <p
            className={`mt-2 text-xs ${
              message.kind === "ok" ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {message.text}
            {message.sandboxMode && (
              <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                Sandbox mode
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function formatAbha(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 14) return raw;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}-${digits.slice(10)}`;
}
