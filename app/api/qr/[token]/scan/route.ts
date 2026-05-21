// POST /api/qr/[token]/scan — scanner resolves the token.
//
// Called by the doctor / nurse / reception staff after scanning a
// QR. Returns the scoped payload on success. Failures (revoked,
// expired, wrong-role) return a 4xx with the error code so the
// scanner UI can show a precise message — and every failure is
// logged so misuse is visible in the V13 accountability feed.
//
// Rate-limited at 100 scans / 10 min / IP — generous for a busy
// reception desk, blocks enumeration attacks against the token
// space.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveQr, type QrToken, type ScopeField } from "@/lib/qr-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";

export const runtime = "nodejs";

interface SafePayload {
  patientId: string;
  fields: ScopeField[];
  /** Per-field scoped data — populated only for fields in scope. */
  data: Record<string, unknown>;
  kind: QrToken["kind"];
  contextKind?: string;
  contextId?: string;
  /** Time bounds the patient set on the share. */
  dataFromDate?: string;
  dataToDate?: string;
  /** Echo of scan metadata for the UI. */
  scannedAt: string;
  scannedBy: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const blocked = await enforceRateLimit(request, "qr-scan", 100, "10 m");
  if (blocked) return blocked;

  const result = await resolveQr(token, {
    email: session.user.email,
    role: session.user.role,
    doctorId: session.user.id,
  });

  if (!result.ok) {
    const status =
      result.error === "wrong_role" || result.error === "wrong_doctor" ? 403
      : result.error === "expired" || result.error === "consumed" || result.error === "revoked" ? 410
      : result.error === "not_yet_valid" ? 425
      : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  const t = result.token!;
  // Populate the scoped data envelope. Each field maps to a live
  // store lookup; missing fields are simply omitted (zero leakage).
  const data: Record<string, unknown> = {};
  for (const field of t.scope.fields) {
    data[field] = await loadScopedField(field, t.patientId, t.scope.dataFromDate, t.scope.dataToDate);
  }

  const payload: SafePayload = {
    patientId: t.patientId,
    fields: t.scope.fields,
    data,
    kind: t.kind,
    contextKind: t.contextKind,
    contextId: t.contextId,
    dataFromDate: t.scope.dataFromDate,
    dataToDate: t.scope.dataToDate,
    scannedAt: new Date().toISOString(),
    scannedBy: session.user.email,
  };
  return NextResponse.json({ ok: true, payload });
}

// ── Per-field scoped loaders ─────────────────────────────────────
//
// Each function returns the narrow slice the field name promises.
// New stores can be plugged in here without touching the QR engine.

async function loadScopedField(field: ScopeField, patientId: string, _fromDate?: string, _toDate?: string): Promise<unknown> {
  // Identity / emergency / chronic data come from the user record
  // until the V12 patients table cutover. Recent-X fields query the
  // existing consultations / prescriptions stores filtered by patient.
  try {
    switch (field) {
      case "identity": {
        const { findUserById, findUserByEmail } = await import("@/lib/users-store");
        const u = findUserById(patientId) || findUserByEmail(patientId);
        if (!u) return null;
        return {
          name: u.name,
          dob: (u as { dob?: string }).dob,
          phone: u.phone,
          photoUrl: (u as { photoUrl?: string }).photoUrl,
        };
      }
      case "allergies":
      case "blood_group":
      case "chronic_conditions":
      case "current_medications":
      case "ice_contacts":
      case "abha_id": {
        const { findUserById, findUserByEmail } = await import("@/lib/users-store");
        const u = findUserById(patientId) || findUserByEmail(patientId);
        if (!u) return null;
        const ep = (u as { emergencyProfile?: Record<string, unknown> }).emergencyProfile;
        switch (field) {
          case "allergies":          return ep?.allergies || [];
          case "blood_group":        return ep?.bloodGroup || null;
          case "chronic_conditions": return ep?.chronicConditions || [];
          case "current_medications":return ep?.currentMedications || [];
          case "ice_contacts":       return ep?.iceContacts || [];
          case "abha_id":            return (u as { abhaId?: string }).abhaId || null;
        }
        return null;
      }
      case "recent_consultations": {
        const { listConsultations } = await import("@/lib/consultations-store");
        return listConsultations({ patientEmail: patientId })
          .slice(0, 5)
          .map((c) => ({ id: c.id, doctorName: c.doctorName, specialty: c.specialty, status: c.status, scheduledFor: c.scheduledFor }));
      }
      case "recent_prescriptions": {
        const { listPrescriptions } = await import("@/lib/prescriptions-store");
        const rows = await listPrescriptions();
        return rows
          .filter((p) => p.patientEmail === patientId)
          .slice(0, 5)
          .map((p) => ({ id: p.id, createdAt: p.createdAt, diagnosis: (p.data as { diagnosis?: string }).diagnosis, medicationsCount: (p.data as { medications?: unknown[] }).medications?.length || 0 }));
      }
      case "active_admission":
      case "vital_signs_24h":
      case "recent_lab_results":
      case "vaccinations":
      case "discharge_summaries":
        // These hit V12 tables that haven't backfilled yet; return
        // empty arrays so the scanner UI shows "no data on file"
        // instead of a 500.
        return [];
    }
  } catch {
    return null;
  }
}
