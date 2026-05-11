"use client";

// Org-admin dashboard quick-add strip. Surfaces the four actions an
// org admin reaches for daily — add staff, admit a patient, schedule
// an appointment, raise an invoice — right on the dashboard so they
// don't have to dive into the sidebar. All four deep-link to their
// dedicated pages where the full multi-step flow makes sense; the
// staff page reads ?new=1 to auto-open its create form.

import Link from "next/link";

interface QuickAddPanelProps {
  /** Re-fetch the dashboard after a successful create so the KPI
   *  cards reflect the new staff/admission immediately. */
  onChange: () => void;
}

export default function QuickAddPanel({ onChange: _onChange }: QuickAddPanelProps) {
  const actions: Array<{
    label: string;
    desc: string;
    icon: string;
    tone: string;
    onClick?: () => void;
    href?: string;
  }> = [
    {
      // Opens the full Medical Staff page so the admin can fill in
      // every field (role, department, license, etc.) — once they
      // save, the new staff member auto-receives email + SMS with
      // their username (email) and a 3-day temp password.
      label: "Add staff",
      desc: "Opens full staff form",
      icon: "👥",
      tone: "from-emerald-500 to-teal-600",
      href: "/admin/staff?new=1",
    },
    {
      label: "Admit patient",
      desc: "Open IPD admission",
      icon: "🛏️",
      tone: "from-rose-500 to-pink-600",
      href: "/admin/admissions",
    },
    {
      label: "Schedule appointment",
      desc: "OPD slot for today",
      icon: "📅",
      tone: "from-sky-500 to-indigo-600",
      href: "/admin/appointments",
    },
    {
      label: "Raise invoice",
      desc: "Bill for a visit",
      icon: "🧾",
      tone: "from-amber-500 to-orange-600",
      href: "/admin/invoices",
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
          Quick add
        </h2>
        <span className="text-[11px] text-slate-400">
          The four things you do most
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((a) => {
          const body = (
            <div
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${a.tone} p-4 text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl`}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
              <div className="relative flex items-start gap-3">
                <span className="text-2xl">{a.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold leading-tight">{a.label}</p>
                  <p className="mt-0.5 text-[11px] text-white/85">{a.desc}</p>
                </div>
                <span className="self-end text-white/80 transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </div>
            </div>
          );
          if (a.href) {
            return (
              <Link key={a.label} href={a.href} className="block">
                {body}
              </Link>
            );
          }
          return (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className="block w-full text-left"
            >
              {body}
            </button>
          );
        })}
      </div>
    </div>
  );
}
