"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface OrgOption {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface ContextResponse {
  activeOrg: { id: string; name: string; plan: string } | null;
  role: string | null;
  isSuperAdmin: boolean;
  orgs: OrgOption[];
}

export default function OrgSwitcher() {
  const [ctx, setCtx] = useState<ContextResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  async function load() {
    try {
      const res = await fetch("/api/tenant/context", { cache: "no-store" });
      if (!res.ok) return;
      setCtx(await res.json());
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function switchTo(orgId: string | null) {
    setBusy(true);
    try {
      await fetch("/api/tenant/switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      await load();
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!ctx) return null;

  const label = ctx.activeOrg ? ctx.activeOrg.name : "No org selected";

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
        title="Switch organization"
      >
        <svg
          className="h-4 w-4 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <span className="max-w-[160px] truncate">{label}</span>
        {ctx.isSuperAdmin && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-amber-800">
            super
          </span>
        )}
        <svg
          className="h-3.5 w-3.5 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 px-4 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Active organization
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {ctx.orgs.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                No organizations available.
                {ctx.isSuperAdmin && (
                  <>
                    <br />
                    <a
                      href="/admin/organizations"
                      className="mt-2 inline-block text-primary-600 hover:underline"
                    >
                      Create one →
                    </a>
                  </>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => switchTo(null)}
                  disabled={busy || !ctx.activeOrg}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                    !ctx.activeOrg ? "bg-slate-50 font-semibold" : ""
                  }`}
                >
                  <span className="text-slate-600">— None (clear)</span>
                  {!ctx.activeOrg && (
                    <span className="text-[11px] text-primary-600">active</span>
                  )}
                </button>
                {ctx.orgs.map((o) => {
                  const active = ctx.activeOrg?.id === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => switchTo(o.id)}
                      disabled={busy}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        active ? "bg-primary-50/50" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div
                          className={`truncate text-[13px] ${
                            active ? "font-semibold text-primary-700" : "text-slate-800"
                          }`}
                        >
                          {o.name}
                        </div>
                        <div className="truncate text-[11px] text-slate-500">
                          {o.slug} · {o.plan}
                        </div>
                      </div>
                      {active && (
                        <svg
                          className="h-4 w-4 flex-shrink-0 text-primary-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>
          {ctx.isSuperAdmin && (
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-2">
              <a
                href="/admin/organizations"
                className="text-[11.5px] font-medium text-primary-600 hover:underline"
              >
                Manage organizations →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
