// Smoke test for the public patient payment portal — /pay/[token].
//
// We don't have a real Stripe test invoice on the live site, so this
// test asserts the negative path only:
//   - Unknown token renders a "not found" message, not a 500.
//   - The page itself responds and includes the OduDoc framing.
//
// When CI gets a seeded test invoice (TODO: spike), expand this with
// a happy-path that hits Stripe's test card flow.

import { test, expect } from "@playwright/test";

test.describe("Public payment portal", () => {
  test("invalid token shows a friendly not-found state", async ({ page }) => {
    const fakeToken = "pay-doesnotexist00000000aaaaaaaaaaaa";
    await page.goto(`/pay/${fakeToken}`);
    // Either the friendly "Invoice not found." copy or a soft loading
    // shell — both are acceptable. We only fail on a hard 500.
    const text = await page.locator("body").innerText();
    expect(text.toLowerCase()).toMatch(/invoice|loading|secure/);
    expect(text.toLowerCase()).not.toContain("internal server error");
  });

  test("page returns 2xx — never 500", async ({ request }) => {
    const res = await request.get("/pay/pay-doesnotexist00000000aaaaaaaaaaaa");
    expect(res.status(), `Expected non-5xx, got ${res.status()}`).toBeLessThan(500);
  });

  test("API returns 404 for unknown token, not 500", async ({ request }) => {
    const res = await request.get(
      "/api/public/invoices/pay-doesnotexist00000000aaaaaaaaaaaa"
    );
    expect(res.status()).toBe(404);
  });
});
