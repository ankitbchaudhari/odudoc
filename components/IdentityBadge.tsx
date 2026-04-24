// Small pill that renders an identity verification status. Used on
// the profile page and anywhere else we want to surface whether the
// account is admin-verified. The "verified" state is the one we want
// patients + doctors to see on each other's profiles so trust is
// earned, not claimed.

interface IdentityBadgeProps {
  status: "unverified" | "pending" | "verified" | "rejected";
  size?: "sm" | "md";
}

const STYLES: Record<IdentityBadgeProps["status"], { bg: string; text: string; label: string; icon: string }> = {
  unverified: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: "Unverified",
    icon: "○",
  },
  pending: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    label: "Pending review",
    icon: "⏳",
  },
  verified: {
    bg: "bg-green-100",
    text: "text-green-700",
    label: "Verified",
    icon: "✓",
  },
  rejected: {
    bg: "bg-red-100",
    text: "text-red-700",
    label: "Needs attention",
    icon: "!",
  },
};

export default function IdentityBadge({ status, size = "md" }: IdentityBadgeProps) {
  const s = STYLES[status];
  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${pad} ${s.bg} ${s.text}`}
    >
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}
