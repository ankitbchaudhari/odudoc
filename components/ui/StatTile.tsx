import Link from "next/link";
import GlassCard from "./GlassCard";

// Single stat tile for the top-of-dashboard row. Big numeral, label,
// optional sub-line, gradient-tinted icon. Clickable when an href is
// passed (the whole tile becomes the link).

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  /** Path d for the icon (Heroicons-style 24x24 outline). */
  iconPath: string;
  /** Tailwind gradient direction + stops, e.g. "from-emerald-400 to-teal-600". */
  gradient: string;
  href?: string;
};

export default function StatTile({ label, value, sub, iconPath, gradient, href }: Props) {
  const inner = (
    <GlassCard interactive={!!href} className="overflow-hidden">
      {/* Soft gradient flood top-right behind the icon */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${gradient} opacity-25 blur-2xl`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{label}</p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-white/60">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
          </svg>
        </div>
      </div>
    </GlassCard>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}
