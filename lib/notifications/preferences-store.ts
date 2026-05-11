// Per-user notification channel preferences.
//
// Lets each patient / staff member set the order they want notifications
// to arrive (e.g. WhatsApp first, SMS fallback, email last) and toggle
// individual categories off (no marketing on WhatsApp, etc.).
//
// notify.ts / vital-alert / appointment flows read from this store
// before falling back to the platform default order.

import { bindPersistentArray } from "../persistent-array";
import type { NotifyChannel } from "./notify";

export type NotifyCategory =
  | "appointment"
  | "reminder"
  | "result"
  | "billing"
  | "marketing"
  | "alert"
  | "discharge"
  | "vaccination"
  | "otp"
  | "generic";

export interface NotifyPreferences {
  userId: string;
  /** Ordered list of channels to attempt. First configured + opted-in wins. */
  channelOrder: NotifyChannel[];
  /** Per-category opt-outs. Missing key = opted-in. */
  optedOutCategories: NotifyCategory[];
  /** When true the user has opted out of EVERYTHING except OTP + alert. */
  doNotDisturb: boolean;
  updatedAt: string;
}

const DEFAULT_ORDER: NotifyChannel[] = ["whatsapp", "sms", "email"];

const prefs: NotifyPreferences[] = [];
const { hydrate, flush } = bindPersistentArray<NotifyPreferences>(
  "notify-preferences",
  prefs,
  () => []
);
await hydrate();

export function getPreferences(userId: string): NotifyPreferences {
  const found = prefs.find((p) => p.userId === userId);
  if (found) return found;
  return {
    userId,
    channelOrder: DEFAULT_ORDER,
    optedOutCategories: ["marketing"],
    doNotDisturb: false,
    updatedAt: new Date().toISOString(),
  };
}

export async function setPreferences(
  userId: string,
  patch: Partial<Omit<NotifyPreferences, "userId" | "updatedAt">>
): Promise<NotifyPreferences> {
  const now = new Date().toISOString();
  const existing = prefs.find((p) => p.userId === userId);
  if (existing) {
    if (patch.channelOrder) existing.channelOrder = patch.channelOrder;
    if (patch.optedOutCategories) existing.optedOutCategories = patch.optedOutCategories;
    if (patch.doNotDisturb !== undefined) existing.doNotDisturb = patch.doNotDisturb;
    existing.updatedAt = now;
    await flush();
    return existing;
  }
  const created: NotifyPreferences = {
    userId,
    channelOrder: patch.channelOrder ?? DEFAULT_ORDER,
    optedOutCategories: patch.optedOutCategories ?? ["marketing"],
    doNotDisturb: patch.doNotDisturb ?? false,
    updatedAt: now,
  };
  prefs.push(created);
  await flush();
  return created;
}

/** Resolve the effective channel order for a given user + category. Returns
 *  null when the user has opted out (caller should skip the send). */
export function resolveChannels(
  userId: string,
  category: NotifyCategory
): NotifyChannel[] | null {
  const p = getPreferences(userId);
  // OTPs and critical alerts always go through — life-safety + auth.
  const isOverride = category === "otp" || category === "alert";
  if (p.doNotDisturb && !isOverride) return null;
  if (!isOverride && p.optedOutCategories.includes(category)) return null;
  return p.channelOrder;
}
