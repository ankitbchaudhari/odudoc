// Clinic-side scan endpoint.
//
// POST { token: string }
//
// Verifies the token signature, identifies the patient, checks if the
// patient has granted active consent to the scanning clinic (the
// active-org of the request), and either:
//
//   - returns the assembled passport bundle on consent_active, OR
//   - returns 403 with code "consent_required" + a `requestUrl` deep-
//     link the patient can scan/tap to issue a fresh consent grant.
//
// Audit-logged on every successful and failed read.

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  verifyPassportToken,
  assemblePassportBundle,
} from "@/lib/health-passport";
import {
  findActiveConsent,
  tickScan,
} from "@/lib/health-passport-store";
import { recordAudit } from "@/lib/audit-log-store";
import { getOrganizationById } from "@/lib/organizations-store";
import { findUserById } from "@/lib/users-store";
import { getDependentById } from "@/lib/family-store";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const body = await req.json();
    const token = String(body.token || "").trim();
    if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

    const verified = verifyPassportToken(token);
    if (!verified) {
      return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    }

    const consent = findActiveConsent(
      verified.ownerUserId,
      verified.dependentId || null,
      orgId,
    );

    const session = await getServerSession(authOptions);
    const orgName = getOrganizationById(orgId)?.name;

    // Identify the patient for audit + UI even when consent is missing —
    // the clinic should at minimum see "name + medical-id" so the patient
    // can be identified at the front desk.
    let patientName = "Unknown";
    if (verified.dependentId) {
      const d = getDependentById(verified.dependentId);
      if (d && d.ownerUserId === verified.ownerUserId) patientName = d.name;
    } else {
      const u = findUserById(verified.ownerUserId);
      if (u) patientName = u.name;
    }

    if (!consent) {
      // Build a deep-link the patient can tap to issue consent. The
      // path uses a signed pre-fill query string; the consent page
      // verifies the token before showing the grant UI.
      const requestUrl = `/dashboard/health-passport/grant?token=${encodeURIComponent(token)}&org=${encodeURIComponent(orgId)}`;
      recordAudit({
        actorEmail: session?.user?.email || "system",
        action: "user.update",
        orgId,
        orgName,
        summary: `Passport scan blocked — no active consent for ${patientName}`,
        meta: { ownerUserId: verified.ownerUserId, dependentId: verified.dependentId, jti: verified.jti },
      });
      return NextResponse.json(
        {
          error: "consent_required",
          patient: {
            name: patientName,
            medicalId: verified.medicalId,
            // Canonical Medical ID is already `NNN-NNNNN-NNNNN-NNN`.
            // Keep formattedMedicalId === medicalId so /profile and
            // the health-passport surfaces show identical strings.
            formattedMedicalId: verified.medicalId,
          },
          requestUrl,
        },
        { status: 403 },
      );
    }

    const bundle = assemblePassportBundle(verified, consent);
    if (!bundle) {
      return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
    }

    tickScan(consent.id);
    recordAudit({
      actorEmail: session?.user?.email || "system",
      action: "user.update",
      orgId,
      orgName,
      summary: `Passport scanned for ${patientName}`,
      meta: {
        ownerUserId: verified.ownerUserId,
        dependentId: verified.dependentId,
        consentId: consent.id,
        scopes: consent.scopes,
        scanCount: consent.scanCount + 1,
      },
    });

    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({
      bundle,
      consent: {
        id: consent.id,
        scopes: consent.scopes,
        expiresAt: consent.expiresAt,
        scanCount: consent.scanCount + 1,
      },
    });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
