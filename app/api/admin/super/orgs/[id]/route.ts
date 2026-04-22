// Super-admin only: hard-delete a demo organization. Guarded so that only
// orgs seeded via /api/admin/super/seed-demo (identified by the
// @odudoc.example contact email) can be hard-deleted. Production orgs
// must be suspended/cancelled via the status endpoint instead — this
// keeps the blast radius of a mis-click to throwaway demo tenants only.
//
// Cascade: also removes patients, appointments, and notifications scoped
// to the org so we don't leave orphans in the DB.

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getOrganizationById, deleteOrganization } from "@/lib/organizations-store";
import { deleteMembershipsForOrg } from "@/lib/memberships-store";
import { listPatients, deletePatient } from "@/lib/patients-store";
import { listAppointments, deleteAppointment } from "@/lib/hospital/appointments-store";
import { listNotifications, deleteNotification } from "@/lib/hospital/notifications-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const org = getOrganizationById(params.id);
  if (!org) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Guard: only demo orgs (seeded with @odudoc.example contact) can be hard
  // deleted. Real tenants go through the suspend/cancel status flow.
  if (!org.contactEmail.endsWith("@odudoc.example")) {
    return NextResponse.json(
      { error: "only_demo_orgs_deletable", detail: "Use /status to suspend real orgs." },
      { status: 400 },
    );
  }

  // Cascade: drop tenant-scoped data before removing the org itself. Best
  // effort — individual delete failures are logged but don't abort.
  let patientsRemoved = 0;
  try {
    for (const p of listPatients({ organizationId: org.id })) {
      if (deletePatient(p.id, org.id)) patientsRemoved++;
    }
  } catch (e) {
    log.error("super_admin.cascade.patients_failed", e, { orgId: org.id });
  }

  let appointmentsRemoved = 0;
  try {
    for (const a of listAppointments({ organizationId: org.id })) {
      if (deleteAppointment(a.id, org.id)) appointmentsRemoved++;
    }
  } catch (e) {
    log.error("super_admin.cascade.appointments_failed", e, { orgId: org.id });
  }

  let notificationsRemoved = 0;
  try {
    for (const n of listNotifications({ organizationId: org.id })) {
      if (deleteNotification(n.id, org.id)) notificationsRemoved++;
    }
  } catch (e) {
    log.error("super_admin.cascade.notifications_failed", e, { orgId: org.id });
  }

  const memberships = deleteMembershipsForOrg(org.id);
  const removed = deleteOrganization(org.id);

  log.warn("super_admin.demo_org_deleted", {
    orgId: org.id,
    slug: org.slug,
    by: ctx.email,
    membershipsRemoved: memberships,
    patientsRemoved,
    appointmentsRemoved,
    notificationsRemoved,
  });

  return NextResponse.json({
    ok: removed,
    removed: {
      org: removed,
      memberships,
      patients: patientsRemoved,
      appointments: appointmentsRemoved,
      notifications: notificationsRemoved,
    },
  });
}
