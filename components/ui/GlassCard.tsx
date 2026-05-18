// Frosted-glass card — the workhorse surface of the dashboard.
// Sits on top of the aurora background and lets it bleed through at
// 12 % opacity. Border has a subtle gradient sheen on the top edge
// to mimic an OLED bezel.

import { forwardRef } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Adds a soft outward glow in the role's accent colour. */
  glow?: boolean;
  /** Tightens padding for nested cards. */
  compact?: boolean;
  /** Wraps the card in a hover-lift transition. */
  interactive?: boolean;
};

const GlassCard = forwardRef<HTMLDivElement, Props>(function GlassCard(
  { children, className = "", glow = false, compact = false, interactive = false },
  ref,
) {
  return (
    <div
      ref={ref}
      className={[
        "relative rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl",
        "shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
        "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent",
        compact ? "p-4" : "p-6",
        glow ? "shadow-[0_8px_32px_rgba(0,0,0,0.35),0_0_60px_-15px_var(--glass-glow,rgba(255,255,255,0.25))]" : "",
        interactive ? "transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]" : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
});

export default GlassCard;
