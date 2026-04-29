// Smoke test for EMR API auth gating — every protected endpoint
// must reject unauthenticated requests with 401/403, never 200, and
// must not leak data shape on the error response.

import { test, expect } from "@playwright/test";

const PROTECTED = [
  "/api/emr/patients",
  "/api/emr/visits?recent=1",
  "/api/emr/files?patientId=fake",
  "/api/emr/invoices",
  "/api/emr/staff",
  "/api/emr/audit",
  "/api/emr/quota",
  "/api/emr/stats",
];

test.describe("EMR API auth", () => {
  for (const path of PROTECTED) {
    test(`unauth ${path} rejects with 401/403`, async ({ request }) => {
      const res = await request.get(path);
      expect([401, 403]).toContain(res.status());
      const body = await res.json().catch(() => ({}));
      // Make sure no patient or staff payload is returned by accident.
      const text = JSON.stringify(body).toLowerCase();
      expect(text).not.toContain("patientid");
      expect(text).not.toContain("emr-patients");
    });
  }
});
