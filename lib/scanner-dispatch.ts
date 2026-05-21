// V15 of the Master Spec — universal scanner dispatch.
//
// OduDoc Pro has 12 scanner contexts. Rather than 12 different
// scan endpoints, the user clicks ONE "Scan" button and the
// dispatcher inspects the code and routes to the right resolver.
// This matches what nurses + pharmacists + reception actually
// do at the bedside / counter: they scan whatever is in front of
// them, the system figures out what it is.
//
// Code-shape routing (V15 §2.4):
//   identity / appointment / consent / emergency / wristband QR
//                                  44-char base64url       → V16 QR resolver
//   T-NNN                          OPD token                → V17 OPD start-consult
//   B-XXX-XXXXXXXXXX (16+ chars)   Drug pack serial         → V7 §3.6 anti-counterfeit
//   LAB-...                        Lab sample tube          → lab-orders lookup
//   VAX-...                        Vaccine vial             → vaccine cold-chain check
//   BLD-...                        Blood unit               → blood-bank cross-match
//   EQP-...                        Equipment asset          → biomedical maintenance
//   RX-...                         Prescription chit        → pharmacy fill
//   INS-...                        Insurance card           → policy lookup
//   MAR-...                        Pre-printed MAR barcode  → MAR administration
//   DRG- or 8-14-digit numeric     Drug barcode             → V15 §4 pharmacy stock
//
// The dispatcher returns a typed envelope { context, payload,
// nextAction? } so the scanner UI can render the right next-step
// affordance (e.g. "open the consult", "confirm stock entry").

import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";

export type ScannerContext =
  | "qr_token"           // V16 patient QR (identity/appointment/consent/emergency/wristband)
  | "opd_token"          // V17 OPD chit
  | "drug_pack_serial"   // V7 §3.6 anti-counterfeit pack
  | "lab_sample"
  | "vaccine_vial"
  | "blood_unit"
  | "equipment_asset"
  | "prescription"
  | "insurance_card"
  | "mar_drug_barcode"
  | "pharmacy_stock_barcode"
  | "unknown";

export interface DispatchResult {
  context: ScannerContext;
  /** Human-friendly label for the UI badge. */
  label: string;
  /** Whatever payload the resolver returned. */
  payload?: Record<string, unknown>;
  /** The action the UI should propose next. */
  nextAction?: {
    label: string;
    /** Server-side endpoint the UI may call. */
    endpoint?: string;
    /** Method to use. */
    method?: "GET" | "POST";
    /** Body the UI should POST. */
    body?: Record<string, unknown>;
  };
  error?: string;
}

/** Cheap classifier — looks at the code shape only. The resolver
 *  step actually fetches data. */
export function classify(rawCode: string): ScannerContext {
  const code = rawCode.trim();
  if (!code) return "unknown";

  // OPD tokens: short alphanumeric prefix "T-" followed by 3+ digits.
  if (/^T-\d{3,5}$/i.test(code)) return "opd_token";

  // Drug pack serial from V7 §3.6 — format "<batchNumber>-<10 alphanum>".
  // The batchNumber itself is whatever the pharma chose, but a common
  // shape is B-XXXXXX. Match anything with at least one dash + two
  // alphanumeric segments and a 10+ char suffix.
  if (/^[A-Z0-9]+-[A-Z0-9]{4,}-[A-Z0-9]{10}$/i.test(code) || /^[A-Z]+-[A-Z0-9]{4,}-[A-Z0-9]{8,}$/i.test(code)) {
    return "drug_pack_serial";
  }

  // Explicit prefixes.
  if (/^LAB-/i.test(code)) return "lab_sample";
  if (/^VAX-/i.test(code)) return "vaccine_vial";
  if (/^BLD-/i.test(code)) return "blood_unit";
  if (/^EQP-/i.test(code)) return "equipment_asset";
  if (/^RX-/i.test(code))  return "prescription";
  if (/^INS-/i.test(code)) return "insurance_card";
  if (/^MAR-/i.test(code)) return "mar_drug_barcode";

  // Drug barcode for pharmacy stock receipt (V15 §4) — either a
  // DRG- prefix OR a pure numeric EAN-13/UPC-12/EAN-8 (8-14 digits).
  if (/^DRG-/i.test(code)) return "pharmacy_stock_barcode";
  if (/^\d{8,14}$/.test(code)) return "pharmacy_stock_barcode";

  // V16 QR tokens — 32-byte base64url is 43-44 chars, all
  // base64url-safe characters.
  if (/^[A-Za-z0-9_-]{40,64}$/.test(code)) return "qr_token";

  return "unknown";
}

/** Resolve a scanned code. Returns { context, payload, nextAction }
 *  so the UI can decide what to render. Each resolver writes its
 *  own V13 event via the downstream store. */
export async function dispatchScan(rawCode: string, session: Session | null): Promise<DispatchResult> {
  const code = rawCode.trim();
  if (!code) return { context: "unknown", label: "Empty", error: "empty_code" };

  const ctx = classify(code);

  if (!session?.user?.email && ctx !== "drug_pack_serial") {
    // Anti-counterfeit verification is the only public scan; everything
    // else requires auth.
    return { context: ctx, label: contextLabel(ctx), error: "unauthenticated" };
  }

  switch (ctx) {
    case "qr_token": {
      const { resolveQr } = await import("@/lib/qr-store");
      const result = await resolveQr(code, {
        email: session!.user!.email!,
        role: session!.user!.role,
        doctorId: session!.user!.id,
      });
      if (!result.ok) {
        return { context: ctx, label: "Patient QR", error: result.error };
      }
      return {
        context: ctx,
        label: `Patient QR (${result.token!.kind})`,
        payload: { kind: result.token!.kind, patientId: result.token!.patientId, scope: result.token!.scope },
        nextAction: {
          label: result.token!.kind === "appointment" ? "Issue OPD token" : "Open patient",
          endpoint: result.token!.kind === "appointment" ? "/api/opd/issue" : undefined,
        },
      };
    }

    case "opd_token": {
      // The OPD token's display number is what scanners see; we look
      // it up by displayNumber (T-NNN), not by the opaque id.
      const { listOpdQueue } = await import("@/lib/opd-token-store");
      const all = await listOpdQueue({ liveOnly: false });
      const t = all.find((x) => x.displayNumber.toUpperCase() === code.toUpperCase());
      if (!t) return { context: ctx, label: "OPD token", error: "not_found" };
      return {
        context: ctx,
        label: `OPD ${t.displayNumber}`,
        payload: { id: t.id, displayNumber: t.displayNumber, patientName: t.patientName, doctorName: t.doctorName, status: t.status },
        nextAction: {
          label: t.status === "called" || t.status === "waiting" ? "Start consultation" : "View",
          endpoint: t.status === "called" || t.status === "waiting" ? `/api/opd/${t.id}/start-consult` : undefined,
          method: "POST",
        },
      };
    }

    case "drug_pack_serial": {
      const { verifySerial } = await import("@/lib/pharma-store");
      const result = await verifySerial(code, session?.user?.email || undefined);
      return {
        context: ctx,
        label: "Medicine pack",
        payload: { status: result.status, message: result.message, drug: result.drug, firstScannedAt: result.firstScannedAt },
      };
    }

    case "pharmacy_stock_barcode": {
      const { lookupBarcode } = await import("@/lib/pharmacy-stock-store");
      const hit = await lookupBarcode(code);
      if (!hit) {
        return {
          context: ctx,
          label: "Pharmacy stock barcode",
          error: "drug_not_in_master",
          // Allow staff to manually link this barcode to a drug.
          nextAction: { label: "Link barcode to drug master", endpoint: "/api/pharmacy/stock/link-barcode" },
        };
      }
      return {
        context: ctx,
        label: `Stock receive: ${hit.brandName || hit.drugInn}`,
        payload: hit as unknown as Record<string, unknown>,
        nextAction: {
          label: "Confirm stock receipt",
          endpoint: "/api/pharmacy/stock/receive",
          method: "POST",
          body: { barcode: code },
        },
      };
    }

    case "lab_sample": {
      // Sample barcode shape: LAB-<orderId>-<tubeIndex>. We lookup
      // the order by id (the suffix after LAB-).
      const orderId = code.replace(/^LAB-/i, "").split("-")[0];
      return {
        context: ctx,
        label: "Lab sample tube",
        payload: { orderId, sampleCode: code },
        nextAction: { label: "Open sample workflow", endpoint: `/api/lab-orders/${orderId}`, method: "GET" },
      };
    }

    case "vaccine_vial": {
      // V14 cold-chain check stub. We surface the intent so the
      // nurse UI can show "check vial monitor + fridge log" before
      // administering.
      return {
        context: ctx,
        label: "Vaccine vial",
        payload: { code },
        nextAction: { label: "Confirm cold-chain + administer" },
      };
    }

    case "blood_unit": {
      return {
        context: ctx,
        label: "Blood unit",
        payload: { code },
        nextAction: { label: "Cross-match + issue" },
      };
    }

    case "equipment_asset": {
      return {
        context: ctx,
        label: "Equipment asset",
        payload: { code },
        nextAction: { label: "Open maintenance log" },
      };
    }

    case "prescription": {
      const rxId = code.replace(/^RX-/i, "");
      return {
        context: ctx,
        label: "Prescription",
        payload: { rxId },
        nextAction: { label: "Fill prescription" },
      };
    }

    case "insurance_card": {
      const policyNumber = code.replace(/^INS-/i, "");
      return {
        context: ctx,
        label: "Insurance card",
        payload: { policyNumber },
        nextAction: { label: "Verify eligibility" },
      };
    }

    case "mar_drug_barcode": {
      return {
        context: ctx,
        label: "MAR drug barcode",
        payload: { code },
        nextAction: { label: "Confirm patient + dose" },
      };
    }

    default:
      return { context: "unknown", label: "Unknown code", error: "unrecognised" };
  }
}

export function contextLabel(c: ScannerContext): string {
  switch (c) {
    case "qr_token":               return "Patient QR";
    case "opd_token":              return "OPD token";
    case "drug_pack_serial":       return "Medicine pack";
    case "lab_sample":             return "Lab sample";
    case "vaccine_vial":           return "Vaccine vial";
    case "blood_unit":             return "Blood unit";
    case "equipment_asset":        return "Equipment";
    case "prescription":           return "Prescription";
    case "insurance_card":         return "Insurance card";
    case "mar_drug_barcode":       return "MAR drug barcode";
    case "pharmacy_stock_barcode": return "Pharmacy stock barcode";
    default:                       return "Unknown";
  }
}

/** Quick wrapper for an API route that takes a session-aware call. */
export async function dispatchFromRequest(rawCode: string): Promise<DispatchResult> {
  const session = await getServerSession(authOptions);
  return dispatchScan(rawCode, session);
}
