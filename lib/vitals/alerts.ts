// Vital-sign alert routing.
//
// When a patient logs a critical reading, fan out a notification
// to every doctor currently assigned to that patient's active
// admission. If the patient isn't admitted (outpatient, at home),
// no fan-out — the patient's own dashboard surfaces the warning
// already.
//
// Idempotency: keyed on the reading id so the same critical reading
// firing through multiple code paths (POST /api/vitals + a future
// websocket) still produces one alert per assigned doctor.

import { classify, VitalReading, VITAL_LABEL } from "./store";
import { findActiveAdmissionForPatient } from "../hospital/admissions-store";
import { findUserByEmail } from "../users-store";
import { pushNotification } from "../notifications/store";

export function maybeAlertOnReading(reading: VitalReading): { alertedDoctorEmails: string[] } {
  const sev = classify(reading);
  if (sev !== "critical") return { alertedDoctorEmails: [] };

  // Vital store keys readings on userId. We check whether that user
  // is currently admitted in any hospital and route to their care
  // team. patientId == userId in the demo-grade store; production
  // multi-tenant builds may need a separate lookup.
  const adm = findActiveAdmissionForPatient(reading.userId);
  if (!adm) return { alertedDoctorEmails: [] };
  const doctors = adm.assignedDoctorEmails || [];
  if (doctors.length === 0) return { alertedDoctorEmails: [] };

  const value = reading.kind === "bp"
    ? `${reading.value}/${reading.value2 ?? "?"} mmHg`
    : `${reading.value} ${reading.unit}`;
  const title = `Critical ${VITAL_LABEL[reading.kind].toLowerCase()}: ${value}`;
  const body = `Patient ${reading.userId} · ward ${adm.currentWardId || "?"} · bed ${adm.currentBedId || "?"}. Reading at ${new Date(reading.takenAt).toLocaleTimeString()}.`;

  for (const email of doctors) {
    const u = findUserByEmail(email);
    if (!u) continue;
    pushNotification({
      userId: u.id,
      kind: "system",
      severity: "critical",
      title,
      body,
      link: `/admin/admissions`, // ops console for now; ward-board page comes next batch
      reference: `vital_alert:${reading.id}:${u.id}`,
    });
  }
  return { alertedDoctorEmails: doctors };
}
