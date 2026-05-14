// Prescription prefill helper — shared between the manual, AI, and
// voice prescription pages. When a doctor lands on any of those pages
// with a `?patientId=` or `?consultationId=` query param, this hook
// fetches the matching record and returns a `Partial<PrescriptionData>`
// the page can merge into its own form state.
//
// The hook is opt-in: when the query params are absent, `prefill`
// stays `null` and the page behaves exactly as before. It also pulls
// the signed-in doctor's profile (when /api/doctors/me succeeds) so
// clinic + identity fields auto-populate without re-typing.

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PrescriptionData } from "./prescription-templates";
import { log } from "./log";

export interface PrescriptionPrefillState {
  loading: boolean;
  prefill: Partial<PrescriptionData> | null;
  error: string | null;
  /** Human-readable label for the prefill source ("Patient #MRN-…",
   *  "Consultation with Jane Doe — May 14, 2026") or null when the
   *  hook isn't prefilling from any source. */
  sourceLabel: string | null;
}

interface EmrPatient {
  id: string;
  firstName?: string;
  lastName?: string;
  age?: string;
  sex?: string;
  phone?: string;
  email?: string;
}

interface DoctorMe {
  name?: string;
  email?: string;
  specialty?: string;
  qualifications?: string;
  licenseNumber?: string;
  location?: string;
  city?: string;
  phone?: string;
}

interface ConsultationLike {
  id: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  scheduledFor?: string;
  dateLabel?: string;
  medicalHistory?: {
    chiefComplaint?: string;
    symptoms?: string;
    allergies?: string;
    currentMedications?: string;
  };
}

function mapDoctor(d: DoctorMe | undefined): Partial<PrescriptionData> {
  if (!d) return {};
  const clinicAddress = [d.location, d.city].filter(Boolean).join(", ");
  return {
    doctorName: d.name || undefined,
    doctorQualification: d.qualifications || undefined,
    doctorRegistration: d.licenseNumber || undefined,
    doctorSpecialty: d.specialty || undefined,
    clinicAddress: clinicAddress || undefined,
    clinicPhone: d.phone || undefined,
    clinicEmail: d.email || undefined,
    signature: d.name || undefined,
  };
}

function mapPatient(p: EmrPatient): Partial<PrescriptionData> {
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  const genderMap: Record<string, string> = {
    male: "Male",
    female: "Female",
    m: "Male",
    f: "Female",
    other: "Other",
  };
  const g = p.sex ? genderMap[p.sex.toLowerCase()] || p.sex : undefined;
  return {
    patientName: fullName || undefined,
    patientAge: p.age || undefined,
    patientGender: g,
    patientPhone: p.phone || undefined,
    patientId: p.id,
  };
}

function mapConsultation(c: ConsultationLike): Partial<PrescriptionData> {
  const mh = c.medicalHistory || {};
  const sym = [mh.chiefComplaint, mh.symptoms].filter(Boolean).join(" — ");
  return {
    patientName: c.patientName || undefined,
    patientPhone: c.patientPhone || undefined,
    patientId: c.id,
    symptoms: sym || undefined,
  };
}

/** Strip undefined / empty entries so consumers can do a simple
 *  truthy-check when deciding whether to overwrite a form field. */
function compact(input: Partial<PrescriptionData>): Partial<PrescriptionData> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out as Partial<PrescriptionData>;
}

export function usePrescriptionPrefill(): PrescriptionPrefillState {
  const searchParams = useSearchParams();
  const patientId = searchParams?.get("patientId") || null;
  const consultationId = searchParams?.get("consultationId") || null;

  const [state, setState] = useState<PrescriptionPrefillState>({
    loading: Boolean(patientId || consultationId),
    prefill: null,
    error: null,
    sourceLabel: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const merged: Partial<PrescriptionData> = {};
      let sourceLabel: string | null = null;
      let errorMsg: string | null = null;

      // Doctor profile — always attempt, graceful fallback. Doctors
      // who don't have a profile row simply see empty identity
      // fields they can fill in once and save via existing flows.
      try {
        const res = await fetch("/api/doctors/me", { cache: "no-store" });
        if (res.ok) {
          const j = (await res.json()) as { doctor?: DoctorMe };
          Object.assign(merged, mapDoctor(j.doctor));
        }
      } catch (err) {
        log.warn("rx-prefill.doctor_fetch_failed", {
          err: (err as Error).message,
        });
      }

      if (patientId) {
        try {
          const res = await fetch(`/api/emr/patients/${encodeURIComponent(patientId)}`, {
            cache: "no-store",
          });
          if (res.ok) {
            const j = (await res.json()) as { patient?: EmrPatient };
            if (j.patient) {
              Object.assign(merged, mapPatient(j.patient));
              sourceLabel = `Pre-filled from Patient #${j.patient.id}`;
            }
          } else {
            errorMsg = "Could not load patient details.";
          }
        } catch (err) {
          errorMsg = "Could not load patient details.";
          log.warn("rx-prefill.patient_fetch_failed", {
            err: (err as Error).message,
            patientId,
          });
        }
      }

      if (consultationId) {
        try {
          const res = await fetch(
            `/api/consultations/${encodeURIComponent(consultationId)}`,
            { cache: "no-store" },
          );
          if (res.ok) {
            const j = (await res.json()) as { consultation?: ConsultationLike };
            if (j.consultation) {
              Object.assign(merged, mapConsultation(j.consultation));
              const when = j.consultation.dateLabel || "";
              const name = j.consultation.patientName || "patient";
              sourceLabel = `Pre-filled from Consultation with ${name}${when ? ` — ${when}` : ""}`;
            }
          } else {
            errorMsg = "Could not load consultation details.";
          }
        } catch (err) {
          errorMsg = "Could not load consultation details.";
          log.warn("rx-prefill.consultation_fetch_failed", {
            err: (err as Error).message,
            consultationId,
          });
        }
      }

      if (cancelled) return;
      const compacted = compact(merged);
      const hasAnything = Object.keys(compacted).length > 0;
      // Only return prefill when we either had source-record params
      // OR doctor-profile data — otherwise leave it null so pages can
      // skip the merge effect entirely.
      const hadSourceParam = Boolean(patientId || consultationId);
      setState({
        loading: false,
        prefill: hasAnything ? compacted : null,
        error: errorMsg,
        sourceLabel: hadSourceParam ? sourceLabel : null,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [patientId, consultationId]);

  return state;
}
