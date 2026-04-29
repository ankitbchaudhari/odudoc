# EMR compliance posture

This document describes how the OduDoc EMR module currently meets — and where
it falls short of — common privacy-and-security obligations. It is intended
for doctors and clinic administrators who need to satisfy due-diligence
questions before onboarding. **It is not a legal opinion.** Clinics in
regulated jurisdictions should consult qualified counsel before relying on
the platform for protected health information.

## Data flow at a glance

| Concern | Where it lives | Who controls it |
|---|---|---|
| Patient demographics, SOAP notes, invoices | `app_kv` rows in PostgreSQL on Hostinger VPS (`emr-patients`, `emr-visits`, `emr-invoices`, `emr-staff`, `emr-quota-unlocks`, `emr-audit`, `emr-files`) | Clinic owner (data controller) |
| Lab reports / scans (binary) | Hostinger files server (`https://files.odudoc.com/emr/...`) | Clinic owner |
| Authentication | NextAuth web sessions + Bearer JWTs for mobile | OduDoc (data processor) |
| Online payments | Stripe Checkout — card data never touches our servers | Stripe |
| Audit log | `emr-audit` rows | Clinic owner |

## GDPR coverage (EU patients)

**Article 15 — right of access.** The clinic owner can issue a full data
export per patient via `/api/emr/patients/[id]/export`. The bundle is plain
JSON: profile + every visit + file metadata + invoice history + a FHIR R4
view. A patient identity verification step happens out of band; the doctor
is responsible for verifying before sharing the file.

**Article 17 — right to erasure.** The clinic owner can delete a patient
via the patient detail page. Deletion cascades into every dependent row
(visits, files, invoices) via tombstones. **Caveat:** the audit log
(`emr-audit`) intentionally retains the activity trail — required for
record-keeping under most clinical regulations. If a patient demands true
erasure including the audit trail, the clinic owner must contact OduDoc
support and we'll execute a manual purge scoped to that patient's id.

**Article 20 — right to portability.** The same `/export` endpoint plus
the dedicated FHIR R4 (`/fhir`) and HL7 v2 (`/hl7`) exports satisfy this.
A clinic migrating to another EMR can pull every patient's record in
machine-readable form.

**Article 25 — privacy by design.** Patient records carry `doctorEmail`
(clinic-owner email) on every row. The `resolveClinic()` helper enforces
clinic isolation at the API layer; no clinic can see another clinic's data.
Bearer-JWT mobile traffic uses the same resolver.

**Article 30 — records of processing.** The audit log records every
mutating action with timestamp, actor, resource, and metadata. Available
to the clinic owner at `/dashboard/doctor/emr/audit`.

## HIPAA coverage (US patients)

**The platform is functional but not currently certified as HIPAA-compliant.**
Specifically:

- ✅ Audit trail per HIPAA §164.312(b) — every PHI write is recorded.
- ✅ Access controls per §164.312(a) — role-based (owner / doctor / nurse /
  frontdesk) at the API layer; passwordless invite via OduDoc account.
- ✅ Encryption in transit — Vercel + Hostinger both enforce TLS.
- ⚠️ Encryption at rest — Postgres data is not separately field-encrypted.
  PostgreSQL on Hostinger uses block-level encryption typical of a managed
  VPS; this is **not** equivalent to FIPS-validated encryption-at-rest as
  expected by larger US health systems.
- ❌ Business Associate Agreement (BAA) — not currently offered. A clinic
  treating US patients should not store PHI here without a signed BAA.
  Contact OduDoc support to discuss.
- ⚠️ Patient access (right of accounting) — covered by the GDPR export
  endpoint, but the clinic owner must execute it manually; we don't
  expose a patient-self-service portal yet.

If you need HIPAA-grade compliance, plan to sign a BAA with OduDoc and
budget for an additional encryption-at-rest layer (out of scope for the
free tier).

## Operational notes for the clinic owner

- **Identity verification before export.** The export endpoint trusts the
  clinic owner. Verify the requesting patient matches the record (photo
  ID, in-person visit, etc.) before sharing the resulting JSON.
- **Staff offboarding.** When a staff member leaves, remove them from
  `/dashboard/doctor/emr/staff` immediately. Their OduDoc account remains
  but no longer resolves into your clinic.
- **Audit log retention.** The audit log is currently unbounded. For
  practical reasons we don't expose a delete; this matches medico-legal
  retention expectations (typically 5–10 years depending on jurisdiction).
- **Backups.** Postgres backups are taken via the Hostinger VPS-level
  snapshots; restoration is on the order of hours, not minutes. For a
  clinic with strict RTO, consider a daily logical dump (`pg_dump` of the
  `app_kv` table).
- **Online payments.** The `/pay/[token]` flow uses Stripe Checkout. We
  never see raw card data. Patients receive a Stripe-issued receipt to
  their email.

## Reporting a data incident

If you suspect unauthorized access to your clinic's data — e.g. a former
staff member's account has been re-used, or a public payment link has been
shared more widely than intended — rotate the affected payment links via
the ↻ button next to each invoice, remove the staff member, and email
support@odudoc.com with details. We'll cross-check the audit log with
server-side logs to scope impact.

— Last reviewed: 2026-04-29
