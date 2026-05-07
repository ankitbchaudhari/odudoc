"use client";

// Admin verification queue. Lists doctors filtered by their
// verification state (pending / verified / rejected / all). Each
// card shows the four documents the doctor uploaded as inline
// previews + Approve / Request reverification buttons.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface DoctorRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialty?: string;
  country?: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationSubmittedAt?: string;
  verificationDocs?: {
    idFrontUrl?: string;
    idBackUrl?: string;
    selfieUrl?: string;
    licenseUrl?: string;
  };
  verificationRejectionReason?: string;
  verificationRequestedAt?: string;
  verificationRequestedBy?: string;
  licenseCountry?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  hprId?: string;
  hprVerifiedAt?: string;
  hfrId?: string;
  joinedAt: string;
}

type State = "pending" | "verified" | "rejected" | "all";

const TABS: Array<{ key: State; label: string }> = [
  { key: "pending", label: "Pending review" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

export default function AdminVerificationsPage() {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [counts, setCounts] = useState<Record<State, number>>({
    pending: 0,
    verified: 0,
    rejected: 0,
    all: 0,
  });
  const [state, setState] = useState<State>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<DoctorRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/doctors/verifications?state=${state}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not load");
      }
      const data = await res.json();
      setDoctors(data.doctors || []);
      setCounts(data.counts || { pending: 0, verified: 0, rejected: 0, all: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [state]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(d: DoctorRow) {
    if (!confirm(`Approve ${d.name}? They'll get an email and the dashboard activates immediately.`)) {
      return;
    }
    setBusyId(d.id);
    try {
      const res = await fetch(`/api/admin/doctors/${d.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verified: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Update failed");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  async function unverify(d: DoctorRow) {
    if (!confirm(`Revoke ${d.name}'s verified status? Their dashboard will be gated again.`)) {
      return;
    }
    setBusyId(d.id);
    try {
      const res = await fetch(`/api/admin/doctors/${d.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verified: false }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Update failed");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function requestVerification(d: DoctorRow) {
    const note = window.prompt(
      `Send a verification reminder to ${d.name} at ${d.email}?\n\n` +
        `Optional note for the doctor (e.g. "We need a clearer scan of your license"). Leave blank to send the standard email.`,
      "",
    );
    if (note === null) return; // cancelled
    setBusyId(d.id);
    try {
      const res = await fetch(
        `/api/admin/doctors/${d.id}/request-verification`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ note: note.trim() || undefined }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not send the email");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusyId(null);
    }
  }

  async function submitReject() {
    if (!rejectFor) return;
    if (rejectReason.trim().length < 3) {
      setError("Please write a reason — the doctor sees this on their gate.");
      return;
    }
    setBusyId(rejectFor.id);
    try {
      const res = await fetch(`/api/admin/doctors/${rejectFor.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rejectVerification: { reason: rejectReason.trim() } }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Reject failed");
      }
      setRejectFor(null);
      setRejectReason("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
            Compliance · Doctor verifications
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Doctor verification queue
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review submitted ID + selfie + license documents. Approve to
            activate the doctor&apos;s dashboard, or send back with a reason
            and they&apos;ll be prompted to resubmit.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        {TABS.map((t) => {
          const active = state === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setState(t.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  active ? "bg-white/25" : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[t.key] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-base font-semibold text-slate-800">
            {state === "pending"
              ? "Inbox zero — no doctors waiting for review."
              : `No doctors in the ${state} state.`}
          </p>
          {state === "pending" && counts.all > counts.verified && (
            <>
              <p className="mt-2 text-sm text-slate-600">
                {counts.all - counts.verified} doctor
                {counts.all - counts.verified === 1 ? "" : "s"} on the platform
                {" "}haven&apos;t uploaded documents yet. You can{" "}
                <b>Manual-verify</b> them for demo / staff use, or{" "}
                <b>Request verification</b> to email them an upload link.
              </p>
              <button
                onClick={() => setState("all")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
              >
                Show all {counts.all} doctors →
              </button>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-4">
          {doctors.map((d) => (
            <DoctorCard
              key={d.id}
              doctor={d}
              busy={busyId === d.id}
              onApprove={() => approve(d)}
              onReject={() => setRejectFor(d)}
              onUnverify={() => unverify(d)}
              onRequest={() => requestVerification(d)}
            />
          ))}
        </ul>
      )}

      {rejectFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          onClick={() => setRejectFor(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                Request reverification
              </p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">
                Send {rejectFor.name} back with a reason
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                The doctor sees this verbatim on their gate and gets an email.
                Be specific so they know what to upload differently.
              </p>
            </div>
            <div className="px-6 py-5">
              <label className="block text-xs font-semibold text-slate-700">
                Reason
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="e.g. The selfie is too dark to confirm the ID matches your face — please retake in good lighting."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15"
              />
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setRejectFor(null);
                    setRejectReason("");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReject}
                  disabled={busyId === rejectFor.id || rejectReason.trim().length < 3}
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 disabled:opacity-50"
                >
                  {busyId === rejectFor.id ? "Sending…" : "Send back for resubmission"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function relativeTime(iso?: string): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function DoctorCard({
  doctor: d,
  busy,
  onApprove,
  onReject,
  onUnverify,
  onRequest,
}: {
  doctor: DoctorRow;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onUnverify: () => void;
  onRequest: () => void;
}) {
  const submitted = !!d.verificationSubmittedAt;
  const isPending = submitted && !d.verified;
  const isRejected = !submitted && !d.verified && !!d.verificationRejectionReason;
  const tone = d.verified
    ? "border-emerald-200 bg-emerald-50/30"
    : isPending
      ? "border-amber-200 bg-amber-50/30"
      : isRejected
        ? "border-rose-200 bg-rose-50/30"
        : "border-slate-200 bg-white";
  const statusLabel = d.verified
    ? "Verified"
    : isPending
      ? "Awaiting review"
      : isRejected
        ? "Rejected"
        : "Not submitted";
  const statusTone = d.verified
    ? "bg-emerald-100 text-emerald-800"
    : isPending
      ? "bg-amber-100 text-amber-800"
      : isRejected
        ? "bg-rose-100 text-rose-800"
        : "bg-slate-100 text-slate-700";
  return (
    <li className={`overflow-hidden rounded-3xl border ${tone} shadow-sm`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">{d.name}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusTone}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {d.email}
            {d.phone ? ` · ${d.phone}` : ""}
            {d.specialty ? ` · ${d.specialty}` : ""}
            {d.country ? ` · ${d.country}` : ""}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {isPending && d.verificationSubmittedAt
              ? `Submitted ${new Date(d.verificationSubmittedAt).toLocaleString()}`
              : d.verified && d.verifiedAt
                ? `Verified ${new Date(d.verifiedAt).toLocaleDateString()}${d.verifiedBy ? ` by ${d.verifiedBy}` : ""}`
                : `Account created ${new Date(d.joinedAt).toLocaleDateString()}`}
          </p>
          {!submitted && !d.verified && d.verificationRequestedAt && (
            <p className="mt-0.5 text-[11px] font-medium text-sky-700">
              Verification email sent {relativeTime(d.verificationRequestedAt)}
              {d.verificationRequestedBy ? ` by ${d.verificationRequestedBy}` : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {!submitted && !d.verified && (
            <button
              onClick={onRequest}
              disabled={busy}
              className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
              title="Email the doctor a reminder to upload their verification documents"
            >
              {busy ? "…" : d.verificationRequestedAt ? "↻ Resend request" : "✉ Request verification"}
            </button>
          )}
          {!d.verified && (
            <button
              onClick={onApprove}
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow disabled:opacity-50"
              title={
                submitted
                  ? "Approve this submission"
                  : "Manually verify without a submission (owner / admin override)"
              }
            >
              {busy ? "…" : submitted ? "✓ Approve" : "✓ Manual verify"}
            </button>
          )}
          {(isPending || d.verified) && (
            <button
              onClick={onReject}
              disabled={busy}
              className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              Request reverification
            </button>
          )}
          {d.verified && (
            <button
              onClick={onUnverify}
              disabled={busy}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              Revoke
            </button>
          )}
          <Link
            href={`/admin/doctors?focus=${d.id}`}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Profile
          </Link>
        </div>
      </div>

      {isRejected && d.verificationRejectionReason && (
        <div className="border-b border-slate-100 bg-rose-50/60 px-5 py-3 text-sm text-rose-800">
          <b>Last reason sent:</b> {d.verificationRejectionReason}
        </div>
      )}

      <div className="px-5 py-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">
          Submitted documents
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DocPreview label="ID front" url={d.verificationDocs?.idFrontUrl} />
          <DocPreview label="ID back" url={d.verificationDocs?.idBackUrl} optional />
          <DocPreview label="Selfie + ID" url={d.verificationDocs?.selfieUrl} />
          <DocPreview label="License" url={d.verificationDocs?.licenseUrl} />
        </div>

        {(d.licenseCountry || d.licenseNumber || d.licenseExpiry) && (
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs sm:grid-cols-3">
            <Field label="License country" value={d.licenseCountry || "—"} />
            <Field label="License number" value={d.licenseNumber || "—"} mono />
            <Field label="Expiry" value={d.licenseExpiry || "—"} />
          </div>
        )}

        {isIndianDoctor(d) && <AbdmRow doctor={d} />}
      </div>
    </li>
  );
}

function isIndianDoctor(d: DoctorRow): boolean {
  const c = (d.country || d.licenseCountry || "").toLowerCase();
  return c === "india" || c === "in" || c === "ind";
}

function AbdmRow({ doctor }: { doctor: DoctorRow }) {
  const [hpr, setHpr] = useState(doctor.hprId || "");
  const [hfr, setHfr] = useState(doctor.hfrId || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<
    { kind: "ok" | "err"; text: string; sandbox?: boolean } | null
  >(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/doctors/${doctor.id}/verify-hpr`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hprId: hpr.trim() || undefined, hfrId: hfr.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMsg({
        kind: "ok",
        text: data.message || "Saved.",
        sandbox: data.sandboxMode,
      });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-base">🇮🇳</span>
        <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
          ABDM (India) — HPR + HFR
        </p>
        {doctor.hprVerifiedAt && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            ✓ Saved {new Date(doctor.hprVerifiedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            HPR id (Healthcare Professionals Registry)
          </span>
          <input
            value={hpr}
            onChange={(e) => setHpr(e.target.value)}
            placeholder="14-digit, e.g. 12-3456-7890-1234"
            className="w-full rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 font-mono text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            HFR id (Health Facility Registry)
          </span>
          <input
            value={hfr}
            onChange={(e) => setHfr(e.target.value)}
            placeholder="Optional — clinic id"
            className="w-full rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-gradient-to-r from-orange-600 to-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save HPR / HFR"}
        </button>
        <a
          href="https://hpr.abdm.gov.in/"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-semibold text-orange-700 hover:underline"
        >
          Open HPR registry ↗
        </a>
        {msg && (
          <span
            className={`text-[11px] ${
              msg.kind === "ok" ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {msg.text}
            {msg.sandbox && (
              <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                Sandbox
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

function DocPreview({
  label,
  url,
  optional,
}: {
  label: string;
  url?: string;
  optional?: boolean;
}) {
  if (!url) {
    return (
      <div
        className={`flex h-28 flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center text-[11px] ${
          optional
            ? "border-slate-200 bg-slate-50 text-slate-400"
            : "border-rose-200 bg-rose-50 text-rose-600"
        }`}
      >
        <span className="font-semibold">{label}</span>
        <span className="mt-0.5">{optional ? "Optional" : "Not submitted"}</span>
      </div>
    );
  }
  const isPdf = /\.pdf(\?|$)/i.test(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-28 w-full overflow-hidden bg-slate-100">
        {isPdf ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-3xl">📄</span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={label}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        )}
      </div>
      <div className="border-t border-slate-100 px-2.5 py-1.5 text-[11px]">
        <p className="font-semibold text-slate-800">{label}</p>
        <p className="text-[10px] text-slate-500">{isPdf ? "PDF — click to open" : "Click to open"}</p>
      </div>
    </a>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm text-slate-800 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
