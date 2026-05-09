// Active family-profile cookie.
//
// The family-switcher in the header writes a cookie naming which
// dependent (if any) the current request should target. Server
// handlers that need the active profile call `resolveActiveProfile()`
// — they get back either:
//   - { kind: "self", userId }                  the signed-in user
//   - { kind: "dependent", dependent: ... }     a verified dependent
//                                                 they own
//
// The cookie is HttpOnly + path=/ + secure-in-prod so it can't be
// stolen by client JS. Setting it requires an authenticated session;
// if the cookie names a dependent the user no longer owns (e.g. they
// removed it), we silently fall back to "self" instead of erroring.

import { cookies } from "next/headers";
import { getDependentById } from "./family-store";

const COOKIE_NAME = "od_active_profile";

export type ActiveProfile =
  | { kind: "self"; userId: string }
  | { kind: "dependent"; userId: string; dependentId: string; dependentName: string; medicalId: string };

export async function getActiveProfileCookie(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value || null;
}

export async function setActiveProfileCookie(dependentId: string | null): Promise<void> {
  const c = await cookies();
  if (!dependentId) {
    c.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return;
  }
  c.set(COOKIE_NAME, dependentId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/** Given the signed-in user id, return the active profile based on
 *  the cookie, falling back to "self" if the cookie is empty or
 *  references an unowned dependent. */
export async function resolveActiveProfile(
  signedInUserId: string,
): Promise<ActiveProfile> {
  const cookieVal = await getActiveProfileCookie();
  if (!cookieVal) return { kind: "self", userId: signedInUserId };
  const dep = getDependentById(cookieVal);
  if (!dep || dep.ownerUserId !== signedInUserId || dep.promotedToUserId) {
    return { kind: "self", userId: signedInUserId };
  }
  return {
    kind: "dependent",
    userId: signedInUserId,
    dependentId: dep.id,
    dependentName: dep.name,
    medicalId: dep.medicalId,
  };
}
