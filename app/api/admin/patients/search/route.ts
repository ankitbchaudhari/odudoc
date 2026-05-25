// Universal patient-lookup API for admin / professional surfaces.
//
//   POST /api/admin/patients/search
//   body: { type, value, phoneCountryCode?, govtIdCountry?, currentVisitId? }
//
// Always scoped to the caller's active organization (super-admins
// can pass ?orgId=org-XXXX to search any tenant). Results are
// redacted via lib/patient-acl before being returned, so the
// pharmacist gets only the prescription-relevant fields, the
// receptionist sees demographics, etc.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { listPatients } from "@/lib/patients-store";
import { runPatientSearch, type PatientSearchType } from "@/lib/patient-search";
import {
  aclRoleFromClinicRole,
  redactPatientForRole,
  type AclRole,
} from "@/lib/patient-acl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: PatientSearchType[] = [
  "phone",
  "name",
  "patient-id",
  "insurance",
  "govt-id",
  "national-health-id",
];

interface Body {
  type?: string;
  value?: string;
  phoneCountryCode?: string;
  govtIdCountry?: string;
  healthSystemId?: string;
  currentVisitId?: string;
  orgId?: string; // super-admin override
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const type = body.type as PatientSearchType | undefined;
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  if (!body.value || typeof body.value !== "string" || !body.value.trim()) {
    return NextResponse.json({ error: "missing_value" }, { status: 400 });
  }

  // Resolve the org scope. Super-admins can target a specific tenant
  // via ?orgId; everyone else is locked to their active org.
  const ctx = await getTenantContext();
  const targetOrgId =
    ctx.isSuperAdmin && body.orgId ? body.orgId : ctx.organization?.id;
  if (!targetOrgId) {
    return NextResponse.json({ error: "no_active_org" }, { status: 400 });
  }

  // Resolve the caller's effective ACL role. Super-admins see
  // everything (mapped to doctor_treating); tenant members get the
  // role from their membership.
  let aclRole: AclRole;
  if (ctx.isSuperAdmin) {
    aclRole = "doctor_treating";
  } else {
    aclRole = aclRoleFromClinicRole(ctx.membership?.role);
  }

  // Pull the org's full patient list, then run the typed query.
  const all = listPatients({ organizationId: targetOrgId });
  const matches = runPatientSearch(all, {
    type,
    value: body.value,
    phoneCountryCode: body.phoneCountryCode,
    govtIdCountry: body.govtIdCountry,
    healthSystemId: body.healthSystemId,
  });

  // Redact each match for the caller's role. The redactor operates on
  // a "RedactablePatient" shape — we map the store Patient onto it
  // before passing through, so cross-store fields (visits, labs, etc.)
  // that the caller may not load are simply absent.
  const requesterEmail = ctx.email || undefined;
  const redacted = matches.map((p) => {
    const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ");
    const r = redactPatientForRole(
      {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        sex: p.gender,
        phone: p.phone,
        email: p.email,
        address: [p.addressLine1, p.city, p.country].filter(Boolean).join(", "),
        bloodGroup: p.bloodGroup,
        allergies: p.allergies?.join(", "),
        chronicConditions: p.chronicConditions?.join(", "),
        notes: p.notes,
      },
      aclRole,
      { currentVisitId: body.currentVisitId, requesterEmail },
    );
    // Always echo the MRN — every role needs a stable handle to open
    // the patient's chart, even when demographics are otherwise
    // hidden. The MRN is per-org and considered safe.
    return {
      ...r,
      mrn: p.mrn,
      // Mirror the redacted name + a couple of contextual hints into
      // the top-level so the UI doesn't have to dig into the verdicts
      // map for a result list.
      fullName: r.patient.firstName
        ? `${r.patient.firstName}${r.patient.lastName ? " " + r.patient.lastName : ""}`
        : "[redacted]",
      _meta: {
        searchedName: fullName,
        hasInsurance: !!p.insurancePolicyNumber,
        hasGovtId: (p.governmentIds || []).length > 0,
        updatedAt: p.updatedAt,
      },
    };
  });

  return NextResponse.json({
    role: aclRole,
    isSuperAdmin: ctx.isSuperAdmin,
    organizationId: targetOrgId,
    count: redacted.length,
    results: redacted,
  });
}
