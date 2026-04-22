"use client";

// Amber banner shown to super-admins when they've switched into another
// org's context via impersonation. One-click exit returns them to the
// global super-admin view. Silent when not impersonating, so normal
// tenant admins never see it.

import { useEffect, useState } from "react";

interface State {
  impersonating: boolean;
  org: { id: string; name: string; slug: string } | null;
}

export default function ImpersonationBanner() {
  const [state, setState] = useState<State | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/admin/super/impersonate", { cache: "no-store" });
      if (!r.ok) { setState(null); return; }
      setState(await r.json());
    } catch { setState(null); }
  }

  useEffect(() => { load(); }, []);

  if (!state?.impersonating || !state.org) return null;

  async function exit() {
    await fetch("/api/admin/super/impersonate", { method: "DELETE" });
    window.location.href = "/admin/super/orgs";
  }

  return (
    <div style={{
      background: "#fef3c7",
      borderBottom: "1px solid #fcd34d",
      padding: "10px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: 13,
      color: "#92400e",
    }}>
      <div>
        <strong>⚠ Support mode</strong> — viewing <strong>{state.org.name}</strong> as super-admin. Every action is logged in the tenant&apos;s audit trail.
      </div>
      <button
        onClick={exit}
        style={{
          background: "#92400e",
          color: "white",
          border: "none",
          padding: "6px 14px",
          borderRadius: 6,
          fontWeight: 600,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        Exit impersonation
      </button>
    </div>
  );
}
