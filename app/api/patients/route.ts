import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  listPatients,
  createPatient,
  updatePatient,
  deletePatient,
  type Patient,
} from "@/lib/patients-store";
import { deleteEncountersForPatient } from "@/lib/encounters-store";
import { deletePrescriptionsForPatient } from "@/lib/hospital/prescriptions-store";
import { deleteLabOrdersForPatient } from "@/lib/hospital/lab-orders-store";
import { deleteInvoicesForPatient } from "@/lib/hospital/invoices-store";
import { deleteDispensesForPatient } from "@/lib/hospital/dispensing-store";
import { deleteAdmissionsForPatient } from "@/lib/hospital/admissions-store";
import { deleteBookingsForPatient } from "@/lib/hospital/surgery-store";
import { deleteOrdersForPatient as deleteRadiologyForPatient } from "@/lib/hospital/radiology-store";
import { deleteNotesForPatient as deleteVoiceForPatient } from "@/lib/hospital/voice-store";
import { deleteAppointmentsForPatient } from "@/lib/hospital/appointments-store";
import { deleteBloodDataForPatient } from "@/lib/hospital/bloodbank-store";
import { deleteVitalsForPatient } from "@/lib/hospital/vitals-store";
import { deleteInsuranceForPatient } from "@/lib/hospital/insurance-store";
import { deleteConsentForPatient } from "@/lib/hospital/consent-store";
import { deleteDischargeForPatient } from "@/lib/hospital/discharge-store";
import { deleteImmunizationsForPatient } from "@/lib/hospital/immunizations-store";
import { deleteAllergiesAndProblemsForPatient } from "@/lib/hospital/problems-store";
import { deleteReferralsForPatient } from "@/lib/hospital/referrals-store";
import { unlinkIncidentsForPatient } from "@/lib/hospital/incidents-store";
import { deleteDietaryForPatient } from "@/lib/hospital/dietary-store";
import { detachPatientFromEvents as detachHaiEventsForPatient } from "@/lib/hospital/infection-store";
import { detachPatientFromMortuary } from "@/lib/hospital/mortuary-store";
import { unlinkFeedbackForPatient } from "@/lib/hospital/feedback-store";
import { unlinkPassesForPatient } from "@/lib/hospital/visitors-store";
import { unlinkPatientFromHandovers } from "@/lib/hospital/handover-store";
import { unlinkDialysisForPatient } from "@/lib/hospital/dialysis-store";
import { unlinkCodesForPatient } from "@/lib/hospital/emergency-codes-store";
import { unlinkDeliveriesForPatient } from "@/lib/hospital/maternity-store";
import { unlinkPhysioForPatient } from "@/lib/hospital/physio-store";
import { unlinkOncologyForPatient } from "@/lib/hospital/oncology-store";
import { unlinkIcuForPatient } from "@/lib/hospital/icu-store";
import { unlinkWoundsForPatient } from "@/lib/hospital/wound-store";
import { unlinkEndoscopyForPatient } from "@/lib/hospital/endoscopy-store";
import { unlinkCardiologyForPatient } from "@/lib/hospital/cardiology-store";
import { unlinkPathologyForPatient } from "@/lib/hospital/pathology-store";
import { unlinkTelemedForPatient } from "@/lib/hospital/telemedicine-store";
import { unlinkPacForPatient } from "@/lib/hospital/pac-store";
import { unlinkPainForPatient } from "@/lib/hospital/pain-store";
import { unlinkMrdForPatient } from "@/lib/hospital/mrd-store";
import { unlinkOphthForPatient } from "@/lib/hospital/ophthalmology-store";
import { unlinkDentalForPatient } from "@/lib/hospital/dental-store";
import { unlinkPsychForPatient } from "@/lib/hospital/psychiatry-store";
import { unlinkEntForPatient } from "@/lib/hospital/ent-store";
import { unlinkOrthoForPatient } from "@/lib/hospital/ortho-store";
import { unlinkRehabForPatient } from "@/lib/hospital/rehab-store";
import { unlinkNursingCareForPatient } from "@/lib/hospital/nursing-care-store";
import { unlinkPreauthForPatient } from "@/lib/hospital/corporate-empanelment-store";
import { unlinkPathwayForPatient } from "@/lib/hospital/clinical-pathways-store";
import { unlinkAuditForPatient } from "@/lib/hospital/mortality-audit-store";
import { unlinkTumorBoardForPatient } from "@/lib/hospital/tumor-board-store";
import { unlinkReviewsForPatient as unlinkAmspForPatient } from "@/lib/hospital/antimicrobial-stewardship-store";
import { unlinkReceiptsForPatient } from "@/lib/hospital/ar-receipts-store";
import { unlinkNotificationsForPatient } from "@/lib/hospital/notifications-store";
import { unlinkCtmsForPatient } from "@/lib/hospital/ctms-store";
import { unlinkDocumentsForPatient } from "@/lib/hospital/documents-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handleError(e: unknown) {
  if (e instanceof TenantError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json({ error: "internal" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as Patient["status"]) || undefined;
    return NextResponse.json({
      patients: listPatients({ organizationId: orgId, search, status }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const body = await req.json();
    if (!body.firstName || !body.lastName || !body.gender) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const p = createPatient(orgId, {
      firstName: String(body.firstName),
      lastName: String(body.lastName),
      gender: body.gender,
      dateOfBirth: body.dateOfBirth,
      phone: body.phone,
      email: body.email,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      city: body.city,
      state: body.state,
      country: body.country,
      postalCode: body.postalCode,
      bloodGroup: body.bloodGroup,
      allergies: body.allergies,
      chronicConditions: body.chronicConditions,
      currentMedications: body.currentMedications,
      emergencyContactName: body.emergencyContactName,
      emergencyContactPhone: body.emergencyContactPhone,
      emergencyContactRelation: body.emergencyContactRelation,
      insuranceProvider: body.insuranceProvider,
      insurancePolicyNumber: body.insurancePolicyNumber,
      notes: body.notes,
    });
    return NextResponse.json({ patient: p });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const updated = updatePatient(String(body.id), orgId, body);
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ patient: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = deletePatient(String(body.id), orgId);
    if (ok) {
      deleteEncountersForPatient(String(body.id), orgId);
      deletePrescriptionsForPatient(String(body.id), orgId);
      deleteLabOrdersForPatient(String(body.id), orgId);
      deleteInvoicesForPatient(String(body.id), orgId);
      deleteDispensesForPatient(String(body.id), orgId);
      deleteAdmissionsForPatient(String(body.id), orgId);
      deleteBookingsForPatient(String(body.id), orgId);
      deleteRadiologyForPatient(String(body.id), orgId);
      deleteVoiceForPatient(String(body.id), orgId);
      deleteAppointmentsForPatient(String(body.id), orgId);
      deleteBloodDataForPatient(String(body.id), orgId);
      deleteVitalsForPatient(String(body.id), orgId);
      deleteInsuranceForPatient(String(body.id), orgId);
      deleteConsentForPatient(String(body.id), orgId);
      deleteDischargeForPatient(String(body.id), orgId);
      deleteImmunizationsForPatient(String(body.id), orgId);
      deleteAllergiesAndProblemsForPatient(String(body.id), orgId);
      deleteReferralsForPatient(String(body.id), orgId);
      unlinkIncidentsForPatient(String(body.id), orgId);
      deleteDietaryForPatient(String(body.id), orgId);
      detachHaiEventsForPatient(String(body.id), orgId);
      detachPatientFromMortuary(String(body.id), orgId);
      unlinkFeedbackForPatient(String(body.id), orgId);
      unlinkPassesForPatient(String(body.id), orgId);
      unlinkPatientFromHandovers(String(body.id), orgId);
      unlinkDialysisForPatient(String(body.id), orgId);
      unlinkCodesForPatient(String(body.id), orgId);
      unlinkDeliveriesForPatient(String(body.id), orgId);
      unlinkPhysioForPatient(String(body.id), orgId);
      unlinkOncologyForPatient(String(body.id), orgId);
      unlinkIcuForPatient(String(body.id), orgId);
      unlinkWoundsForPatient(String(body.id), orgId);
      unlinkEndoscopyForPatient(String(body.id), orgId);
      unlinkCardiologyForPatient(String(body.id), orgId);
      unlinkPathologyForPatient(String(body.id), orgId);
      unlinkTelemedForPatient(String(body.id), orgId);
      unlinkPacForPatient(String(body.id), orgId);
      unlinkPainForPatient(String(body.id), orgId);
      unlinkMrdForPatient(String(body.id), orgId);
      unlinkOphthForPatient(String(body.id), orgId);
      unlinkDentalForPatient(String(body.id), orgId);
      unlinkPsychForPatient(String(body.id), orgId);
      unlinkEntForPatient(String(body.id), orgId);
      unlinkOrthoForPatient(String(body.id), orgId);
      unlinkRehabForPatient(String(body.id), orgId);
      unlinkNursingCareForPatient(String(body.id), orgId);
      unlinkPreauthForPatient(String(body.id), orgId);
      unlinkPathwayForPatient(String(body.id), orgId);
      unlinkAuditForPatient(String(body.id), orgId);
      unlinkTumorBoardForPatient(String(body.id), orgId);
      unlinkAmspForPatient(String(body.id), orgId);
      unlinkReceiptsForPatient(String(body.id), orgId);
      unlinkNotificationsForPatient(String(body.id), orgId);
      unlinkCtmsForPatient(String(body.id), orgId);
      unlinkDocumentsForPatient(String(body.id), orgId);
    }
    return NextResponse.json({ ok });
  } catch (e) {
    return handleError(e);
  }
}
