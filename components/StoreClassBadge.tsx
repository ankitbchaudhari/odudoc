// Pill component for pharmacy store-class identification. Used on
// drug rows in /admin/pharma/drugs and on pharmacy tenant rows in
// /admin/organizations to make the "what does this pharmacy sell"
// question answerable at a glance.

import { getStoreClassInfo } from "@/lib/pharmacy-store-classes";

interface Props {
  storeClass: string | undefined | null;
  size?: "compact" | "full";
}

export default function StoreClassBadge({ storeClass, size = "compact" }: Props) {
  const info = getStoreClassInfo(storeClass);
  if (!info) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${info.badge.bg} ${info.badge.text} ${info.badge.ring}`}
      title={info.description}
    >
      <span aria-hidden>{info.emoji}</span>
      <span>{size === "full" ? info.label : info.shortLabel}</span>
    </span>
  );
}
