# ABDM Sandbox Application — drop-in answers

NHA's sandbox-onboarding form at `https://sandbox.abdm.gov.in/` asks
for organization details, integration use case, technical
architecture, and security posture. The fields below are written
specifically for OduDoc — paste each into the matching question.
NHA's review queue is faster (typically 5-7 days vs. 10-14) when
the architecture description is concrete and matches a real
implementation, which yours does.

---

## Organization

**Organization name:** OduDoc

**Organization type:** Health Technology Platform / Telemedicine Provider

**Website:** https://www.odudoc.com

**Country of operation:** India (with international expansion planned)

**Year founded:** 2024 *(adjust to actual)*

**Authorised contact name + email:** [Your name] · [admin@odudoc.com]

**Telephone:** [your contact number]

---

## Integration role you're applying for

✅ **Health Information User (HIU)** — Phase 1 priority

☐ Health Information Provider (HIP) — Phase 2, after HIU is in production

**Why HIU first:** OduDoc's primary use case is letting a doctor see their patient's prior consultation history (from any ABDM-compliant source) before the visit. HIP — pushing our consultation records back to the patient's PHR locker — is a clean follow-up after we've validated the HIU flow with real users.

---

## Use case

**Describe the use case in 200-300 words:**

> OduDoc is a doctor-first telemedicine and electronic medical-records platform serving Indian doctors and patients (with multi-country support, but India is the primary jurisdiction). We give Indian-licensed doctors a free public profile, a clinic EMR for managing patients, and prescription / certificate workflows. Patients book consultations either via the marketplace or from our consumer-facing search.
>
> We want to integrate with ABDM in three steps:
>
> 1. **ABHA verification at patient signup** — patients optionally link their 14-digit ABHA Health ID to their OduDoc account. This is already implemented in our scaffold (production-stub mode); real OAuth (`/v0.5/users/auth/init`, `/confirmWithMobileOTP`) lands once sandbox credentials are issued.
>
> 2. **HPR validation at doctor verification** — admin-initiated lookup of a doctor's HPR registration number against the NHA registry. Replaces our current manual document review with cryptographic verification of the doctor's medical-council registration. Already scaffolded.
>
> 3. **Care-context discovery (HIU role)** — when a doctor opens a patient's chart, we surface previous consultation records from the patient's PHR (with consent, via the standard CM consent flow). Reduces duplicate questioning and cross-references medication history.
>
> We are not, in Phase 1, applying for HIP role. Pushing OduDoc consultation records back to patient PHRs is on our roadmap but contingent on M1 certification first.
>
> The platform is HIPAA-aligned in architecture (full audit log per record access, role-based access control, encryption in transit) and complies with the IMC's 2020 Telemedicine Practice Guidelines, including automatic cross-border restriction of India-licensed doctors to patients in India.

---

## Technical architecture

**Hosting:**

> Application: Vercel (US, with `bom1` Mumbai region for serverless function execution)
> Database: PostgreSQL self-hosted on Hostinger VPS in Mumbai (Asia)
> File storage: Hostinger files server in Mumbai (TLS-only, public-key-signed access for sensitive uploads)
> CDN: Vercel Edge Network with Indian PoP (`bom1`)

**Stack:**

> Next.js 15 (App Router) on Node.js 20.x runtime
> PostgreSQL 16 with JSONB-keyed app_kv pattern for flexible schemas
> NextAuth + Bearer JWT for web + mobile auth
> Stripe Connect for payment routing (will integrate Razorpay / PhonePe for INR collections in Phase 2)

**Identity & access:**

> Three layers — patient (signup), doctor (admin-verified), admin (super-admin gate). Doctor sessions cannot access admin endpoints; admin-only endpoints reject doctor JWTs with 403. Per-staff RBAC inside each clinic via the EMR multi-staff feature (owner / doctor / nurse / front desk).

**Audit:**

> Every mutating EMR action writes a row to the `emr-audit` store with timestamp + actor + resource + metadata. Patient-facing online payments are attributed to a synthetic `patient:<token-prefix>` actor so anonymous payment flows are still trackable. Available to the clinic owner at `/dashboard/doctor/emr/audit`.

**FHIR support:**

> One-click FHIR R4 Bundle export per patient — Patient + AllergyIntolerance + Conditions + Encounters with SOAP notes in encounter.note. Already shipped at `/api/emr/patients/[id]/fhir`. We will align to NDHM-specific FHIR profiles (OPConsultRecord, Prescription) as part of M1 certification.

**HL7 support:**

> HL7 v2.5.1 ADT^A08 export with PID + AL1 + DG1 + PV1/OBX-per-visit segments. Used for migration to legacy HIS systems. Pure complement to FHIR — not part of ABDM submissions.

---

## Security posture

**Encryption in transit:**

> TLS 1.2+ enforced platform-wide. Vercel + Hostinger both reject plaintext HTTP. Internal service-to-service calls use signed Bearer JWTs.

**Encryption at rest:**

> PostgreSQL block-level encryption (Hostinger VPS standard). Field-level encryption is not currently in place — added during Phase 2 if required for HIP certification. ABHA numbers are stored as plain digits but never logged or surfaced to admin UIs without explicit purpose.

**Access control:**

> Role-based at every API boundary. Cross-clinic isolation enforced by `resolveClinic()` — a staff member at clinic A cannot access clinic B's data even if they guess URLs.

**Audit retention:**

> Audit log is currently unbounded (kept indefinitely). Matches medico-legal retention expectations of 5-10 years.

**Incident response:**

> Documented in `docs/emr-compliance.md`. Suspected unauthorized access triggers payment-link rotation, staff-account removal, and a request to NHA / clinic owner to scope impact via the audit log.

**Penetration testing:**

> Internal review only as of Phase 1. CERT-In empanelled audit will be commissioned before HIP role is activated.

---

## Data flow diagram (text version)

```
PATIENT (with ABHA)
   │ optional ABHA OAuth via NHA Authenticator
   ↓
OduDoc Patient Account ── linked to ABHA number
   │
   ↓ books consultation
DOCTOR (HPR-verified)
   │ writes SOAP note + prescription
   ↓
OduDoc EMR Database (Hostinger VPS, Mumbai)
   │ FHIR R4 export available on demand
   ↓
ABDM Consent Manager ── (Phase 3) when HIP role activates
   │
   ↓ patient grants consent
PATIENT'S CHOSEN PHR APP (Aarogya Setu / eka.care / etc.)
```

---

## Use of NHA Sandbox

We will use the sandbox to:

1. Verify the ABHA OAuth flow end-to-end with NHA's test ABHA accounts
2. Verify the HPR `/v1/professional/find` endpoint against test HPR ids
3. Validate our FHIR profiles against the NHA validator
4. Test consent-manager handshakes (Phase 3 only)

Expected sandbox traffic: **<100 requests / day** during Phase 1 (single-developer testing). Sandbox usage will not exceed 1000 / day until production launch.

---

## Production launch plan

| Milestone | Target | Status |
|---|---|---|
| Sandbox approval | T+0 | This application |
| ABHA + HPR integration live in sandbox | T+3 weeks | Phase 1 scaffolding already in production code |
| M1 certification submission | T+5 weeks | After Phase 2 implementation |
| M1 production credentials | T+10 weeks | NHA review queue |
| HIP role application (M2) | T+12 weeks | After HIU traction validates demand |

---

## Compliance & legal

**Privacy policy URL:** https://www.odudoc.com/privacy *(verify path)*

**Terms of service URL:** https://www.odudoc.com/terms *(verify path)*

**Data Protection Officer:** [Name + email] *(designate one before submitting)*

**Grievance officer (per IT Rules 2021):** [Name + email] *(required for India operations)*

**Type of consent collected:**
- Explicit acceptance of HIPAA BAA (US patients), GDPR DPA (EU/UK patients), or Generic DPA (rest of world) at doctor signup, captured with version + IP + timestamp + typed signature.
- Patient consent for ABHA linking captured at link time (Phase 1: stored on user record; Phase 2: routed through NHA's consent flow).

---

## How to use this document

1. Open https://sandbox.abdm.gov.in/ → Get Started
2. Pick "Health Information User"
3. Paste the matching field from above into each question
4. Where the form asks for technical-architecture documentation, attach `docs/emr-compliance.md` as a PDF (it answers the security questions in detail)
5. Submit. NHA's review usually lands in 5-10 days.

**Two things you'll need to fill in before submitting:**
- Founder/director full names + DINs (from MCA records)
- Privacy policy + ToS URLs once they exist (or commit to publishing them within 30 days of approval)

— Last updated: 2026-04-29
