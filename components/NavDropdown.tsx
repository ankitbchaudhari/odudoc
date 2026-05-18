"use client";

// Navbar dropdown — used for "For patients" / "For doctors" /
// "For organisations". Opens on hover (desktop) or click, closes on
// mouse-leave, click outside, or Escape. Spec: Cowork Build Handover
// Section 2 / Header_Footer_Final Section 2.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface NavDropdownItem {
  label: string;
  href: string;
  badge?: string; // e.g. "New"
}

export interface NavDropdownGroup {
  label: string;
  items: NavDropdownItem[];
  /** When true, this group renders as a third mega-menu column.
   *  Defaults to false (vertical stack inside a single column). */
  column?: boolean;
}

interface Props {
  /** The clickable trigger label (e.g. "For patients"). */
  label: string;
  /** One or more groups. 1 group → simple dropdown.
   *  2 groups → two stacked sub-groups in a single column.
   *  3+ groups → mega menu, one column each. */
  groups: NavDropdownGroup[];
  /** Optional "View all" link at the bottom of the dropdown. */
  viewAll?: { label: string; href: string };
  /** Width override. "md" = 220px stack · "wide" = 520px mega menu. */
  width?: "md" | "wide";
  /** Aligns the dropdown to the right edge of the trigger.
   *  Useful for the rightmost nav item so it doesn't overflow. */
  alignRight?: boolean;
}

export default function NavDropdown({
  label,
  groups,
  viewAll,
  width = "md",
  alignRight = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Click outside + Escape to close. Hover-leave handled via the
  // wrapper's onMouseLeave with a short delay so the user can move
  // diagonally from trigger to menu without it snapping shut.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current || wrapperRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDocClick);
        document.removeEventListener("keydown", onKey);
      };
    }
  }, [open]);

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const panelWidth = width === "wide" ? "w-[520px]" : "w-[240px]";
  const isMega = groups.length >= 3;

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-white hover:text-primary-700 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="whitespace-nowrap">{label}</span>
        <svg
          className={`h-3 w-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute top-full mt-2 ${panelWidth} ${alignRight ? "right-0" : "left-0"} z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900`}
        >
          {isMega ? (
            <div className="grid grid-cols-3 gap-0">
              {groups.map((g) => (
                <Column key={g.label} group={g} onPick={() => setOpen(false)} />
              ))}
            </div>
          ) : (
            <div className="p-2">
              {groups.map((g, i) => (
                <div key={g.label} className={i > 0 ? "mt-2 border-t border-slate-100 pt-2 dark:border-slate-800" : ""}>
                  <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {g.label}
                  </p>
                  {g.items.map((it) => (
                    <NavLink key={it.href} item={it} onPick={() => setOpen(false)} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {viewAll && (
            <Link
              href={viewAll.href}
              onClick={() => setOpen(false)}
              className="block border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:border-slate-800 dark:bg-slate-950 dark:text-primary-300"
            >
              {viewAll.label} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Column({ group, onPick }: { group: NavDropdownGroup; onPick: () => void }) {
  return (
    <div className="border-r border-slate-100 p-3 last:border-r-0 dark:border-slate-800">
      <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {group.label}
      </p>
      {group.items.map((it) => (
        <NavLink key={it.href} item={it} onPick={onPick} />
      ))}
    </div>
  );
}

function NavLink({ item, onPick }: { item: NavDropdownItem; onPick: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onPick}
      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-primary-300"
    >
      <span>{item.label}</span>
      {item.badge && (
        <span className="rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
