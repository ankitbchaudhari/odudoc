// GET /api/exports/[type]?format=pdf|excel&...filters
//
// Universal Download Engine endpoint (V4 §2). Dispatches to the
// resource handler registered in lib/exports/handlers.ts, runs the
// generator, writes an audit-log entry, and streams the bytes back
// with a download-friendly Content-Disposition header.
//
// Role enforcement: each handler declares allowedRoles and we reject
// 403 if the session role isn't in that set. The handler itself ALSO
// applies per-tenant / per-user scoping inside its fetch — defence in
// depth.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createHash } from "crypto";
import { EXPORTS } from "@/lib/exports/registry";
import { renderBrandedPdf } from "@/lib/exports/pdf";
import { renderBrandedExcel } from "@/lib/exports/excel";
import { logExport } from "@/lib/exports/audit";
import { log } from "@/lib/log";

// Side-effect import that populates EXPORTS via registerExport calls.
import "@/lib/exports/handlers";

export const runtime = "nodejs";
// PDF/Excel generation is CPU-bound and can take a few seconds on
// large datasets — let it run.
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  const handler = EXPORTS[type];
  if (!handler) {
    return NextResponse.json({ error: "unknown_export_type", type }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const role = session.user.role as typeof handler.allowedRoles[number];
  if (!handler.allowedRoles.includes(role)) {
    return NextResponse.json({ error: "forbidden", required: handler.allowedRoles }, { status: 403 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "excel" ? "excel" : "pdf";
  const filters: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (key !== "format") filters[key] = value;
  });

  try {
    const payload = await handler.fetch({ session, filters });

    // Soft guard against runaway exports — V4 §2.1 bullet 5 says
    // anything over 5000 rows should run as a background job. We
    // honour the threshold by refusing the synchronous path; the
    // caller is expected to retry with ?async=1 once the background
    // queue is wired up (not in this commit).
    if (payload.rows.length > 5000 && filters.async !== "1") {
      return NextResponse.json(
        {
          error: "too_large",
          rowCount: payload.rows.length,
          message: "Exports over 5000 rows must run as a background job. Retry with ?async=1 once that pipeline is enabled.",
        },
        { status: 413 },
      );
    }

    const hospitalName = payload.hospitalName || "OduDoc Platform";
    let bytes: Buffer;
    let contentType: string;
    let filename: string;

    if (format === "excel") {
      bytes = await renderBrandedExcel({
        title: payload.title,
        hospitalName,
        filterSummary: payload.filterSummary,
        columns: payload.excelColumns,
        rows: payload.rows,
      });
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename = sanitiseFilename(`${payload.title}.xlsx`);
    } else {
      bytes = await renderBrandedPdf({
        title: payload.title,
        hospitalName,
        filterSummary: payload.filterSummary,
        columns: payload.pdfColumns,
        rows: payload.rows,
      });
      contentType = "application/pdf";
      filename = sanitiseFilename(`${payload.title}.pdf`);
    }

    // The pdf/excel helpers each hash JSON(title, hospitalName,
    // filterSummary, columns, rows) — we mirror that here so the
    // audit log records the same hash that lives in the file.
    const datasetHash = createHash("sha256")
      .update(JSON.stringify({
        title: payload.title,
        hospitalName,
        filterSummary: payload.filterSummary || "",
        columns: format === "excel"
          ? payload.excelColumns.map((c) => c.header)
          : payload.pdfColumns.map((c) => c.header),
        rows: payload.rows,
      }))
      .digest("hex");

    await logExport({
      userEmail: session.user.email,
      userRole: role,
      resource: type,
      format,
      rowCount: payload.rows.length,
      filters,
      datasetHash,
      tenantId: payload.tenantId,
      filterSummary: payload.filterSummary,
    });

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
        "X-Dataset-Hash": datasetHash,
      },
    });
  } catch (err) {
    log.error("export-failed", { type, format, err });
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }
}

function sanitiseFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}
