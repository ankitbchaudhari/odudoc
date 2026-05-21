// Concrete export handlers wired into the registry. Each handler:
//   - declares which roles can run it
//   - fetches the rows (respecting role-based scope)
//   - declares PDF + Excel column shapes
//
// This file imports registry.ts and registers handlers as a side
// effect. It's imported by the API route at /api/exports/[type]
// to populate the registry before dispatch.

import { registerExport, type ExportPayload, type ExportHandler } from "./registry";
import type { Consultation } from "@/lib/consultations-store";

// ── Generic helpers for the V4 §2 mass rollout ───────────────────
//
// Most admin grids share the same shape: pull rows from a store,
// map fields onto PDF + Excel columns. The shared `simpleResource()`
// helper compresses 8 lines of boilerplate per resource into 1.
//
// Roles default to admin + support + hr; pass `allowedRoles` to
// override per resource (e.g. doctor-only earnings).

interface SimpleColumn {
  header: string;
  /** Dot-path on the row, e.g. "patient.name". Or pass `value` for
   *  a custom resolver. */
  key?: string;
  /** Custom value resolver (overrides key). */
  value?: (row: Record<string, unknown>) => string | number | boolean | null;
  /** PDF column width as a fraction of total (must sum to 1). */
  pdfWidth: number;
  /** Excel column width (character units, default 18). */
  xlsxWidth?: number;
  /** Number / date format. */
  numFmt?: string;
  align?: "left" | "right" | "center";
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[k];
    return undefined;
  }, obj);
}

function simpleResource<TRow extends Record<string, unknown>>(opts: {
  title: string;
  allowedRoles: ExportHandler["allowedRoles"];
  fetcher: () => TRow[] | Promise<TRow[]>;
  filterApply?: (rows: TRow[], filters: Record<string, string>) => TRow[];
  filterSummary?: (filters: Record<string, string>) => string;
  columns: SimpleColumn[];
}): ExportHandler {
  return {
    allowedRoles: opts.allowedRoles,
    async fetch(ctx) {
      let rows = await opts.fetcher();
      if (opts.filterApply) rows = opts.filterApply(rows, ctx.filters);
      return {
        title: opts.title,
        hospitalName: "OduDoc Platform",
        filterSummary: opts.filterSummary?.(ctx.filters) || undefined,
        pdfColumns: opts.columns.map((c) => ({
          header: c.header,
          width: c.pdfWidth,
          render: c.value
            ? (r) => String(c.value!(r) ?? "")
            : (r) => String(getPath(r, c.key || c.header) ?? ""),
          align: c.align,
        })),
        excelColumns: opts.columns.map((c) => ({
          header: c.header,
          width: c.xlsxWidth || 18,
          value: c.value
            ? (r) => {
                const v = c.value!(r);
                return v === null ? "" : v;
              }
            : (r) => {
                const v = getPath(r, c.key || c.header);
                if (v === undefined || v === null) return "";
                if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v);
                if (typeof v === "object") return JSON.stringify(v);
                return v as string | number | boolean;
              },
          numFmt: c.numFmt,
          align: c.align,
        })),
        rows: rows as unknown as Record<string, unknown>[],
      } as ExportPayload;
    },
  };
}

// ── consultations ─────────────────────────────────────────────
registerExport("consultations", {
  allowedRoles: ["admin", "doctor", "support"],
  async fetch(ctx) {
    // Dynamic import keeps the cold-start path slim — the store
    // does not load unless the export actually runs.
    const { listConsultations } = await import("@/lib/consultations-store");
    // Role-scope: a doctor only sees their own consultations.
    const roleFilter =
      ctx.session.user?.role === "doctor"
        ? { doctorEmail: ctx.session.user?.email || undefined }
        : {};
    let rows = listConsultations(roleFilter) as Consultation[];

    // Filters from the front end (date range + status + specialty).
    const status = ctx.filters.status;
    const from = ctx.filters.from ? new Date(ctx.filters.from).getTime() : null;
    const to = ctx.filters.to ? new Date(ctx.filters.to).getTime() : null;
    const specialty = ctx.filters.specialty?.toLowerCase();
    if (status) rows = rows.filter((c) => c.status === status);
    if (from) rows = rows.filter((c) => new Date(c.scheduledFor).getTime() >= from);
    if (to) rows = rows.filter((c) => new Date(c.scheduledFor).getTime() <= to);
    if (specialty) rows = rows.filter((c) => c.specialty?.toLowerCase().includes(specialty));

    const summaryParts: string[] = [];
    if (status) summaryParts.push(`Status: ${status}`);
    if (from || to) summaryParts.push(`Date range: ${ctx.filters.from || "*"} to ${ctx.filters.to || "*"}`);
    if (specialty) summaryParts.push(`Specialty: ${specialty}`);

    return {
      title: "Consultations report",
      hospitalName: "OduDoc Platform",
      filterSummary: summaryParts.join(" · ") || "All consultations",
      pdfColumns: [
        { header: "Date", width: 0.14, render: (r) => String(r.dateLabel || "") },
        { header: "Doctor", width: 0.22, render: (r) => String(r.doctorName || "") },
        { header: "Patient", width: 0.22, render: (r) => String(r.patientName || "") },
        { header: "Specialty", width: 0.16, render: (r) => String(r.specialty || "") },
        { header: "Status", width: 0.12, render: (r) => String(r.status || ""), align: "center" },
        { header: "Fee", width: 0.14, render: (r) => `₹${r.fee ?? 0}`, align: "right" },
      ],
      excelColumns: [
        { header: "Date", width: 14, value: (r) => String(r.dateLabel || "") },
        { header: "Time", width: 10, value: (r) => String(r.timeSlot || "") },
        { header: "Doctor", width: 24, value: (r) => String(r.doctorName || "") },
        { header: "Patient", width: 24, value: (r) => String(r.patientName || "") },
        { header: "Specialty", width: 18, value: (r) => String(r.specialty || "") },
        { header: "Status", width: 14, value: (r) => String(r.status || ""), align: "center" },
        { header: "Fee", width: 10, value: (r) => Number(r.fee ?? 0), numFmt: "₹#,##0", align: "right" },
        { header: "Created", width: 18, value: (r) => r.createdAt ? new Date(r.createdAt as string) : "", numFmt: "yyyy-mm-dd hh:mm" },
      ],
      rows: rows as unknown as Record<string, unknown>[],
      tenantId: ctx.session.user?.email ? "default" : undefined,
    };
  },
});

// ── users (all roles) ─────────────────────────────────────────
registerExport("users", {
  allowedRoles: ["admin", "hr", "support"],
  async fetch(ctx) {
    const { listUsersAdmin } = await import("@/lib/users-store");
    let rows = listUsersAdmin();
    const role = ctx.filters.role;
    if (role) rows = rows.filter((u) => u.role === role);
    return {
      title: "Users directory",
      hospitalName: "OduDoc Platform",
      filterSummary: role ? `Role: ${role}` : "All users",
      pdfColumns: [
        { header: "Name",  width: 0.26, render: (r) => String(r.name || "") },
        { header: "Email", width: 0.32, render: (r) => String(r.email || "") },
        { header: "Phone", width: 0.18, render: (r) => String(r.phone || "") },
        { header: "Role",  width: 0.14, render: (r) => String(r.role || ""), align: "center" },
        { header: "Status",width: 0.10, render: (r) => String(r.status || "active"), align: "center" },
      ],
      excelColumns: [
        { header: "Name",  width: 26, value: (r) => String(r.name || "") },
        { header: "Email", width: 32, value: (r) => String(r.email || "") },
        { header: "Phone", width: 16, value: (r) => String(r.phone || "") },
        { header: "Role",  width: 14, value: (r) => String(r.role || "") },
        { header: "Status",width: 10, value: (r) => String(r.status || "active") },
        { header: "Created", width: 18, value: (r) => r.createdAt ? new Date(r.createdAt as string) : "", numFmt: "yyyy-mm-dd" },
      ],
      rows: rows as unknown as Record<string, unknown>[],
    };
  },
});

// ── withdrawals ───────────────────────────────────────────────
registerExport("withdrawals", {
  allowedRoles: ["admin", "support"],
  async fetch(ctx) {
    const { listWithdrawals } = await import("@/lib/withdrawals-store");
    let rows = listWithdrawals();
    const status = ctx.filters.status;
    if (status) rows = rows.filter((w) => w.status === status);
    return {
      title: "Doctor withdrawals",
      hospitalName: "OduDoc Platform",
      filterSummary: status ? `Status: ${status}` : "All withdrawals",
      pdfColumns: [
        { header: "Requested",  width: 0.18, render: (r) => r.requestedAt ? new Date(r.requestedAt as string).toLocaleDateString() : "" },
        { header: "Doctor",     width: 0.24, render: (r) => String(r.doctorName || r.doctorEmail || "") },
        { header: "Amount",     width: 0.16, render: (r) => `₹${((r.amount as number) ?? 0).toLocaleString()}`, align: "right" },
        { header: "Method",     width: 0.16, render: (r) => String(r.method || ""), align: "center" },
        { header: "Status",     width: 0.14, render: (r) => String(r.status || ""), align: "center" },
        { header: "Decided by", width: 0.12, render: (r) => String(r.decidedBy || ""), align: "right" },
      ],
      excelColumns: [
        { header: "Requested",  width: 18, value: (r) => r.requestedAt ? new Date(r.requestedAt as string) : "", numFmt: "yyyy-mm-dd hh:mm" },
        { header: "Doctor",     width: 24, value: (r) => String(r.doctorName || r.doctorEmail || "") },
        { header: "Doctor email", width: 24, value: (r) => String(r.doctorEmail || "") },
        { header: "Amount",     width: 14, value: (r) => Number(r.amount ?? 0), numFmt: "₹#,##0", align: "right" },
        { header: "Method",     width: 14, value: (r) => String(r.method || "") },
        { header: "Status",     width: 14, value: (r) => String(r.status || "") },
        { header: "Decided by", width: 24, value: (r) => String(r.decidedBy || "") },
        { header: "Decided at", width: 18, value: (r) => r.decidedAt ? new Date(r.decidedAt as string) : "", numFmt: "yyyy-mm-dd hh:mm" },
      ],
      rows: rows as unknown as Record<string, unknown>[],
    };
  },
});

// ── PPME reports ──────────────────────────────────────────────
registerExport("ppme", {
  allowedRoles: ["admin", "support"],
  async fetch(ctx) {
    const { listPpme } = await import("@/lib/ppme-store");
    const status = ctx.filters.status as
      | "scheduled" | "in_progress" | "submitted" | "approved" | "rejected" | "cancelled"
      | undefined;
    const rows = await listPpme({ status, limit: 5000 });
    return {
      title: "Pre-Policy Medical Examinations",
      hospitalName: "OduDoc Platform",
      filterSummary: status ? `Status: ${status}` : "All PPME reports",
      pdfColumns: [
        { header: "Created",  width: 0.14, render: (r) => new Date(r.createdAt as string).toLocaleDateString() },
        { header: "Patient",  width: 0.20, render: (r) => String(r.patientName || "") },
        { header: "Insurer",  width: 0.18, render: (r) => String(r.insurerName || "") },
        { header: "Ref",      width: 0.10, render: (r) => String(r.insurerRef || "") },
        { header: "Tier",     width: 0.10, render: (r) => String(r.tier || ""), align: "center" },
        { header: "Status",   width: 0.12, render: (r) => String(r.status || ""), align: "center" },
        { header: "Fee",      width: 0.16, render: (r) => `${(r.currency as string) === "INR" ? "₹" : "$"}${(((r.feeCents as number) ?? 0) / 100).toLocaleString()}`, align: "right" },
      ],
      excelColumns: [
        { header: "Created",     width: 18, value: (r) => new Date(r.createdAt as string), numFmt: "yyyy-mm-dd hh:mm" },
        { header: "Patient",     width: 22, value: (r) => String(r.patientName || "") },
        { header: "Insurer",     width: 20, value: (r) => String(r.insurerName || "") },
        { header: "Insurer ref", width: 12, value: (r) => String(r.insurerRef || "") },
        { header: "Policy type", width: 16, value: (r) => String(r.policyType || "") },
        { header: "Tier",        width: 14, value: (r) => String(r.tier || "") },
        { header: "Fee (cents)", width: 14, value: (r) => Number(r.feeCents ?? 0), numFmt: "#,##0", align: "right" },
        { header: "Currency",    width: 10, value: (r) => String(r.currency || "INR") },
        { header: "Status",      width: 14, value: (r) => String(r.status || "") },
        { header: "Submitted",   width: 18, value: (r) => r.completedAt ? new Date(r.completedAt as string) : "", numFmt: "yyyy-mm-dd hh:mm" },
        { header: "Report hash", width: 50, value: (r) => String(r.reportHash || "") },
      ],
      rows: rows as unknown as Record<string, unknown>[],
    };
  },
});

// ── doctors ───────────────────────────────────────────────────
registerExport("doctors", {
  allowedRoles: ["admin", "hr", "support"],
  async fetch(ctx) {
    const { listUsersAdmin } = await import("@/lib/users-store");
    let rows = listUsersAdmin().filter((u) => u.role === "doctor");

    const status = ctx.filters.status;
    if (status === "verified") rows = rows.filter((u) => (u as { verified?: boolean }).verified);
    if (status === "unverified") rows = rows.filter((u) => !(u as { verified?: boolean }).verified);
    if (status === "banned") rows = rows.filter((u) => u.status === "banned");

    return {
      title: "Doctors directory",
      hospitalName: "OduDoc Platform",
      filterSummary: status ? `Status: ${status}` : "All doctors",
      pdfColumns: [
        { header: "Name", width: 0.26, render: (r) => String(r.name || "") },
        { header: "Email", width: 0.30, render: (r) => String(r.email || "") },
        { header: "Phone", width: 0.16, render: (r) => String(r.phone || "") },
        { header: "Specialty", width: 0.18, render: (r) => String((r as { specialty?: string }).specialty || "") },
        { header: "Status", width: 0.10, render: (r) => String(r.status || "active"), align: "center" },
      ],
      excelColumns: [
        { header: "Name", width: 26, value: (r) => String(r.name || "") },
        { header: "Email", width: 30, value: (r) => String(r.email || "") },
        { header: "Phone", width: 16, value: (r) => String(r.phone || "") },
        { header: "Specialty", width: 18, value: (r) => String((r as { specialty?: string }).specialty || "") },
        { header: "Verified", width: 10, value: (r) => Boolean((r as { verified?: boolean }).verified) },
        { header: "Status", width: 10, value: (r) => String(r.status || "active") },
        { header: "Created", width: 18, value: (r) => r.createdAt ? new Date(r.createdAt as string) : "", numFmt: "yyyy-mm-dd" },
      ],
      rows: rows as unknown as Record<string, unknown>[],
    };
  },
});

// ─────────────────────────────────────────────────────────────────
// V4 §2 mass rollout — 18 additional resources via simpleResource()
// ─────────────────────────────────────────────────────────────────

// appointments
registerExport("appointments", simpleResource({
  title: "Appointments",
  allowedRoles: ["admin", "support", "hr"],
  fetcher: async () => {
    const { listAppointments } = await import("@/lib/appointments-store");
    return listAppointments() as unknown as Record<string, unknown>[];
  },
  columns: [
    { header: "Date", key: "date", pdfWidth: 0.16 },
    { header: "Time", key: "time", pdfWidth: 0.10 },
    { header: "Doctor", key: "doctorName", pdfWidth: 0.22 },
    { header: "Patient", key: "patientName", pdfWidth: 0.22 },
    { header: "Type", key: "type", pdfWidth: 0.12, align: "center" },
    { header: "Status", key: "status", pdfWidth: 0.18, align: "center" },
  ],
}));

// prescriptions
registerExport("prescriptions", simpleResource({
  title: "Prescriptions",
  allowedRoles: ["admin", "support", "doctor"],
  fetcher: async () => {
    const { listPrescriptions } = await import("@/lib/prescriptions-store");
    return (await listPrescriptions()) as unknown as Record<string, unknown>[];
  },
  columns: [
    { header: "Created", key: "createdAt", pdfWidth: 0.16, numFmt: "yyyy-mm-dd hh:mm" },
    { header: "Patient", key: "patientName", pdfWidth: 0.22 },
    { header: "Doctor", key: "doctorName", pdfWidth: 0.22 },
    { header: "Diagnosis", value: (r) => {
        const data = r.data as { diagnosis?: string } | undefined;
        return data?.diagnosis || "";
      }, pdfWidth: 0.24 },
    { header: "Status", key: "status", pdfWidth: 0.16, align: "center" },
  ],
}));

// invoices (clinic)
registerExport("invoices", simpleResource({
  title: "Clinic Invoices",
  allowedRoles: ["admin", "support"],
  fetcher: async () => {
    const { listInvoicesInRange } = await import("@/lib/clinic-invoices-store");
    return listInvoicesInRange({
      startIso: new Date(Date.now() - 365 * 24 * 3600_000).toISOString(),
      endIso: new Date().toISOString(),
    }) as unknown as Record<string, unknown>[];
  },
  columns: [
    { header: "Number", key: "invoiceNumber", pdfWidth: 0.14 },
    { header: "Issued", key: "issuedAt", pdfWidth: 0.16, numFmt: "yyyy-mm-dd" },
    { header: "Clinic", key: "clinicName", pdfWidth: 0.20 },
    { header: "Patient", key: "patientName", pdfWidth: 0.18 },
    { header: "Amount", value: (r) => Number(r.totalAmount || 0), pdfWidth: 0.14, numFmt: "₹#,##0.00", align: "right" },
    { header: "Status", key: "status", pdfWidth: 0.18, align: "center" },
  ],
}));

// blog posts
registerExport("blog", simpleResource({
  title: "Blog posts",
  allowedRoles: ["admin", "support", "hr"],
  fetcher: async () => {
    const { listPosts } = await import("@/lib/blog-store");
    return (await listPosts({})) as unknown as Record<string, unknown>[];
  },
  columns: [
    { header: "Title", key: "title", pdfWidth: 0.32 },
    { header: "Author", key: "author", pdfWidth: 0.18 },
    { header: "Category", key: "category", pdfWidth: 0.16 },
    { header: "Status", key: "status", pdfWidth: 0.12, align: "center" },
    { header: "Published", key: "publishedAt", pdfWidth: 0.22, numFmt: "yyyy-mm-dd" },
  ],
}));

// departments
registerExport("departments", simpleResource({
  title: "Departments",
  allowedRoles: ["admin", "support"],
  fetcher: async () => {
    const { listDepartments } = await import("@/lib/departments-store");
    return listDepartments() as unknown as Record<string, unknown>[];
  },
  columns: [
    { header: "Code", key: "code", pdfWidth: 0.16 },
    { header: "Name", key: "name", pdfWidth: 0.32 },
    { header: "HOD", key: "hodEmail", pdfWidth: 0.30 },
    { header: "Status", key: "status", pdfWidth: 0.22, align: "center" },
  ],
}));

// shop orders
registerExport("orders", simpleResource({
  title: "Shop orders",
  allowedRoles: ["admin", "support", "vendor"],
  fetcher: async () => {
    const { listOrders } = await import("@/lib/orders-store");
    return listOrders({}) as unknown as Record<string, unknown>[];
  },
  columns: [
    { header: "Number", key: "orderNumber", pdfWidth: 0.14 },
    { header: "Created", key: "createdAt", pdfWidth: 0.16, numFmt: "yyyy-mm-dd hh:mm" },
    { header: "Customer", key: "customer", pdfWidth: 0.22 },
    { header: "Email", key: "email", pdfWidth: 0.22 },
    { header: "Total", value: (r) => Number(r.total || 0), pdfWidth: 0.12, numFmt: "₹#,##0.00", align: "right" },
    { header: "Status", key: "orderStatus", pdfWidth: 0.14, align: "center" },
  ],
}));

// doctor earnings
registerExport("doctor-earnings", simpleResource({
  title: "Doctor earnings",
  allowedRoles: ["admin", "support"],
  fetcher: async () => {
    const { listEarnings } = await import("@/lib/doctor-earnings-store");
    return listEarnings({}) as unknown as Record<string, unknown>[];
  },
  columns: [
    { header: "Doctor", key: "doctorEmail", pdfWidth: 0.30 },
    { header: "Period", key: "period", pdfWidth: 0.16 },
    { header: "Consults", value: (r) => Number(r.consultationCount || 0), pdfWidth: 0.12, align: "right" },
    { header: "Gross", value: (r) => Number(r.grossCents || 0) / 100, pdfWidth: 0.14, numFmt: "₹#,##0.00", align: "right" },
    { header: "Commission", value: (r) => Number(r.commissionCents || 0) / 100, pdfWidth: 0.12, numFmt: "₹#,##0.00", align: "right" },
    { header: "Net", value: (r) => Number(r.netCents || 0) / 100, pdfWidth: 0.16, numFmt: "₹#,##0.00", align: "right" },
  ],
}));

// doctor invites
registerExport("doctor-invites", simpleResource({
  title: "Doctor invites",
  allowedRoles: ["admin", "support", "hr"],
  fetcher: async () => {
    const { listDoctorInvites } = await import("@/lib/doctor-invites-store");
    return (await listDoctorInvites()) as unknown as Record<string, unknown>[];
  },
  columns: [
    { header: "Created", key: "createdAt", pdfWidth: 0.18, numFmt: "yyyy-mm-dd" },
    { header: "Name", key: "name", pdfWidth: 0.22 },
    { header: "Email", key: "email", pdfWidth: 0.26 },
    { header: "Specialty", key: "specialty", pdfWidth: 0.18 },
    { header: "Status", key: "status", pdfWidth: 0.16, align: "center" },
  ],
}));

// audit log
registerExport("audit-log", simpleResource({
  title: "Audit log",
  allowedRoles: ["admin", "support"],
  fetcher: async () => {
    const { listAuditEntries } = await import("@/lib/audit-log-store");
    return listAuditEntries() as unknown as Record<string, unknown>[];
  },
  columns: [
    { header: "Time", key: "createdAt", pdfWidth: 0.18, numFmt: "yyyy-mm-dd hh:mm" },
    { header: "Actor", key: "actorEmail", pdfWidth: 0.26 },
    { header: "Action", key: "action", pdfWidth: 0.22 },
    { header: "Subject", value: (r) => `${r.subjectKind || ""} ${String(r.subjectId || "").slice(-8)}`, pdfWidth: 0.18 },
    { header: "Summary", key: "summary", pdfWidth: 0.16 },
  ],
}));

// CAPA
registerExport("capa", simpleResource({
  title: "CAPA register",
  allowedRoles: ["admin", "support", "hr"],
  fetcher: async () => {
    const { listCapas } = await import("@/lib/capa-store");
    return listCapas({}) as unknown as Record<string, unknown>[];
  },
  columns: [
    { header: "Opened", key: "openedAt", pdfWidth: 0.14, numFmt: "yyyy-mm-dd" },
    { header: "Title", key: "title", pdfWidth: 0.28 },
    { header: "Source", key: "source", pdfWidth: 0.14 },
    { header: "Owner", key: "ownerEmail", pdfWidth: 0.20 },
    { header: "Status", key: "status", pdfWidth: 0.12, align: "center" },
    { header: "Due", key: "dueAt", pdfWidth: 0.12, numFmt: "yyyy-mm-dd" },
  ],
}));

// admissions
registerExport("admissions", simpleResource({
  title: "Admissions",
  allowedRoles: ["admin", "support"],
  fetcher: async () => {
    const { listAdmissions } = await import("@/lib/admissions-store");
    return (await listAdmissions({})) as unknown as Record<string, unknown>[];
  },
  columns: [
    { header: "Admitted", key: "admittedAt", pdfWidth: 0.16, numFmt: "yyyy-mm-dd hh:mm" },
    { header: "Patient", key: "patientName", pdfWidth: 0.22 },
    { header: "Bed", key: "bedLabel", pdfWidth: 0.14 },
    { header: "Doctor", key: "admittingDoctorName", pdfWidth: 0.22 },
    { header: "Status", key: "status", pdfWidth: 0.14, align: "center" },
    { header: "Reason", key: "reason", pdfWidth: 0.12 },
  ],
}));

// coupons
registerExport("coupons", simpleResource({
  title: "Coupons",
  allowedRoles: ["admin", "support"],
  fetcher: async () => {
    const { getCoupons } = await import("@/lib/coupons-store");
    return getCoupons() as unknown as Record<string, unknown>[];
  },
  columns: [
    { header: "Code", key: "code", pdfWidth: 0.16 },
    { header: "Type", key: "type", pdfWidth: 0.12, align: "center" },
    { header: "Value", value: (r) => Number(r.value || 0), pdfWidth: 0.10, align: "right" },
    { header: "Uses", value: (r) => `${r.timesUsed ?? 0} / ${r.maxUses ?? "∞"}`, pdfWidth: 0.14, align: "center" },
    { header: "Expires", key: "expiresAt", pdfWidth: 0.18, numFmt: "yyyy-mm-dd" },
    { header: "Status", key: "status", pdfWidth: 0.30, align: "center" },
  ],
}));

// payouts
registerExport("payouts", simpleResource({
  title: "Vendor payouts",
  allowedRoles: ["admin", "support"],
  fetcher: async () => {
    const { listPayouts } = await import("@/lib/payouts-store");
    return listPayouts({}) as unknown as Record<string, unknown>[];
  },
  columns: [
    { header: "Period", key: "period", pdfWidth: 0.14 },
    { header: "Vendor", key: "vendorName", pdfWidth: 0.26 },
    { header: "Gross", value: (r) => Number(r.grossCents || 0) / 100, pdfWidth: 0.14, numFmt: "₹#,##0.00", align: "right" },
    { header: "Commission", value: (r) => Number(r.commissionCents || 0) / 100, pdfWidth: 0.14, numFmt: "₹#,##0.00", align: "right" },
    { header: "Net", value: (r) => Number(r.netCents || 0) / 100, pdfWidth: 0.14, numFmt: "₹#,##0.00", align: "right" },
    { header: "Status", key: "status", pdfWidth: 0.18, align: "center" },
  ],
}));

// vendors
registerExport("vendors", simpleResource({
  title: "Vendors",
  allowedRoles: ["admin", "support", "hr"],
  fetcher: async () => {
    const { listVendors } = await import("@/lib/vendors-store");
    return listVendors({}) as unknown as Record<string, unknown>[];
  },
  columns: [
    { header: "Name", key: "name", pdfWidth: 0.24 },
    { header: "Owner", key: "ownerName", pdfWidth: 0.20 },
    { header: "Email", key: "ownerEmail", pdfWidth: 0.24 },
    { header: "City", key: "city", pdfWidth: 0.16 },
    { header: "Status", key: "status", pdfWidth: 0.16, align: "center" },
  ],
}));

// inventory — skipped from mass rollout: the inventory store is
// scoped per-doctor (each doctor has their own clinical-pharmacy
// stock), so a single platform-wide export doesn't make sense. The
// doctor's own inventory export will land with the doctor-dashboard
// wire commit.

// lab-orders — skipped from mass rollout: per-doctor scoping in the
// store. Ships with the doctor-dashboard wire commit.

// lab tests catalogue
registerExport("lab-tests", simpleResource({
  title: "Lab tests catalogue",
  allowedRoles: ["admin", "support"],
  fetcher: async () => {
    const { listLabTests } = await import("@/lib/lab-tests-store");
    return listLabTests() as unknown as Record<string, unknown>[];
  },
  columns: [
    { header: "Code", key: "code", pdfWidth: 0.14 },
    { header: "Name", key: "name", pdfWidth: 0.34 },
    { header: "Category", key: "category", pdfWidth: 0.18 },
    { header: "Price", value: (r) => Number(r.priceCents || 0) / 100, pdfWidth: 0.14, numFmt: "₹#,##0.00", align: "right" },
    { header: "Sample", key: "sampleType", pdfWidth: 0.20 },
  ],
}));

// complaints — skipped from mass rollout: per-organization scoping
// in the store (organizationId required). Will wire when the
// per-tenant export pass lands.
