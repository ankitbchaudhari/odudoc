// Cross-org doctor directory.
//
// Returns doctors visible across the active org's connected partner
// organizations, plus doctors in the active org itself. Filterable
// by specialty, city, and free-text search. Useful for "find me a
// cardiologist available this week, anywhere in the network" — the
// caller can then refer the patient with two clicks.
//
// Org scoping: doctors are linked to orgs by Membership rows
// (role: "doctor"). For each connected partner we resolve their
// doctor-role memberships, then enrich with the canonical doctor
// record from doctors-store via email match. Doctors that don't have
// a Membership in any connected org (the bulk of legacy data, since
// memberships are a recent addition) are filtered out so we never
// leak data between unrelated orgs.

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  listConnectedPartnerIds,
  reloadConnections,
} from "@/lib/inter-org-network-store";
import {
  getMembershipsForOrg,
  reloadMemberships,
} from "@/lib/memberships-store";
import { findUserById } from "@/lib/users-store";
import {
  findDoctorByEmail,
  reloadDoctors,
  isInstantlyAvailable,
} from "@/lib/doctors-store";
import { getOrganizationById } from "@/lib/organizations-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DirectoryEntry {
  doctorId: string;
  name: string;
  specialty: string;
  qualifications?: string;
  experience?: number;
  city?: string;
  rating?: number;
  fee?: number;
  photoUrl?: string;
  instantAvailable: boolean;
  verified: boolean;
  // Provenance — which org employs them. Useful for "refer to Apollo".
  orgId: string;
  orgName: string;
}

export async function GET(req: NextRequest) {
  try {
    const { orgId, ctx } = await requireOrg();
    await Promise.all([reloadConnections(), reloadMemberships(), reloadDoctors()]);

    const url = new URL(req.url);
    const specialty = url.searchParams.get("specialty")?.trim().toLowerCase() || "";
    const city = url.searchParams.get("city")?.trim().toLowerCase() || "";
    const search = url.searchParams.get("q")?.trim().toLowerCase() || "";
    const onlyInstant = url.searchParams.get("instant") === "1";

    // Network = own org + every connected partner. Super-admins see
    // everything (they impersonate orgs anyway, but we'd rather be
    // permissive here since cross-org reads carry no consent risk —
    // it's the directory of providers, not patient data).
    const partnerIds = ctx.isSuperAdmin
      ? // For super-admins, "network" = every org with any membership;
        // we approximate by union of partner ids + the active one. The
        // page lets them widen if needed.
        [orgId, ...listConnectedPartnerIds(orgId)]
      : [orgId, ...listConnectedPartnerIds(orgId)];

    const entries: DirectoryEntry[] = [];
    for (const oid of partnerIds) {
      const org = getOrganizationById(oid);
      if (!org) continue;
      const memberships = getMembershipsForOrg(oid).filter(
        (m) => m.role === "doctor",
      );
      for (const m of memberships) {
        const u = findUserById(m.userId);
        if (!u) continue;
        const d = findDoctorByEmail(u.email);
        if (!d) continue;
        entries.push({
          doctorId: d.id,
          name: d.name,
          specialty: d.specialty,
          qualifications: d.qualifications,
          experience: d.experience,
          city: d.city,
          rating: d.rating,
          fee: d.fee,
          photoUrl: d.imageUrl,
          instantAvailable: isInstantlyAvailable(d),
          verified: d.verified === true,
          orgId: oid,
          orgName: org.name,
        });
      }
    }

    let filtered = entries;
    if (specialty) {
      filtered = filtered.filter((e) =>
        e.specialty.toLowerCase().includes(specialty),
      );
    }
    if (city) {
      filtered = filtered.filter((e) =>
        (e.city || "").toLowerCase().includes(city),
      );
    }
    if (search) {
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(search) ||
          e.specialty.toLowerCase().includes(search) ||
          e.orgName.toLowerCase().includes(search),
      );
    }
    if (onlyInstant) {
      filtered = filtered.filter((e) => e.instantAvailable);
    }
    // Verified + highest-rated first; instant-available bumps a doctor
    // up in ties so the urgent-referral case has a usable default sort.
    filtered.sort((a, b) => {
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      if (a.instantAvailable !== b.instantAvailable)
        return a.instantAvailable ? -1 : 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    return NextResponse.json({
      doctors: filtered,
      networkSize: partnerIds.length,
    });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
