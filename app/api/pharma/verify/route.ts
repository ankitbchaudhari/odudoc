// Combined doctor-side verification endpoint.
//
// Doctor / pharmacist scans or types a brand + batch + reseller
// claim, this returns a single verdict combining catalogue
// verification (is the brand+batch genuine?) and partner verification
// (is the reseller authorized to sell this brand?).
//
// Three outcomes the caller cares about:
//   "verified"        — both registry hits clean
//   "warning"         — one of two checks flagged
//   "counterfeit_risk" — brand not registered OR partner not found

import { NextRequest, NextResponse } from "next/server";
import { verifyBrandBatch } from "@/lib/pharma/catalogue-store";
import { verifyPartner } from "@/lib/pharma/partners-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.brandName) return NextResponse.json({ error: "missing_brand" }, { status: 400 });
  const drug = verifyBrandBatch(String(body.brandName), body.batchNumber);
  const partner = body.partnerIdentifier
    ? verifyPartner({ identifier: String(body.partnerIdentifier), brandName: String(body.brandName) })
    : null;

  // Decide verdict.
  let verdict: "verified" | "warning" | "counterfeit_risk";
  const reasons: string[] = [];

  if (!drug) {
    verdict = "counterfeit_risk";
    reasons.push("brand_not_in_registry");
  } else if (drug.match === "brand_only" && body.batchNumber) {
    verdict = "warning";
    reasons.push("batch_not_in_registry");
  } else {
    verdict = "verified";
  }

  if (partner) {
    if (partner.status === "not_found") {
      verdict = "counterfeit_risk";
      reasons.push("partner_not_in_registry");
    } else if (partner.status === "expired") {
      verdict = verdict === "counterfeit_risk" ? verdict : "warning";
      reasons.push("partner_authorization_expired");
    } else if (partner.status === "wrong_brand") {
      verdict = "counterfeit_risk";
      reasons.push("partner_not_authorized_for_brand");
    } else if (partner.status === "inactive") {
      verdict = verdict === "counterfeit_risk" ? verdict : "warning";
      reasons.push("partner_inactive");
    }
  }

  return NextResponse.json({
    verdict,
    reasons,
    drug,
    partner,
  });
}
