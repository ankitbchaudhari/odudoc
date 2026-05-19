"use client";

// Family collaboration access management.
//
// Owner picks a dependent, invites a collaborator at one of three
// levels (primary / caregiver / observer), revokes any time.
// Collaborator sees their pending invites here and accepts them.

import { useCallback, useEffect, useState } from "react";

type Level = "primary" | "caregiver" | "observer";

interface Access {
  id: string;
  ownerEmail: string;
  dependentId: string;
  collaboratorEmail: string;
  collaboratorLabel?: string;
  level: Level;
  invitedAt: string;
  acceptedAt?: string;
  revokedAt?: string;
}

interface Dependent { id: string; name: string }

const LEVEL_TONE: Record<Level, string> = {
  primary:   "bg-emerald-100 text-emerald-800",
  caregiver: "bg-sky-100 text-sky-800",
  observer:  "bg-slate-100 text-slate-700",
};

const LEVEL_DESC: Record<Level, string> = {
  primary:   "Full edit + consent + collab management",
  caregiver: "Book appointments + add vitals (no consent)",
  observer:  "View-only — no booking, no edits",
};

export default function FamilyAccessPage() {
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [selectedDependent, setSelectedDependent] = useState<string>("");
  const [accesses, setAccesses] = useState<Access[]>([]);
  const [invites, setInvites] = useState<Access[]>([]);
  const [busy, setBusy] = useState(false);

  // Load dependents — pulls from the existing family store endpoint.
  useEffect(() => {
    fetch("/api/family", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : { dependents: [] })
      .then((j) => {
        const list: Dependent[] = (j.dependents || []).map((d: { id: string; name: string }) => ({ id: d.id, name: d.name }));
        setDependents(list);
        if (list.length && !selectedDependent) setSelectedDependent(list[0].id);
      })
      .catch(() => {});
    // Pending invites for me as collaborator.
    fetch("/api/family-access", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setInvites(j.pendingInvites || []))
      .catch(() => {});
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const loadAccesses = useCallback(async () => {
    if (!selectedDependent) return;
    const r = await fetch(`/api/family-access?dependentId=${encodeURIComponent(selectedDependent)}`, { cache: "no-store" });
    const j = await r.json();
    setAccesses(j.accesses || []);
  }, [selectedDependent]);
  useEffect(() => { loadAccesses(); }, [loadAccesses]);

  const invite = async () => {
    if (!selectedDependent) return;
    const email = prompt("Collaborator email?");
    if (!email) return;
    const level = (prompt("Permission level — primary / caregiver / observer?", "caregiver") || "caregiver").toLowerCase();
    if (!["primary", "caregiver", "observer"].includes(level)) { alert("Invalid level"); return; }
    const label = prompt("Label (e.g. 'Aunty Reena')?") || undefined;
    setBusy(true);
    try {
      const r = await fetch("/api/family-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dependentId: selectedDependent, collaboratorEmail: email, collaboratorLabel: label, level }),
      });
      if (!r.ok) {
        const j = await r.json();
        alert(j.error || "Failed");
        return;
      }
      loadAccesses();
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this access? The collaborator will lose visibility immediately.")) return;
    await fetch(`/api/family-access?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    loadAccesses();
  };

  const accept = async (id: string) => {
    await fetch(`/api/family-access?id=${encodeURIComponent(id)}`, { method: "PATCH" });
    setInvites((cur) => cur.filter((i) => i.id !== id));
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-600">Family · Collaboration</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Manage care collaborators</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Invite the other parent, a caregiver, or a relative to help manage a dependent&apos;s care. Each
        collaborator gets one of three permission levels.
      </p>

      {invites.length > 0 && (
        <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-700 dark:bg-violet-950/30">
          <p className="text-sm font-bold text-violet-900 dark:text-violet-100">
            You have {invites.length} pending invite{invites.length === 1 ? "" : "s"}
          </p>
          <ul className="mt-2 space-y-2">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm dark:bg-slate-900">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {i.ownerEmail} invited you as <strong>{i.level}</strong>
                  </p>
                  <p className="text-xs text-slate-500">Sent {new Date(i.invitedAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => accept(i.id)} className="rounded-md bg-violet-600 px-3 py-1 text-xs font-bold text-white">
                  Accept
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Dependent</p>
            <select
              value={selectedDependent}
              onChange={(e) => setSelectedDependent(e.target.value)}
              className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              disabled={dependents.length === 0}
            >
              {dependents.length === 0 ? (
                <option value="">No dependents — add one first in /dashboard/family</option>
              ) : (
                dependents.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)
              )}
            </select>
          </div>
          {selectedDependent && (
            <button
              onClick={invite}
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow"
            >
              + Invite collaborator
            </button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {!selectedDependent ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              Add a dependent first to manage collaborators.
            </p>
          ) : accesses.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              No collaborators on this dependent. Use the button above to invite the other parent or a caregiver.
            </p>
          ) : (
            accesses.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {a.collaboratorLabel || a.collaboratorEmail}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${LEVEL_TONE[a.level]}`}>
                      {a.level}
                    </span>
                    {!a.acceptedAt && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                        Pending acceptance
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{LEVEL_DESC[a.level]}</p>
                  <p className="text-[11px] text-slate-500">
                    {a.collaboratorEmail} · Invited {new Date(a.invitedAt).toLocaleDateString()}
                    {a.acceptedAt && <> · Accepted {new Date(a.acceptedAt).toLocaleDateString()}</>}
                  </p>
                </div>
                <button
                  onClick={() => revoke(a.id)}
                  className="rounded-md bg-rose-600 px-3 py-1 text-xs font-bold text-white"
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
