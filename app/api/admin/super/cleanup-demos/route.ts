// Super-admin only: auto-suspend (or delete) demo organizations whose trial
// period has lapsed. Demo orgs are identified by the @odudoc.example contact
// email set by the seed-demo endpoint — this keeps the cleanup restricted to
// obvious throwaway tenants.
//
// POST /api/admin/super/cleanup-demos  { mode?: "suspend" | "delete" }

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  listOrganizations,
  updateOrganization,
  deleteOrganization,
} from "@/lib/organizations-store";
import { deleteMembershipsForOrg } from "@/lib/memberships-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let mode: "suspend" | "delete" = "suspend";
  try {
    const body = await req.json();
    if (body?.mode === "delete") mode = "delete";
  } catch {
    /* empty body is fine */
  }

  const now = Date.now();
  const candidates = listOrganizations().filter(
    (o) =>
      o.contactEmail.endsWith("@odudoc.example") &&
      o.trialEndsAt &&
      new Date(o.trialEndsAt).getTime() < now &&
      o.status !== "cancelled",
  );

  const touched: Array<{ id: string; slug: string; name: string }> = [];
  for (const o of candidates) {
    if (mode === "delete") {
      deleteMembershipsForOrg(o.id);
      deleteOrganization(o.id);
    } else {
      updateOrganization(o.id, { status: "suspended" });
    }
    touched.push({ id: o.id, slug: o.slug, name: o.name });
  }

  log.warn("super_admin.demo_cleanup", {
    mode,
    by: ctx.email,
    affected: touched.length,
  });

  return NextResponse.json({ ok: true, mode, affected: touched.length, orgs: touched });
}
