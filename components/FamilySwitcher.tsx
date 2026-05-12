"use client";

// FamilySwitcher — drop-in dropdown for the patient header.
//
// Reads the active profile from /api/family/active and shows a chip
// like "👨 Booking for Aarav (child)" or "You" when the active is
// self. Clicking opens a popover listing every dependent + a "Yourself"
// option. Selecting one POSTs to /api/family/active and reloads the
// page so any data fetched server-side picks up the new cookie.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Relationship = "child" | "spouse" | "parent" | "sibling" | "grandparent" | "grandchild" | "in_law" | "ward" | "other";

interface Dependent {
  id: string; name: string; relationship: Relationship;
  medicalId: string; dateOfBirth?: string;
}
interface ActiveProfile { kind: "self" | "dependent"; dependentId?: string; dependentName?: string }

const REL_EMOJI: Record<Relationship, string> = {
  child: "🧒", spouse: "💑", parent: "👴", sibling: "👫",
  grandparent: "👵", grandchild: "👶", in_law: "👨‍👩‍👦",
  ward: "🛡️", other: "👤",
};

export default function FamilySwitcher({ className = "" }: { className?: string }) {
  const [list, setList] = useState<Dependent[]>([]);
  const [active, setActive] = useState<ActiveProfile | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/family", { cache: "no-store" }).then((r) => r.ok ? r.json() : { dependents: [] }),
      fetch("/api/family/active", { cache: "no-store" }).then((r) => r.ok ? r.json() : { active: { kind: "self" } }),
    ]).then(([fam, act]) => {
      if (cancelled) return;
      setList(fam.dependents || []);
      setActive(act.active);
    });
    return () => { cancelled = true; };
  }, []);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!active) return null;
  // Don't render the chip at all if user has no dependents — keeps
  // the header uncluttered until family is actually a thing.
  if (list.length === 0) return null;

  const switchTo = async (depId: string | null) => {
    const r = await fetch("/api/family/active", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dependentId: depId }),
    });
    if (r.ok) {
      // Hard reload so server-rendered pages pick up the new cookie.
      window.location.reload();
    }
  };

  const label = active.kind === "dependent"
    ? `Booking for ${active.dependentName?.split(" ")[0] || "dependent"}`
    : "Booking for yourself";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          active.kind === "dependent"
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
        }`}
        title="Switch active family profile"
      >
        <span>{active.kind === "dependent" ? "👨‍👩‍👧" : "👤"}</span>
        <span className="max-w-[160px] truncate">{label}</span>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
          <div className="border-b border-slate-100 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Family profiles
          </div>

          <button
            onClick={() => switchTo(null)}
            className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm transition hover:bg-slate-50 dark:bg-slate-900 ${active.kind === "self" ? "bg-indigo-50/40" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-sm font-bold text-white">You</div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Yourself</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Primary account</p>
              </div>
            </div>
            {active.kind === "self" && <span className="text-emerald-600">✓</span>}
          </button>

          <div className="max-h-72 overflow-y-auto">
            {list.map((d) => {
              const isActive = active.kind === "dependent" && active.dependentId === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => switchTo(d.id)}
                  className={`flex w-full items-center justify-between gap-2 border-t border-slate-50 px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 dark:bg-slate-900 ${isActive ? "bg-emerald-50/40" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-base">{REL_EMOJI[d.relationship]}</div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{d.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{d.relationship.replace("_", " ")}</p>
                    </div>
                  </div>
                  {isActive && <span className="text-emerald-600">✓</span>}
                </button>
              );
            })}
          </div>

          <Link href="/dashboard/family" onClick={() => setOpen(false)} className="block border-t border-slate-100 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-center text-xs font-semibold text-indigo-700 hover:bg-slate-100 dark:bg-slate-800">
            + Manage family
          </Link>
        </div>
      )}
    </div>
  );
}
