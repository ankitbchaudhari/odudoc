// Super-admin only: force-flip emailVerified=true on every existing
// demo account so prospects can sign in without a verification email.
// Demo accounts are identified by the two sentinel patterns we use:
//   • demo-*@odudoc.com      — the demo admin for each seeded org
//   • *.<slug>@odudoc.example — the seeded doctor / receptionist rows
//
// One-shot cleanup for orgs that were seeded before the auto-verify
// change. Safe to call repeatedly — it's idempotent.

import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { listUsers, markEmailVerified, findUserByEmail } from "@/lib/users-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let verified = 0;
  for (const u of listUsers()) {
    const email = u.email.toLowerCase();
    const isDemoAdmin = email.startsWith("demo-") && email.endsWith("@odudoc.com");
    const isDemoStaff = email.endsWith("@odudoc.example");
    if (!isDemoAdmin && !isDemoStaff) continue;
    const full = findUserByEmail(email);
    if (full && !full.emailVerified) {
      markEmailVerified(email);
      verified++;
    }
  }

  log.info("super_admin.verify_demo_users", { by: ctx.email, verified });
  return NextResponse.json({ ok: true, verified });
}
