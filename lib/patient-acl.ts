// Patient data access — role-based visibility matrix.
//
// Implements the ACL described in the product spec: per-field redaction
// of patient records based on the requester's effective role within the
// clinic. The existing emr-store ClinicAccess already enforces clinic
// isolation (you can only see patients in clinics you belong to). This
// module adds the next layer: even within a clinic, different staff
// roles see different fields.
//
// Mapping from existing ClinicAccess.role → AclRole:
//   "admin"                         → "doctor_treating" (admin is super-user)
//   "owner"                         → "doctor_treating" (clinic owner)
//   "doctor" (staff doctor)         → "doctor_treating" (any staff doctor
//                                     in the same clinic is treated as
//                                     a treating doctor for that record;
//                                     true cross-doctor isolation requires
//                                     explicit referral, future work)
//   "nurse"                         → "nurse"
//   "frontdesk"                     → "reception"
//   "billing" (extended StaffRole)  → "billing"
//   "lab_tech" (extended StaffRole) → "lab_tech"
//   no clinic affiliation           → "doctor_other" (no access)
//
// Cross-clinic / inter-hospital sharing is NOT granted by this module.
// The ownerEmail filter in resolveClinic prevents that today; opt-in
// digital consent is future work.

export type AclRole =
  | "doctor_treating"
  | "doctor_other"
  | "nurse"
  | "reception"
  | "billing"
  | "lab_tech";

export type AclField =
  | "fullPastHistory"
  | "diagnosisList"
  | "prescriptions"
  | "labResults"
  | "imagingReports"
  | "vitalsNursing"
  | "demographicsContact"
  | "billPayment"
  | "psychiatricSensitive";

/** Granular verdicts. "full" / "hidden" are the common cases; the
 *  others encode partial visibility (current visit only, name + ID
 *  only, etc.). Callers translate the verdict into the actual data
 *  shape via redactPatientForRole(). */
export type AclVerdict =
  | "full"
  | "hidden"
  | "current_visit_only"   // labs / diagnosis: only the active visit
  | "active_rx_only"       // prescriptions: only currently-active Rx
  | "test_name_only"       // labs: name only, no values
  | "own_tests_only"       // labs: only the entries this user authored/ordered
  | "billing_code_only"    // imaging: billing code, no clinical detail
  | "name_id_only"         // demographics: name + patient id only
  | "status_only"          // bill: paid/unpaid status, no amounts
  | "with_consent_flag";   // psychiatric/sensitive: requires explicit consent

const FULL: AclVerdict = "full";
const HIDDEN: AclVerdict = "hidden";

/**
 * The matrix from the product spec. Each row = data field, each column
 * = role, cell = AclVerdict. Edit this object to change the policy —
 * everything downstream reads from it.
 */
export const PATIENT_ACL: Record<AclField, Record<AclRole, AclVerdict>> = {
  fullPastHistory: {
    doctor_treating: FULL,
    doctor_other:    HIDDEN,
    nurse:           HIDDEN,
    reception:       HIDDEN,
    billing:         HIDDEN,
    lab_tech:        HIDDEN,
  },
  diagnosisList: {
    doctor_treating: FULL,
    doctor_other:    HIDDEN,
    nurse:           "current_visit_only",
    reception:       HIDDEN,
    billing:         HIDDEN,
    lab_tech:        HIDDEN,
  },
  prescriptions: {
    doctor_treating: FULL,
    doctor_other:    HIDDEN,
    nurse:           "active_rx_only",
    reception:       HIDDEN,
    billing:         HIDDEN,
    lab_tech:        HIDDEN,
  },
  labResults: {
    doctor_treating: FULL,
    doctor_other:    HIDDEN,
    nurse:           "current_visit_only",
    reception:       HIDDEN,
    billing:         "test_name_only",
    lab_tech:        "own_tests_only",
  },
  imagingReports: {
    doctor_treating: FULL,
    doctor_other:    HIDDEN,
    nurse:           HIDDEN,
    reception:       HIDDEN,
    billing:         "billing_code_only",
    lab_tech:        HIDDEN,
  },
  vitalsNursing: {
    doctor_treating: FULL,
    doctor_other:    HIDDEN,
    nurse:           FULL,
    reception:       HIDDEN,
    billing:         HIDDEN,
    lab_tech:        HIDDEN,
  },
  demographicsContact: {
    doctor_treating: FULL,
    doctor_other:    HIDDEN,
    nurse:           FULL,
    reception:       FULL,
    billing:         FULL,
    lab_tech:        "name_id_only",
  },
  billPayment: {
    doctor_treating: HIDDEN, // doctors don't see the bill in this matrix
    doctor_other:    HIDDEN,
    nurse:           HIDDEN,
    reception:       "status_only",
    billing:         FULL,
    lab_tech:        HIDDEN,
  },
  psychiatricSensitive: {
    // Always gated. Even the treating doctor needs the patient's
    // explicit consent flag set on the record before this surfaces.
    doctor_treating: "with_consent_flag",
    doctor_other:    HIDDEN,
    nurse:           HIDDEN,
    reception:       HIDDEN,
    billing:         HIDDEN,
    lab_tech:        HIDDEN,
  },
};

/** Translate a ConsentScope (from patient-consent-store) into the
 *  AclRole that best represents what the receiving clinic is allowed
 *  to see. Used by cross-clinic read paths after activeConsentScope()
 *  returns a non-null scope.
 *
 *  - demographics_only → "reception" (sees demographics only)
 *  - summary           → "nurse"     (current visit dx + active Rx)
 *  - full_chart        → "doctor_treating" (full record)
 *  - psychiatric       → "doctor_treating" (caller still needs the
 *                        patient's psychiatricConsent flag set on
 *                        the record itself for that section to
 *                        actually render)
 */
export function aclRoleFromConsentScope(
  scope: "demographics_only" | "summary" | "full_chart" | "psychiatric",
): AclRole {
  switch (scope) {
    case "demographics_only": return "reception";
    case "summary":           return "nurse";
    case "full_chart":        return "doctor_treating";
    case "psychiatric":       return "doctor_treating";
  }
}

/** Map an emr-store ClinicAccess.role to an AclRole. Unknown roles
 *  fall through to "doctor_other" (locked out). */
export function aclRoleFromClinicRole(
  role: string | undefined,
): AclRole {
  switch (role) {
    case "admin":
    case "owner":
    case "doctor":
      return "doctor_treating";
    case "nurse":
      return "nurse";
    case "frontdesk":
    case "reception":
      return "reception";
    case "billing":
      return "billing";
    case "lab_tech":
    case "lab":
      return "lab_tech";
    default:
      return "doctor_other";
  }
}

/** Look up the verdict for a (field, role) pair. Defaults to
 *  "hidden" if the matrix doesn't list the role — fail-closed. */
export function aclVerdict(field: AclField, role: AclRole): AclVerdict {
  return PATIENT_ACL[field]?.[role] ?? HIDDEN;
}

/** Convenience boolean: does this role get any visibility on this
 *  field? Useful for hiding entire UI sections for a role. */
export function aclCanSee(field: AclField, role: AclRole): boolean {
  return aclVerdict(field, role) !== HIDDEN;
}

/* ============================================================ */
/*  Redaction helpers                                           */
/* ============================================================ */

/** Minimal shape we redact. Pass in a richer patient object and we
 *  return a role-appropriate subset. Extra fields on the input are
 *  preserved on the output unless explicitly redacted. */
export interface RedactablePatient {
  id: string;
  firstName: string;
  lastName: string;
  age?: string;
  sex?: string;
  phone?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  notes?: string;
  /** Optional: the patient's recent visits, lab results, etc. */
  visits?: Array<{ id: string; visitDate: string; assessment?: string; vitals?: string; [k: string]: unknown }>;
  prescriptions?: Array<{ id: string; status?: string; [k: string]: unknown }>;
  labs?: Array<{ id: string; testName?: string; orderedBy?: string; visitId?: string; [k: string]: unknown }>;
  imaging?: Array<{ id: string; billingCode?: string; [k: string]: unknown }>;
  bills?: Array<{ id: string; status?: string; total?: number; [k: string]: unknown }>;
  /** True when the patient has signed the psychiatric-data consent. */
  psychiatricConsent?: boolean;
  /** Sensitive content unlocked by `psychiatricConsent`. */
  psychiatric?: { history?: string; medications?: string; [k: string]: unknown };
  [k: string]: unknown;
}

export interface RedactionContext {
  /** The visit currently being viewed, if any. Drives `current_visit_only`
   *  filters for nurses (diagnoses & labs). */
  currentVisitId?: string;
  /** The user requesting the data. Drives `own_tests_only` for lab
   *  techs (matched against labs[].orderedBy). */
  requesterEmail?: string;
}

export interface RedactedPatientResult {
  /** Role-appropriate patient view. Fields the role can't see are
   *  removed entirely; partial-visibility fields contain only the
   *  permitted slice. */
  patient: Partial<RedactablePatient> & { id: string };
  /** Per-field verdicts so the client can render UI affordances
   *  ("Hidden by your role", "Current visit only", etc). */
  verdicts: Record<AclField, AclVerdict>;
  /** Effective role used for the redaction (echoed for the client). */
  role: AclRole;
}

/** Apply the matrix to a patient record. Pure function — never
 *  mutates the input. */
export function redactPatientForRole(
  raw: RedactablePatient,
  role: AclRole,
  ctx: RedactionContext = {},
): RedactedPatientResult {
  const v = (f: AclField) => aclVerdict(f, role);
  const verdicts: Record<AclField, AclVerdict> = {
    fullPastHistory:      v("fullPastHistory"),
    diagnosisList:        v("diagnosisList"),
    prescriptions:        v("prescriptions"),
    labResults:           v("labResults"),
    imagingReports:       v("imagingReports"),
    vitalsNursing:        v("vitalsNursing"),
    demographicsContact:  v("demographicsContact"),
    billPayment:          v("billPayment"),
    psychiatricSensitive: v("psychiatricSensitive"),
  };

  const out: Partial<RedactablePatient> & { id: string } = { id: raw.id };

  // Demographics -----------------------------------------------------
  if (verdicts.demographicsContact === "full") {
    out.firstName = raw.firstName;
    out.lastName = raw.lastName;
    out.age = raw.age;
    out.sex = raw.sex;
    out.phone = raw.phone;
    out.email = raw.email;
    out.address = raw.address;
    out.bloodGroup = raw.bloodGroup;
  } else if (verdicts.demographicsContact === "name_id_only") {
    out.firstName = raw.firstName;
    out.lastName = raw.lastName;
  }
  // hidden → leave only id

  // Past history (notes + chronicConditions + allergies bundle) -----
  if (verdicts.fullPastHistory === "full") {
    out.allergies = raw.allergies;
    out.chronicConditions = raw.chronicConditions;
    out.notes = raw.notes;
  }

  // Diagnoses (from visits[].assessment) ---------------------------
  if (verdicts.diagnosisList === "full") {
    out.visits = raw.visits;
  } else if (verdicts.diagnosisList === "current_visit_only" && raw.visits) {
    out.visits = ctx.currentVisitId
      ? raw.visits.filter((vv) => vv.id === ctx.currentVisitId)
      : raw.visits.slice(0, 1); // most-recent fallback
  }

  // Prescriptions ---------------------------------------------------
  if (verdicts.prescriptions === "full") {
    out.prescriptions = raw.prescriptions;
  } else if (verdicts.prescriptions === "active_rx_only" && raw.prescriptions) {
    out.prescriptions = raw.prescriptions.filter(
      (p) => !p.status || p.status === "active",
    );
  }

  // Labs ------------------------------------------------------------
  if (raw.labs) {
    if (verdicts.labResults === "full") {
      out.labs = raw.labs;
    } else if (verdicts.labResults === "current_visit_only") {
      out.labs = ctx.currentVisitId
        ? raw.labs.filter((l) => l.visitId === ctx.currentVisitId)
        : [];
    } else if (verdicts.labResults === "test_name_only") {
      out.labs = raw.labs.map((l) => ({ id: l.id, testName: l.testName }));
    } else if (verdicts.labResults === "own_tests_only") {
      const me = ctx.requesterEmail?.toLowerCase();
      out.labs = me
        ? raw.labs.filter((l) => l.orderedBy?.toLowerCase() === me)
        : [];
    }
  }

  // Imaging ---------------------------------------------------------
  if (raw.imaging) {
    if (verdicts.imagingReports === "full") {
      out.imaging = raw.imaging;
    } else if (verdicts.imagingReports === "billing_code_only") {
      out.imaging = raw.imaging.map((i) => ({ id: i.id, billingCode: i.billingCode }));
    }
  }

  // Vitals (lives in visits[].vitals — exposed when nursing visible) -
  if (verdicts.vitalsNursing === "full" && raw.visits && !out.visits) {
    // Only the vitals slice — strip clinical text.
    out.visits = raw.visits.map((vv) => ({
      id: vv.id,
      visitDate: vv.visitDate,
      vitals: vv.vitals,
    }));
  }

  // Bills -----------------------------------------------------------
  if (raw.bills) {
    if (verdicts.billPayment === "full") {
      out.bills = raw.bills;
    } else if (verdicts.billPayment === "status_only") {
      out.bills = raw.bills.map((b) => ({ id: b.id, status: b.status }));
    }
  }

  // Psychiatric / sensitive ----------------------------------------
  if (verdicts.psychiatricSensitive === "with_consent_flag") {
    if (raw.psychiatricConsent) {
      out.psychiatric = raw.psychiatric;
    }
    out.psychiatricConsent = raw.psychiatricConsent;
  }

  return { patient: out, verdicts, role };
}
