// Server-side helper that builds the watermark payload + enforces the
// no-download rule for corporate viewers (Ecosystem Spec §13).
//
// Usage in a report route:
//   const wm = buildReportWatermark({ patientUserId, req, actorRole });
//   if (wm.denyDownload && requestedDownload) return 403;
//   return NextResponse.json({ report, watermark: wm.data });

import type { NextRequest } from "next/server";
import { clientIpFromHeaders } from "@/lib/audit/store";

const CORPORATE_ROLES = new Set([
  "admin",
  "owner",
  "doctor",
  "nurse",
  "receptionist",
  "lab_tech",
  "pharmacist",
  "accountant",
  "staff",
]);

export interface WatermarkPayload {
  patientUserId: string;
  ip: string;
  viewedAt: string;
}

export interface BuiltWatermark {
  data: WatermarkPayload;
  /** True when the viewer is a corporate role — UI must hide download buttons
   *  and route handlers must refuse a `download=1` query param. */
  denyDownload: boolean;
}

export function buildReportWatermark(input: {
  patientUserId: string;
  req: NextRequest;
  actorRole?: string | null;
}): BuiltWatermark {
  const ip = clientIpFromHeaders(input.req.headers) || "unknown";
  const role = (input.actorRole || "").trim().toLowerCase();
  const denyDownload = role !== "patient" && CORPORATE_ROLES.has(role);
  return {
    data: {
      patientUserId: input.patientUserId,
      ip,
      viewedAt: new Date().toISOString(),
    },
    denyDownload,
  };
}
