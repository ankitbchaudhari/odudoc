#!/usr/bin/env node
// Manual notification smoke test — fires the four critical paths via
// HTTP so you don't have to click through the UI. Pair with
// NOTIFICATION_AUDIT.md Tests 3-4.
//
// Usage:
//   node scripts/test-notifications.mjs lab        # Test 3 (lab result ready)
//   node scripts/test-notifications.mjs withdrawal # Test 4 (withdrawal status)
//   node scripts/test-notifications.mjs all
//
// Requires env vars (paste before running):
//   ODUDOC_BASE=https://www.odudoc.com           # production
//   ADMIN_COOKIE=...                              # next-auth session cookie
//                                                   from /admin (DevTools →
//                                                   Application → Cookies →
//                                                   __Secure-next-auth.session-token)
//   ORG_ID=...                                    # an org you're admin in
//   TEST_PATIENT_ID=...                           # a patient under that org
//                                                   with phone + email set
//   TEST_DOCTOR_EMAIL=...                         # for withdrawal test
//   TEST_WITHDRAWAL_ID=...                        # an existing pending
//                                                   withdrawal id

const BASE = process.env.ODUDOC_BASE || "https://www.odudoc.com";
const COOKIE = process.env.ADMIN_COOKIE;

if (!COOKIE) {
  console.error("ADMIN_COOKIE env var is required. See script header.");
  process.exit(1);
}

const fetchJson = async (path, init = {}) => {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Cookie: `__Secure-next-auth.session-token=${COOKIE}`,
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  return { status: r.status, data };
};

async function testLabResult() {
  console.log("\n=== Test 3: lab result ready notification ===");
  const orgId = process.env.ORG_ID;
  const patientId = process.env.TEST_PATIENT_ID;
  if (!orgId || !patientId) {
    console.error(
      "Set ORG_ID and TEST_PATIENT_ID env vars. The patient must have phone + email."
    );
    return false;
  }

  // 1. Create a one-item lab order for the test patient
  const create = await fetchJson("/api/hospital/lab-orders", {
    method: "POST",
    body: JSON.stringify({
      patientId,
      labName: "OduDoc Test Lab",
      items: [{ testName: "Smoke test panel" }],
    }),
  });
  if (create.status !== 200 || !create.data.order) {
    console.error("Create failed:", create);
    return false;
  }
  const order = create.data.order;
  console.log("✓ Created lab order:", order.id);

  // 2. Submit results — this transitions to "completed" and fires the
  //    SMS + email notification to the patient
  const itemId = order.items[0].id;
  const setRes = await fetchJson("/api/hospital/lab-orders", {
    method: "PATCH",
    body: JSON.stringify({
      id: order.id,
      results: [{ itemId, value: "Normal", flag: "normal" }],
    }),
  });
  if (setRes.status !== 200) {
    console.error("Set results failed:", setRes);
    return false;
  }
  console.log("✓ Set results, status:", setRes.data.order?.status);
  console.log(
    "→ Check the patient's phone (SMS) and email inbox within 30 sec."
  );
  return true;
}

async function testWithdrawal() {
  console.log("\n=== Test 4: withdrawal status notification ===");
  const id = process.env.TEST_WITHDRAWAL_ID;
  if (!id) {
    console.error(
      "Set TEST_WITHDRAWAL_ID env var to an existing pending withdrawal id."
    );
    return false;
  }
  const patchRes = await fetchJson(`/api/withdrawals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "approved", adminNote: "smoke test" }),
  });
  if (patchRes.status !== 200) {
    console.error("PATCH failed:", patchRes);
    return false;
  }
  console.log("✓ Approved withdrawal:", patchRes.data.withdrawal?.id);
  console.log(
    "→ Check the doctor's phone (SMS) and email inbox within 30 sec."
  );
  return true;
}

const cmd = process.argv[2] || "all";
async function main() {
  if (cmd === "lab" || cmd === "all") await testLabResult();
  if (cmd === "withdrawal" || cmd === "all") await testWithdrawal();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
