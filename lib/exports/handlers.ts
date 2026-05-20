// Concrete export handlers wired into the registry. Each handler:
//   - declares which roles can run it
//   - fetches the rows (respecting role-based scope)
//   - declares PDF + Excel column shapes
//
// This file imports registry.ts and registers handlers as a side
// effect. It's imported by the API route at /api/exports/[type]
// to populate the registry before dispatch.

import { registerExport } from "./registry";
import type { Consultation } from "@/lib/consultations-store";

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
