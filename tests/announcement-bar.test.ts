// Logic tests for AnnouncementBar's expiry check. We copy the tiny pure
// helper here because the component itself is a React client component and
// isn't worth spinning up JSDOM for.

import { describe, it, expect } from "vitest";

interface Announcement {
  text: string;
  expires?: string;
}

function isExpired(a: Announcement, now: number = Date.now()): boolean {
  if (!a.expires) return false;
  const cutoff = new Date(`${a.expires}T23:59:59Z`).getTime();
  return Number.isFinite(cutoff) && now > cutoff;
}

describe("announcement expiry", () => {
  const aprilTenthNoon2026 = new Date("2026-04-10T12:00:00Z").getTime();
  const aprilTwentyFirst2026 = new Date("2026-04-21T00:00:01Z").getTime();

  it("evergreen announcements never expire", () => {
    expect(isExpired({ text: "forever" }, aprilTenthNoon2026)).toBe(false);
    expect(isExpired({ text: "forever" }, aprilTwentyFirst2026)).toBe(false);
  });

  it("event on April 20 is still visible through April 20 UTC", () => {
    const a = { text: "camp", expires: "2026-04-20" };
    expect(isExpired(a, aprilTenthNoon2026)).toBe(false);
    // just before end of April 20 UTC
    expect(isExpired(a, new Date("2026-04-20T23:59:58Z").getTime())).toBe(false);
  });

  it("event on April 20 is hidden after April 20 UTC", () => {
    const a = { text: "camp", expires: "2026-04-20" };
    expect(isExpired(a, aprilTwentyFirst2026)).toBe(true);
  });

  it("malformed expires never expires (fails open — defensive)", () => {
    const a = { text: "bad", expires: "not-a-date" };
    expect(isExpired(a, aprilTwentyFirst2026)).toBe(false);
  });
});
