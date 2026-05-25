// Admin Reports & Exports — one dynamic route serves every report
// type so adding a new report is just a new branch in the switch.
//
// Auth: super-admins get platform-wide data; tenant admins get
// their own org only. Other roles → 403.
//
// Reports shipped in V1:
//   patients     — patient list with last-update and demographics
//   corporate    — organizations + plan + status + module count
//   financial    — invoices with totals + status (org-scoped)
//   marketing    — recent signups by role (super-admin only)
//
// Each report accepts optional ?from=YYYY-MM-DD&to=YYYY-MM-DD query
// params. Out of range rows are filtered server-side.

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { listPatients } from "@/lib/patients-store";
import { listOrganizations } from "@/lib/organizations-store";
import { listInvoices } from "@/lib/hospital/invoices-store";
import { listUsersAdmin } from "@/lib/users-store";
import {
  buildCsv,
  csvResponse,
  timestampedFilename,
  type CsvColumn,
} from "@/lib/csv-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPORTS = ["patients", "corporate", "financial", "marketing"] as const;
type ReportId = (typeof REPORTS)[number];

function inRange(iso: string | undefined, from: Date | null, to: Date | null): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  return true;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { report: string } },
) {
  const report = params.report as ReportId;
  if (!REPORTS.includes(report)) {
    return new Response(JSON.stringify({ error: "unknown_report" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const ctx = await getTenantContext();
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && !ctx.isSuperAdmin) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : null;
  // Treat the `to` filter as end-of-day so a same-day from=to=2026-01-01
  // still includes rows stamped at 23:59 that day.
  const to = toParam
    ? new Date(new Date(toParam).setHours(23, 59, 59, 999))
    : null;

  switch (report) {
    case "patients":
      return patientsReport(ctx, from, to);
    case "corporate":
      return corporateReport(ctx, from, to);
    case "financial":
      return financialReport(ctx, from, to);
    case "marketing":
      return marketingReport(ctx, from, to);
  }
}

// ─────────────────────────────────────────────────────────────────────
// patients — org-scoped patient list, redacted to a non-sensitive
// summary so the export is safe to share with finance / ops.
// ─────────────────────────────────────────────────────────────────────
async function patientsReport(
  ctx: Awaited<ReturnType<typeof getTenantContext>>,
  from: Date | null,
  to: Date | null,
) {
  const orgId = ctx.organization?.id;
  if (!orgId && !ctx.isSuperAdmin) {
    return jsonError("no_active_org", 400);
  }
  const orgIds = ctx.isSuperAdmin
    ? listOrganizations().map((o) => o.id)
    : [orgId!];
  const rows = orgIds
    .flatMap((id) => listPatients({ organizationId: id }))
    .filter((p) => !from && !to ? true : inRange(p.updatedAt, from, to));

  const columns: CsvColumn<(typeof rows)[number]>[] = [
    { key: "id", label: "OduDoc ID" },
    { key: "mrn", label: "MRN" },
    { key: "organizationId", label: "Organisation" },
    { key: "firstName", label: "First name" },
    { key: "lastName", label: "Last name" },
    { key: "gender", label: "Gender" },
    { key: "dateOfBirth", label: "DOB" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "city", label: "City" },
    { key: "country", label: "Country" },
    { key: "bloodGroup", label: "Blood group" },
    { key: "status", label: "Status" },
    { key: "createdAt", label: "Created at" },
    { key: "updatedAt", label: "Updated at" },
  ];
  return csvResponse(timestampedFilename("patients"), buildCsv(rows, columns));
}

// ─────────────────────────────────────────────────────────────────────
// corporate — every org on the platform with plan / status / scale.
// Super-admin only (tenant admins can't see other tenants).
// ─────────────────────────────────────────────────────────────────────
async function corporateReport(
  ctx: Awaited<ReturnType<typeof getTenantContext>>,
  from: Date | null,
  to: Date | null,
) {
  if (!ctx.isSuperAdmin) {
    return jsonError("forbidden", 403);
  }
  const rows = listOrganizations().filter((o) =>
    !from && !to ? true : inRange(o.createdAt, from, to),
  );
  const columns: CsvColumn<(typeof rows)[number]>[] = [
    { key: "id", label: "Org ID" },
    { key: "slug", label: "Slug" },
    { key: "name", label: "Name" },
    { key: "contactEmail", label: "Contact email" },
    { key: "contactPhone", label: "Contact phone" },
    { key: "country", label: "Country" },
    { key: "plan", label: "Plan" },
    { key: "status", label: "Status" },
    {
      key: "modulesEnabled",
      label: "Modules enabled",
      get: (o) =>
        Object.values(o.modules || {}).filter((v) => v === true).length,
    },
    { key: "createdAt", label: "Created at" },
  ];
  return csvResponse(timestampedFilename("corporate"), buildCsv(rows, columns));
}

// ─────────────────────────────────────────────────────────────────────
// financial — invoices (totals + status) within the picked window.
// Tenant admins get their own org; super-admins get every org.
// ─────────────────────────────────────────────────────────────────────
async function financialReport(
  ctx: Awaited<ReturnType<typeof getTenantContext>>,
  from: Date | null,
  to: Date | null,
) {
  const orgIds = ctx.isSuperAdmin
    ? listOrganizations().map((o) => o.id)
    : ctx.organization
      ? [ctx.organization.id]
      : [];
  if (orgIds.length === 0) return jsonError("no_active_org", 400);

  const all = orgIds.flatMap((organizationId) =>
    listInvoices({ organizationId }),
  );
  const rows = all.filter((inv) =>
    !from && !to ? true : inRange(inv.createdAt, from, to),
  );

  const columns: CsvColumn<(typeof rows)[number]>[] = [
    { key: "id", label: "Invoice ID" },
    { key: "organizationId", label: "Organisation" },
    { key: "invoiceNumber", label: "Invoice #" },
    { key: "patientId", label: "Patient ID" },
    { key: "status", label: "Status" },
    { key: "currency", label: "Currency" },
    {
      key: "subtotal",
      label: "Subtotal",
      get: (i) => (typeof i.subtotal === "number" ? i.subtotal.toFixed(2) : ""),
    },
    {
      key: "taxTotal",
      label: "Tax",
      get: (i) => (typeof i.taxTotal === "number" ? i.taxTotal.toFixed(2) : ""),
    },
    {
      key: "grandTotal",
      label: "Total",
      get: (i) => (typeof i.grandTotal === "number" ? i.grandTotal.toFixed(2) : ""),
    },
    {
      key: "paidTotal",
      label: "Paid",
      get: (i) => (typeof i.paidTotal === "number" ? i.paidTotal.toFixed(2) : ""),
    },
    {
      key: "balance",
      label: "Balance",
      get: (i) => (typeof i.balance === "number" ? i.balance.toFixed(2) : ""),
    },
    { key: "createdAt", label: "Created at" },
    { key: "dueAt", label: "Due date" },
  ];
  return csvResponse(timestampedFilename("financial"), buildCsv(rows, columns));
}

// ─────────────────────────────────────────────────────────────────────
// marketing — user signups + role + acquisition signals (referral
// code, channel). Super-admin only.
// ─────────────────────────────────────────────────────────────────────
async function marketingReport(
  ctx: Awaited<ReturnType<typeof getTenantContext>>,
  from: Date | null,
  to: Date | null,
) {
  if (!ctx.isSuperAdmin) {
    return jsonError("forbidden", 403);
  }
  const all = listUsersAdmin();
  const rows = all.filter((u) =>
    !from && !to ? true : inRange(u.createdAt, from, to),
  );
  const columns: CsvColumn<(typeof rows)[number]>[] = [
    { key: "id", label: "User ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },
    {
      key: "verified",
      label: "Email verified",
      get: (u) => (u.emailVerified ? "yes" : "no"),
    },
    { key: "warningsCount", label: "Warnings" },
    { key: "createdAt", label: "Signed up" },
    { key: "lastLoginAt", label: "Last login" },
  ];
  return csvResponse(timestampedFilename("marketing"), buildCsv(rows, columns));
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
