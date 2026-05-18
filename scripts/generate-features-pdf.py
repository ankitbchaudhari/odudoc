"""Generate the OduDoc full-platform feature catalogue PDF."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

OUT = "OduDoc-Features-A-to-Z.pdf"

doc = SimpleDocTemplate(
    OUT, pagesize=letter,
    leftMargin=0.7 * inch, rightMargin=0.7 * inch,
    topMargin=0.7 * inch, bottomMargin=0.7 * inch,
    title="OduDoc — Full Platform Feature Catalogue",
    author="OduDoc",
)

styles = getSampleStyleSheet()
INDIGO = colors.HexColor("#4F46E5")
VIOLET = colors.HexColor("#7C3AED")
TEAL = colors.HexColor("#0D9488")
SLATE = colors.HexColor("#0F172A")
MUTED = colors.HexColor("#475569")
LIGHT = colors.HexColor("#F1F5F9")

H1 = ParagraphStyle("H1", parent=styles["Title"], fontSize=24, textColor=INDIGO,
                   spaceAfter=10, alignment=TA_LEFT, leading=28)
H2 = ParagraphStyle("H2", parent=styles["Heading1"], fontSize=17, textColor=VIOLET,
                   spaceBefore=16, spaceAfter=8, leading=21)
H3 = ParagraphStyle("H3", parent=styles["Heading2"], fontSize=12.5, textColor=TEAL,
                   spaceBefore=10, spaceAfter=4, leading=16)
BODY = ParagraphStyle("BODY", parent=styles["BodyText"], fontSize=9.5,
                     textColor=SLATE, leading=13, spaceAfter=4, alignment=TA_LEFT)
BULLET = ParagraphStyle("BULLET", parent=BODY, leftIndent=14, bulletIndent=2,
                       spaceAfter=2)
CAPTION = ParagraphStyle("CAPTION", parent=BODY, fontSize=8.5, textColor=MUTED)
COVER_SUB = ParagraphStyle("COVER_SUB", parent=BODY, fontSize=12, textColor=MUTED,
                          alignment=TA_LEFT, leading=16)

story = []

# ---------- COVER ----------
story.append(Spacer(1, 1.2 * inch))
story.append(Paragraph("OduDoc", ParagraphStyle(
    "logo", parent=H1, fontSize=40, textColor=INDIGO, leading=44)))
story.append(Paragraph(
    "Full Platform Feature Catalogue",
    ParagraphStyle("subtitle", parent=H1, fontSize=22, textColor=SLATE)))
story.append(Spacer(1, 0.25 * inch))
story.append(Paragraph(
    "Admin panel &middot; Patient portal &middot; Doctor portal &middot; "
    "Clinic portal &middot; Corporate / Enterprise &middot; Mobile apps",
    COVER_SUB))
story.append(Spacer(1, 0.6 * inch))

# Cover summary table
summary = [
    ["Platform tier", "Healthcare ERP + EMR + Telemedicine + AI"],
    ["Modules shipped", "150+ admin modules &middot; 30+ patient modules &middot; 18 doctor modules"],
    ["Booking channels", "Web &middot; Android &middot; iOS &middot; Voice IVR &middot; WhatsApp &middot; SMS"],
    ["Geographies", "India (primary) + 18 countries with localized tax engine"],
    ["Languages", "English &middot; Hindi &middot; Tamil &middot; Telugu &middot; Marathi &middot; Bengali &middot; Gujarati"],
    ["Payments", "Cashfree (INR/UPI/RuPay) &middot; Stripe (international) &middot; Manual"],
    ["AI engine", "Gemini-backed: triage, prescription assist, voice Rx, OCR, summarization"],
    ["Compliance", "ABDM / ABHA, IMC telemedicine, HIPAA-aligned audit log, DPDP"],
]
t = Table([[Paragraph(f"<b>{k}</b>", BODY), Paragraph(v, BODY)] for k, v in summary],
          colWidths=[1.7 * inch, 5.2 * inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (0, -1), LIGHT),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("BOX", (0, 0), (-1, -1), 0.5, colors.lightgrey),
    ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))
story.append(t)
story.append(Spacer(1, 0.6 * inch))
story.append(Paragraph(
    "Generated 18 May 2026 &middot; This catalogue describes the complete shipped "
    "surface area of the OduDoc platform, organised by user role.",
    CAPTION))
story.append(PageBreak())

# ---------- TOC ----------
story.append(Paragraph("Contents", H1))
toc_items = [
    ("1. Platform Overview", "Architecture, multi-tenant model, security posture"),
    ("2. Patient Portal", "31 self-service modules a patient gets out-of-the-box"),
    ("3. Doctor Portal", "Workflow tools that save 3–4 minutes per OPD consult"),
    ("4. Admin / Hospital Operations Panel", "150+ modules covering every hospital workflow"),
    ("5. Clinic Portal", "Standalone clinic operations &mdash; smaller surface, same DNA"),
    ("6. Corporate / Enterprise Panel", "White-label, module-pick, multi-org billing"),
    ("7. AI &amp; Automation", "Every place AI shows up in the product"),
    ("8. Booking &amp; Communication Channels", "Web, mobile, voice, WhatsApp, SMS"),
    ("9. Compliance, Localization &amp; Payments", "ABDM, IMC, DPDP, GST, multi-currency"),
    ("10. Mobile Applications", "Patient + Doctor Android/iOS apps"),
]
for title, sub in toc_items:
    story.append(Paragraph(f"<b>{title}</b>", BODY))
    story.append(Paragraph(sub, CAPTION))
    story.append(Spacer(1, 4))
story.append(PageBreak())

# ---------- helpers ----------
def section(title, intro=None):
    story.append(Paragraph(title, H2))
    if intro:
        story.append(Paragraph(intro, BODY))

def sub(title):
    story.append(Paragraph(title, H3))

def features(items):
    """items: list of (name, description) tuples."""
    rows = []
    for name, desc in items:
        rows.append([
            Paragraph(f"<b>{name}</b>", BODY),
            Paragraph(desc, BODY),
        ])
    tbl = Table(rows, colWidths=[1.7 * inch, 5.2 * inch])
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, LIGHT]),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -1), 0.2, colors.lightgrey),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 6))

# =====================================================
# 1. OVERVIEW
# =====================================================
section("1. Platform Overview",
        "OduDoc is a modular healthcare platform that combines telemedicine, "
        "electronic medical records (EMR), hospital ERP, pharmacy, lab, "
        "insurance, and AI in a single multi-tenant system. The same codebase "
        "serves three commercial tiers: direct-to-patient telemedicine, single "
        "clinics, and multi-org hospital enterprises.")

sub("Architecture & infrastructure")
features([
    ("Runtime", "Next.js 14 App Router on Vercel serverless. Edge-cached static surfaces (SEO pages, blog, directory) and Node.js runtime for stateful endpoints."),
    ("Storage layer", "Race-safe append-only object stores (bindPersistentArray) with per-Lambda reload helpers (reloadConsultations, reloadBookings, reloadUsers, etc.) for cross-Lambda freshness."),
    ("Auth", "NextAuth for web + JWT for Android/iOS apps + manager session cookies for clinic/hospital staff. Role-gated routes (admin / doctor / patient / clinic-manager / corporate)."),
    ("Realtime", "Server-Sent Events (SSE) for in-app push, FCM for native Android push, Expo Push for cross-platform mobile."),
    ("AI", "Gemini Pro via @google/generative-ai. Per-org credit pools, per-call usage logging, ML self-learning queue for prescription corrections."),
    ("Search & SEO", "216 specialty&times;city landing pages, JSON-LD (Service, Physician, MedicalOrganization, BreadcrumbList, FAQ), dynamic sitemap, RSS feed, robots-aware."),
])

sub("Tenancy model")
features([
    ("Patients", "Self-serve consumers. Free signup, family accounts (kids, parents, spouse), can book with any doctor or clinic."),
    ("Doctors", "Verified clinicians. Public profile at /doctors/<slug>, private dashboard, KYC + license verification, payout flows."),
    ("Clinics", "Single-location clinics. Reception staff + manager roles. Calendar, OPD queue, billing, pharmacy, TPA empanelment."),
    ("Hospitals (orgs)", "Multi-department, multi-bed enterprise. Full admin panel (150+ modules). Each hospital is an org with admins, doctors, nurses, pharmacists, lab techs."),
    ("Corporate buyers", "Enterprise tier &mdash; cherry-pick modules, white-label branding, custom domain, dedicated AI credit pool, SLA-backed."),
])

sub("Security & compliance posture")
features([
    ("Audit log", "Every PHI access, role change, prescription edit, consent grant, and payment event is logged immutably with actor + timestamp + reason. Patient-visible audit log in /dashboard/audit."),
    ("Tracked changes", "EMR edits use insertion/deletion markers (author + timestamp) like Word's track changes &mdash; doctors can see who changed what."),
    ("Consent & DPDP", "Granular consent capture for data sharing, ABHA linkage, family-account visibility, marketing opt-in. Privacy requests workflow (delete-account, export-data)."),
    ("Watermarked PDFs", "Invoices, lab reports, prescriptions carry diagonal patient-name watermarks to deter resale and forgery."),
    ("Anti-counterfeit", "Per-batch QR codes on Rx packaging verify against the dispensing pharmacy &mdash; patients scan to confirm authenticity."),
    ("Biometric emergency unlock", "Patient can grant ER staff one-tap access to their entire record via biometric + OTP &mdash; full audit trail."),
])
story.append(PageBreak())

# =====================================================
# 2. PATIENT PORTAL
# =====================================================
section("2. Patient Portal",
        "Every patient gets a self-serve dashboard at /dashboard. Below is the "
        "complete module list as shipped today.")

sub("Bookings & consultations")
features([
    ("Find a doctor", "Search by specialty, city, language, fee, rating, availability. 216 SEO landing pages drive organic discovery."),
    ("Book consultation", "15-minute slot ladder, 30-minute lead time, no double-booking. Two flows: specific-doctor or any-doctor-in-specialty (pool)."),
    ("Cross-border eligibility", "Indian-licensed doctors are gated to Indian patients per IMC telemedicine guidelines &mdash; enforced server-side."),
    ("Family accounts", "Add kids, parents, or spouse as dependents. Switch active profile via cookie. Each dependent gets their own medicalId; bookings, prescriptions, and reports are scoped to the dependent."),
    ("Video / chat consult", "Daily.co-powered video room with built-in chat. Doctor receives camera-ready waiting-room ping when patient joins."),
    ("Reschedule / cancel", "Self-serve with refund-policy enforcement. Notifies the doctor and frees the slot."),
    ("Reminders", "24h email + WhatsApp + SMS + push reminders. Suppressed if cancelled or marked seen."),
    ("Receipt + invoice", "Auto-generated GST-compliant PDF invoice with patient-name watermark."),
])

sub("Medical records (longitudinal EMR)")
features([
    ("Health passport", "Single QR code that an ER team can scan to see allergies, current meds, conditions, blood type, emergency contacts &mdash; without unlocking the full record."),
    ("Prescriptions", "Every Rx ever issued, searchable by drug, doctor, date. PDF download + e-pharmacy reorder button."),
    ("Lab reports", "PDF reports auto-attached to the patient's record. Doctor-signed; flagged values highlighted."),
    ("Radiology", "DICOM-viewer accessible from the patient side for X-ray, CT, MRI, ultrasound."),
    ("Documents vault", "Upload prior reports, insurance cards, vaccination records. OCR-indexed (Tesseract)."),
    ("Health timeline", "Chronological view of every consult, lab test, prescription, vaccination, surgery. Filterable by year and type."),
    ("Vitals", "Manual entry or wearable-synced (Fitbit / Apple Health / Google Fit) BP, HR, SpO2, glucose, weight. Trend charts."),
    ("Care plan", "Doctor-assigned regimen for chronic conditions (diabetes, hypertension, asthma, CKD). Tasks + adherence tracking."),
    ("Allergies & problems", "Drug + food + environmental allergies; problem list with onset date and severity."),
    ("Immunizations / vaccinations", "UIP schedule for kids; flu / Covid / travel vaccines for adults. Auto-reminders for next dose."),
    ("Symptom log", "Patient-side daily log fed into AI triage and shared with care team during chronic-condition follow-up."),
])

sub("Pharmacy & shopping")
features([
    ("Reorder Rx", "One-tap reorder of last active prescription. Routed to nearest partner pharmacy with delivery ETA."),
    ("E-pharmacy cart", "Browse SKUs, prescription-gated checkout for scheduled drugs."),
    ("OTC shop", "Wellness products, devices (BP monitors, glucometers, thermometers), supplements."),
    ("Anti-counterfeit scan", "Scan QR on Rx packaging to verify authenticity + batch + expiry."),
    ("Rx fulfillment tracking", "Status pings: confirmed &rarr; packed &rarr; out-for-delivery &rarr; delivered."),
    ("Medication adherence", "Daily reminders to take meds. Skipped doses flagged to the care team for high-risk patients."),
])

sub("Diagnostics")
features([
    ("Book lab tests", "Browse tests by name, package, lab. Home sample collection or walk-in slots."),
    ("Lab results", "Auto-PDF on result-ready; patient is SMS/email-notified."),
    ("Radiology booking", "X-ray / CT / MRI / ultrasound bookings with imaging-centre map."),
])

sub("Payments & wallet")
features([
    ("Wallet top-up", "Single recharge via Cashfree (UPI / RuPay / netbanking) or Stripe (international). 5% bonus credit on every top-up."),
    ("Spend across services", "Wallet pays for consults, pharmacy, labs, imaging &mdash; one balance, no per-service refills."),
    ("Refunds", "Auto-refunded to the wallet for cancellations within policy; otherwise pro-rated."),
    ("Insurance & cashless", "Add health-insurance card; if your TPA is empanelled with the clinic, claim is auto-routed."),
    ("Pre-auth", "Pre-authorization workflow with TPA portal for planned admissions and surgeries."),
])

sub("Family, social & growth")
features([
    ("Family page", "Manage dependents, switch active profile, view a dependent's full record (only owner has access)."),
    ("Refer a friend", "Personal referral code. Friend gets discount; you earn wallet credit. Code redemption is tracked end-to-end."),
    ("Refer a doctor", "Patients can nominate a doctor to join the platform. Onboarding kit sent on submission."),
    ("Quick actions row", "Dashboard tiles for Book again / Reorder Rx / Refer & earn &mdash; the three most common actions."),
])

sub("AI-powered self-service")
features([
    ("Symptom checker", "Free-text or visual body-region picker. AI returns urgency, suspected specialty, red flags, suggested next step."),
    ("AI triage", "Routes the patient to the correct department before booking &mdash; cuts mis-triaged OPD slots for hospitals."),
    ("ABHA / ABDM linkage", "Link Ayushman Bharat Health Account, sync past records, opt-in to health-data sharing with consent."),
])

sub("Privacy & control")
features([
    ("Audit log", "Patient can see who accessed their record, when, and why &mdash; doctor, hospital, pharmacy, family member, ER staff."),
    ("Consent management", "Grant / revoke per data type (consults, labs, Rx, imaging) per consumer (specific doctor, hospital, family member)."),
    ("Share token", "Generate a time-limited public link to a specific record for a non-OduDoc consumer (foreign doctor, insurer)."),
    ("Delete account", "Self-serve, gated on a 30-day grace + irreversible confirmation. Full export of PHI before deletion."),
])
story.append(PageBreak())

# =====================================================
# 3. DOCTOR PORTAL
# =====================================================
section("3. Doctor Portal",
        "Doctors get a workflow-first dashboard at /dashboard/doctor. Designed "
        "to cut 3&ndash;4 minutes off every OPD consult and to scale from "
        "solo-practice telemedicine to a hospital chief of department.")

sub("Practice management")
features([
    ("My consultations", "Today, upcoming, past. Filter by status: requested, awaiting-doctor, in-progress, completed, cancelled. Pool tab for unclaimed specialty matches."),
    ("Patient list", "All patients you have ever seen, with last-visit date, condition tags, outstanding payments."),
    ("Patient detail (EMR)", "Complete longitudinal record: complaint, clinical, Rx (three physically-separated stores). Tracked-change edit history."),
    ("Calendar / availability", "Weekly recurring slots + one-off blocks. 15-min ladder. Honors leave, OOO, and clinic-day overrides."),
    ("ID card", "Auto-generated badge with license number, specialty, hospital affiliation. QR for instant verification."),
])

sub("Clinical AI")
features([
    ("AI prescription assistant", "Enter symptoms / age / sex / allergies. Returns up to 5 ranked diagnoses with confidence + rationale + red flags. Pick one; AI drafts investigations, drugs (dose/freq/duration), advice, and follow-up. All editable."),
    ("Voice prescription", "Dictate in English / Hindi / Gujarati / Marathi / Tamil. Browser-native transcription &rarr; AI extracts structured Rx fields."),
    ("AI usage", "Per-doctor credit ledger + cost-per-call breakdown. Hospital admin can override pricing for a doctor."),
    ("Personal dictionary", "Per-doctor abbreviation expansions and drug-name aliases. Voice + typed inputs auto-expand."),
])

sub("Earnings & payouts")
features([
    ("Earnings", "Per-consult, per-clinic, per-month breakdown. Includes telemed + in-clinic visits + pool consults."),
    ("Statements", "Monthly PDF statement with GST treatment for self-employed clinicians."),
    ("Payout", "Bank-account linkage; weekly or monthly cycles. Withdrawal flow with KYC checks."),
    ("Five salary models", "(Hospital-employed) Monthly fixed, per-patient fee, per-visit charge, hybrid, revenue share. Auto-computed against encounters + attendance."),
])

sub("Analytics & growth")
features([
    ("Analytics", "Consults / week, no-show rate, average ticket, top conditions seen, patient demographics, NPS."),
    ("Reviews", "Patient ratings (5-star + free text). Reply privately. Public reviews surface on /doctors/<slug>."),
    ("Referrals", "Receive referrals from other OduDoc doctors or partner clinics. Send referrals out via OduDoc network."),
    ("Profile (public)", "Bio, qualifications, languages spoken, fees, availability. Edited via dashboard, served at /doctors/<slug> with Physician JSON-LD."),
])

sub("Hospital-employed extras")
features([
    ("Hospital Rx", "Tied to hospital pharmacy / formulary. Auto-suggests in-stock alternatives if dispense is unavailable."),
    ("Roster & duty handover", "See your roster, swap shifts with peers, structured handover at end of duty."),
    ("EMR integration", "Patient lookups span the entire org, not just your panel. Permission-gated by role."),
])
story.append(PageBreak())

# =====================================================
# 4. ADMIN / HOSPITAL OPERATIONS PANEL
# =====================================================
section("4. Admin / Hospital Operations Panel",
        "150+ admin modules at /admin/&lt;module&gt;. This is the full hospital "
        "ERP &mdash; everything from bed census to biomedical waste. Modules "
        "are role-gated and toggleable per org (Enterprise tier).")

sub("Core clinical")
features([
    ("Patients", "Master patient index across the org. De-duplication, merge, alias tracking."),
    ("Appointments", "Org-wide schedule across OPD, IPD, surgery, imaging, lab. Token numbers, OPD queue."),
    ("Encounters", "Every patient touchpoint &mdash; OPD visit, IPD admission, telemed, lab draw, imaging study, ER triage."),
    ("Hospital Rx", "Centralized prescription store. Cross-references formulary, dispensing pharmacy, and patient adherence."),
    ("Medical records (MRD)", "Document indexing, file movement, retention policy, retrieval requests."),
    ("Discharge summaries", "Templated discharge with diagnosis codes (ICD-10), follow-up, meds-at-discharge, watermarked PDF."),
    ("Consent forms", "Templated &mdash; surgical, anesthesia, blood-product, telemed. Patient e-signature."),
    ("Allergies & problems", "Active problem list per patient. Auto-pulls from intake forms and consult notes."),
    ("Immunizations", "Vaccine cold-chain inventory + vaccination event recording."),
    ("Vitals & EWS", "Early-warning score auto-computed from BP / HR / SpO2 / RR / temperature / consciousness. Alerts on threshold breach."),
])

sub("Inpatient & surgical")
features([
    ("Wards & beds", "Live bed-map per ward. Occupancy %, isolation flags, cleaning status, gender-segregation."),
    ("Bed census", "Hospital-wide live census &mdash; admissions / discharges / transfers in the last 24h, occupancy trends."),
    ("Admissions (IPD)", "Admit, transfer, discharge workflow. Tied to ward, attending doctor, primary diagnosis."),
    ("Surgery / OT", "OT calendar by theatre, surgical team, consumables log, pre/post-op checklists, time-out compliance."),
    ("Surgery video", "Cloudflare Stream / Mux upload + playback for OT recordings. Educational consent gated."),
    ("Pre-anesthesia", "PAC workflow: history, exam, risk grade (ASA), anesthesia plan, fitness."),
    ("ICU / critical care", "ICU patient-level dashboard with vitals trend, ventilator settings, fluid balance, sepsis bundle."),
    ("TeleICU", "Remote ICU monitoring across multiple hospital sites by a central intensivist team."),
    ("Maternity / labor & delivery", "Partograph, fetal heart-rate trends, delivery summary, post-natal care."),
    ("Dialysis", "Per-session dialysis log, dry-weight trend, water-quality checks."),
    ("Wound care", "Wound photos with measurement overlay, dressing schedule, healing-curve plot."),
    ("Pain management", "Pain scores, opioid stewardship, regional-block tracking."),
    ("Physiotherapy", "Exercise programs, session attendance, ROM progress notes."),
    ("Oncology / chemo", "Regimen builder, cycle scheduling, body-surface-area dose calc, toxicity tracking."),
    ("Cardiology", "ECG repository, cath-lab booking, post-PCI follow-up."),
    ("Endoscopy", "Procedure scheduling, video capture, scope-reprocessing log."),
])

sub("Diagnostics & pharmacy")
features([
    ("Lab orders", "Order &rarr; sample &rarr; in-process &rarr; result &rarr; verified &rarr; signed report. STAT routing."),
    ("Lab tests catalog", "Test master with reference ranges, sample type, TAT, price."),
    ("Pathology", "Histopath case workflow with slide images and structured reports."),
    ("Radiology", "Modality worklist (X-ray / CT / MRI / US), DICOM viewer, structured report templates, PACS push."),
    ("Pharmacy dispense", "Rx-linked dispense at the window. Refill tracker. Counsels-needed flag."),
    ("Pharmacy inventory", "Batch + expiry, FEFO picking, near-expiry alerts, narcotic register."),
    ("Inventory", "Non-pharma consumables (gloves, syringes, gauze). Reorder points, suppliers, PO workflow."),
    ("Blood bank", "Donor registry, crossmatch, component tracking, transfusion adverse-event log."),
    ("CSSD sterilization", "Set tracking by load number, biological-indicator results, reprocessing audit."),
])

sub("Revenue & admin")
features([
    ("Invoices", "Patient + corporate + insurance invoices. Watermarked PDFs. GST or per-country tax applied automatically."),
    ("Billing", "Line-item charging per encounter. Bundled packages. Discount workflow with approval."),
    ("Insurance / TPA", "Empanelment registry, claim submission, pre-auth, deny/appeal, cashless coordination."),
    ("Corporate empanelment", "Employer empanelment for OPD / health-check packages. Voucher codes."),
    ("Coupons & offers", "Discount engine with capping, blackout dates, first-time-only logic."),
    ("AP (accounts payable)", "Vendor invoices, payment runs, ageing buckets."),
    ("GL (general ledger)", "Chart of accounts, journal entries, P&amp;L, balance sheet."),
    ("Revenue dashboard", "Daily / weekly / monthly revenue across all service lines, payer mix, denial trends."),
    ("Payouts", "Doctor payouts, agent commissions, distributor settlements."),
    ("Withdrawals", "Patient wallet withdrawals (if enabled), refund queue."),
    ("Razorpay / Cashfree go-live", "Self-serve KYC + bank-account onboarding for new orgs."),
])

sub("Workforce")
features([
    ("Staff", "All employees: doctors, nurses, technicians, support. Roles, departments, contact details."),
    ("Credentialing", "License upload, validity tracking, board-certification reminders, primary-source verification."),
    ("Roster", "Department-wise schedule. Auto-roster honors leave, role minimums, fairness."),
    ("Auto-roster", "AI-suggested roster respecting constraints (max hours, mandatory rest, skill mix)."),
    ("Staff scheduling", "Shift swap requests, leave applications, holiday cover."),
    ("Handover", "End-of-shift structured handover per ward / department."),
    ("Payroll", "Five salary models, attendance integration, monthly payroll run, payslip PDF."),
    ("Employee health", "Staff vaccination, fit-to-work clearance, exposure-incident log."),
    ("Doctor invites", "Send invite-to-onboard links to new doctors. Auto-creates a draft profile."),
])

sub("Facilities & compliance")
features([
    ("Dietary orders", "Per-patient diet (diabetic, soft, NPO, etc.), kitchen ticket, allergen check."),
    ("Biomedical", "Equipment registry, AMC tracking, calibration log, breakdown tickets."),
    ("Biomedical waste", "Color-bag segregation, daily weights, vendor pickup log, regulatory report (CPCB compliant)."),
    ("Housekeeping", "Room-cleaning schedule, terminal-clean tracking, response-time SLAs."),
    ("Linen & laundry", "Linen counts in/out, soiled-clean cycle, loss reconciliation."),
    ("Infection control", "Surveillance for HAI, isolation-precaution orders, hand-hygiene audit."),
    ("Antimicrobial stewardship", "Restricted-antibiotic approval workflow, MIC tracking, formulary compliance."),
    ("Incidents", "Patient-safety events, root-cause analysis, action plans, recurrence tracking."),
    ("Emergency codes", "Code blue / red / pink / silver activation log + response audit."),
    ("Ambulance dispatch", "Fleet tracking, call dispatch, en-route ETA, billing."),
    ("Medical gas", "O2 / N2O / med-air consumption, manifold pressure log, cylinder inventory."),
    ("Mortuary", "Body in/out register, release authorization, post-mortem coordination."),
    ("Mortality audit", "Mortality review committee workflow, preventability grading."),
    ("Visitors", "Visitor pass issuance, screening, ward visit-hour enforcement."),
    ("Quality", "Accreditation tracker (NABH / JCI), KPI dashboard, audit findings, CAPA."),
])

sub("Specialized clinical")
features([
    ("Cardiology", "ECG library, cath-lab schedule, device-clinic follow-up."),
    ("Oncology", "Tumor board case scheduler, MDT decisions, regimen library."),
    ("Tumor board", "Multidisciplinary case discussion with structured outcomes."),
    ("Dental", "Charting (FDI tooth notation), procedure plan, lab impressions."),
    ("Ophthalmology", "Refraction, IOP, retinal-image attachment, OCT integration."),
    ("ENT", "Audiometry, vestibular tests, sinus-imaging review."),
    ("Orthopedics", "X-ray annotation, implant tracking, post-op rehab plan."),
    ("Psychiatry", "Mood-tracking scales (PHQ-9, GAD-7), session notes (locked privacy tier)."),
    ("Rehab", "Functional independence measure (FIM), discharge readiness."),
    ("Pediatrics-specific", "Growth charts (WHO/IAP), vaccination calendar overlay, parent-portal."),
    ("Geriatric care", "Polypharmacy review (Beers list), falls-risk assessment, cognitive screening."),
])

sub("Clinical research & education")
features([
    ("CTMS (clinical trials)", "Protocol registry, subject enrolment, AE / SAE reporting."),
    ("Ambient bench", "Research-bench specimen tracking."),
    ("Clinical pathways", "Standardized care bundles by diagnosis; deviation tracking."),
    ("Health camps", "Off-site camp planning, registration, basic-vitals capture, follow-up routing."),
    ("Education partner panel", "External training partners, course catalog, learner records."),
])

sub("Patient-facing org tools")
features([
    ("Reviews", "Org-level review moderation, response templates, sentiment analytics."),
    ("Reception (front desk)", "Walk-in registration, queue management, token printer, payment counter."),
    ("Ward reception", "IPD-coordinator command center: live IPD board with color-graded patient status, one-tap specialist call, transfer, handover, discharge."),
    ("OPD queue", "Public TV display, SMS &lsquo;your turn&rsquo; pings, average-wait surface."),
    ("Mailbox", "Inbound patient queries (email + WhatsApp), team assignment, SLA timer."),
    ("Feedback / NPS", "Post-discharge survey, NPS score, complaint workflow."),
    ("Tickets", "Internal support ticketing (IT / facilities / clinical)."),
])

sub("Platform admin (super)")
features([
    ("Super admin", "Cross-org operations: create new orgs, suspend, audit cross-tenant access."),
    ("Platform audit log", "All cross-tenant actions logged immutably."),
    ("Factory reset", "Per-org wipe (test mode) with confirmation gate."),
    ("Demo wizard", "One-click seed of demo data for sales demos."),
    ("Razorpay go-live", "End-to-end onboarding for payment gateway."),
    ("AI pricing", "Per-org AI credit pricing override."),
    ("AI usage", "Org-wide AI usage analytics, top spenders, anomaly detection."),
    ("AI feedback", "Doctor corrections to AI Rx drafts feed the ML self-learning queue."),
    ("Notifications", "Cross-channel notification configuration: which events go where (email / SMS / WhatsApp / push)."),
    ("Email / WhatsApp / SMS templates", "Template editor, A/B testing, locale variants."),
    ("KPI dashboard", "Operational KPIs &mdash; bed occupancy, OPD throughput, OR utilization, payer mix, AR days."),
    ("Subscribers", "Mailing-list contacts; segmentation; double-opt-in."),
    ("Categories / tags / pages", "CMS for the org's mini-website at /c/&lt;slug&gt;."),
    ("Branding", "Logo, theme color, sub-domain, favicon, watermark text."),
    ("Customize", "Module on/off toggles (Enterprise tier)."),
    ("Network", "Inter-org referrals, network-tier price agreements."),
    ("Vendors", "External vendors (linen, biomedical, food). Contracts + AMC."),
    ("Vacancies", "Job postings &rarr; /careers + jobs board."),
    ("Applications", "Inbound resumes, screening pipeline, interview scheduling."),
    ("Documents", "Org document library (SOPs, policies, certifications)."),
    ("Privacy requests", "GDPR/DPDP requests: export, delete, restrict. SLA-tracked."),
    ("Consent", "Org-side view of patient consent grants."),
    ("Audit viewer", "Read-only audit log explorer with filters by actor / action / patient."),
    ("Voice station", "On-prem voice-bot configuration for IVR booking."),
    ("Voice", "AI voice agent: outbound reminders, inbound bookings."),
    ("Media library", "Logos, banners, marketing creatives, OG images."),
    ("Anti-counterfeit kiosk", "In-pharmacy verification kiosk for QR-coded Rx packages."),
    ("Biometric kiosk", "Walk-in patient biometric registration."),
    ("DHIS integration", "Optional sync to national DHIS reporting systems."),
    ("Passport scan", "Foreign-patient passport OCR for medical-tourism onboarding."),
    ("ABDM", "ABHA linkage, FHIR exchange with the national health stack."),
])
story.append(PageBreak())

# =====================================================
# 5. CLINIC PORTAL
# =====================================================
section("5. Clinic Portal",
        "Standalone clinics get a slimmer surface than hospitals &mdash; same "
        "patterns, focused on single-location workflow. Sign in at "
        "/clinic/&lt;clinicId&gt;/login.")

sub("Daily operations")
features([
    ("Dashboard", "Today's appointments, walk-ins, no-shows, revenue, pending payments."),
    ("Reception", "Walk-in registration, queue management, token printing, payment collection."),
    ("Calendar", "Per-doctor or unified clinic view. Block leave / OOO. Online + in-clinic visits in one calendar."),
    ("Pharmacy", "In-clinic dispensing, batch + expiry, narcotic register, OTC sales counter."),
    ("Referrals", "Refer a patient to another clinic, hospital, or specialist in the OduDoc network. Track outcomes."),
])

sub("Insurance & cashless")
features([
    ("TPA empanelment", "Maintain empanelment list with discount %, contact, validity. Renew-within-60-days banner. Manager-only edits."),
    ("Cashless claim", "Submit cashless claim to empanelled TPA. Pre-auth round-trip. Final-bill submission."),
    ("Patient insurance lookup", "Patient adds card &rarr; clinic auto-detects if TPA is empanelled."),
])

sub("Manager-only")
features([
    ("Staff", "Reception + manager roles. Add / remove / rotate staff."),
    ("Earnings", "Per-doctor + clinic-wide earnings, payouts to associated doctors."),
    ("Settings", "Clinic hours, address, photos, public profile at /c/&lt;slug&gt;."),
])
story.append(PageBreak())

# =====================================================
# 6. CORPORATE / ENTERPRISE
# =====================================================
section("6. Corporate / Enterprise Panel",
        "Enterprise buyers (hospital chains, diagnostic groups, government health depts) "
        "license the platform a la carte. They get every admin module above plus the "
        "enterprise-only controls below.")

sub("Module catalogue (cherry-pick)")
features([
    ("85+ modules", "Toggle modules on/off per org via /admin/customize. Disabled modules don't appear in the sidebar or consume AI credits."),
    ("Module groups", "Core clinical &middot; Inpatient &amp; surgical &middot; Diagnostics &amp; pharmacy &middot; Revenue &amp; admin &middot; Workforce &middot; Facilities &amp; compliance &middot; Brand &amp; public surfaces &middot; Patient self-service &middot; Hospital ops add-ons &middot; AI metering &middot; Booking channels &middot; Pharma supply chain &middot; Marketplace &middot; Compliance &amp; tax."),
])

sub("White-label & branding")
features([
    ("Org branding", "Custom logo, primary/accent colour, favicon, watermark text. Applied across patient pages, Rx PDFs, invoices."),
    ("Mini-website", "Auto-generated public site at /c/&lt;slug&gt; with hero, services, doctors, gallery, reviews, contact, booking CTA."),
    ("Custom domain", "Map your own domain (Vercel-managed cert)."),
    ("Vacancies + careers", "Org's job board at /c/&lt;slug&gt;/careers with applicant pipeline."),
    ("Press / blog / gallery", "CMS-style pages, image gallery, blog posts, testimonials."),
])

sub("Multi-org & federation")
features([
    ("Org hierarchy", "Parent &rarr; child orgs (hospital chain &rarr; sites). Cross-site patient lookup with consent."),
    ("Network referrals", "Refer in-network at agreed rates; track conversion + revenue share."),
    ("Federated billing", "Roll-up invoicing to the parent for corporate accounts that span multiple sites."),
])

sub("AI & metering")
features([
    ("AI credit pool", "Pre-paid AI credits at the org level. Per-doctor sub-pools optional."),
    ("AI pricing override", "Set custom rates per AI feature for this org."),
    ("ML self-learning queue", "Doctor corrections &rarr; supervised fine-tuning queue (private to this org)."),
])

sub("Government / public-health")
features([
    ("DHIS sync", "Push aggregated indicators to national DHIS endpoints."),
    ("Health camps", "Camp event management with offline-tolerant capture and follow-up routing."),
    ("Pharma supply chain", "Authorized-distributor registry, regulatory paperwork, anti-counterfeit verification."),
    ("19-country tax engine", "Per-country GST / VAT / sales-tax rates, invoice format, currency, language."),
])

sub("Commercial controls")
features([
    ("Tier-based pricing", "Patient tier (free) &middot; Clinic tier (subscription) &middot; Hospital tier (full suite) &middot; Enterprise (custom)."),
    ("SLA monitoring", "Uptime, response time, ticket SLA tracking with corporate-buyer visibility."),
    ("Dedicated support", "Slack/Teams channel, named CSM, quarterly business review."),
    ("Data residency", "Region-pinned storage on request (IN / EU / US)."),
])
story.append(PageBreak())

# =====================================================
# 7. AI & AUTOMATION
# =====================================================
section("7. AI &amp; Automation",
        "AI shows up in many places. This index lists every AI-powered feature so "
        "you can see the full machine-intelligence surface area.")

features([
    ("AI symptom triage", "Patient free-text or visual symptom selection &rarr; specialty + urgency + red-flag analysis. Gates emergency cases to call 108."),
    ("AI prescription assistant", "Doctor enters symptoms &rarr; ranked diagnoses, drug suggestions, dose/freq/duration, advice, follow-up."),
    ("Voice prescription", "5-language dictation &rarr; structured Rx draft. Browser-native transcription + LLM extraction."),
    ("Rx OCR", "Upload old paper prescription &rarr; OCR + LLM &rarr; structured drug list importable into history."),
    ("Ambient scribe", "Listen to consultation &rarr; auto-generate SOAP notes."),
    ("Wearable insights", "Synced BP / HR / sleep / glucose &rarr; weekly AI summary + risk flags."),
    ("Lab-result summarization", "Plain-language summary of complex panels for patients."),
    ("Discharge-summary draft", "AI fills the discharge template from the encounter timeline."),
    ("AI voice agent", "Outbound reminders + inbound IVR booking via Twilio / Exotel / Vonage."),
    ("AI feedback loop", "Doctor corrections to AI drafts &rarr; ML self-learning queue &rarr; private fine-tune."),
    ("AI usage analytics", "Per-doctor / per-org credit ledger, cost-per-call, anomaly alerts."),
    ("AI pricing override", "Per-org custom rates."),
    ("AI symptom log analytics", "Patient daily logs &rarr; trend extraction &rarr; doctor alert if deterioration."),
])
story.append(PageBreak())

# =====================================================
# 8. BOOKING & COMMUNICATION
# =====================================================
section("8. Booking &amp; Communication Channels")

sub("Booking channels")
features([
    ("Web", "/doctors / specialty pages / direct doctor profile / pool booking. Logged-in or guest with phone OTP."),
    ("Android app", "Patient + Doctor apps. JWT-authenticated. Native push via FCM + Expo."),
    ("iOS app", "Same parity as Android."),
    ("Voice IVR", "Phone in, AI agent collects details, books a slot &mdash; Twilio / Exotel / Vonage routes."),
    ("WhatsApp bot", "Conversational booking on the Meta WhatsApp Business API. Template-approved messages for reminders, OTP, receipts."),
    ("SMS", "OTP, reminders, status pings. Fallback for non-WhatsApp users."),
    ("Embed widget", "Drop-in &lt;script&gt; for clinic websites to embed an OduDoc booking flow."),
])

sub("Outbound communication")
features([
    ("Transactional email", "Welcome, OTP, booking received, payment receipt, reminder, prescription PDF, lab result ready, discharge summary."),
    ("WhatsApp templates", "Pre-approved Meta templates for OTP, booking, reminder, refer-a-friend, lab-result-ready, Rx-ready, follow-up nudge."),
    ("Push notifications", "Native push (FCM) + Expo push for web / mobile."),
    ("In-app SSE feed", "Server-sent-events feed for desk apps (reception, ward coordinator)."),
])

sub("Inbound")
features([
    ("Mailbox", "Inbound emails consolidated, auto-tagged by sender (patient / doctor / vendor), SLA-tracked."),
    ("WhatsApp inbound", "Free-text patient messages flow to the org mailbox or auto-respond via FAQ bot."),
    ("Help / contact", "/help and /contact forms with category routing."),
])
story.append(PageBreak())

# =====================================================
# 9. COMPLIANCE & PAYMENTS
# =====================================================
section("9. Compliance, Localization &amp; Payments")

sub("Compliance")
features([
    ("IMC telemedicine", "Indian Medical Council telemed guidelines enforced: doctor-license verification, no controlled-substance Rx in first consult, cross-border patient gate."),
    ("ABDM / ABHA", "Ayushman Bharat linkage, FHIR data exchange, ABHA-card creation."),
    ("HIPAA-aligned", "Audit log, role-based access, encryption at rest + in transit, business-associate agreements available."),
    ("DPDP (India)", "Consent capture, deletion requests, data-fiduciary obligations."),
    ("GDPR (EU)", "Export / delete / restrict workflows."),
    ("NABH / JCI", "Accreditation-tracker module for hospital quality teams."),
    ("CPCB biomedical waste", "Color-bag segregation log + monthly regulatory report."),
])

sub("Localization")
features([
    ("19-country tax engine", "Country-specific GST / VAT / sales-tax computation, locale-formatted invoices."),
    ("7 languages", "English, Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati. Navbar + patient-facing pages."),
    ("Currency", "INR (Cashfree), USD/EUR/GBP/etc (Stripe). Per-org default currency."),
    ("Indian phone formats", "Auto-format + validation for +91 numbers + alternate Indian carriers."),
])

sub("Payments")
features([
    ("Cashfree", "INR + UPI + RuPay + netbanking + cards. Webhook-driven payment confirmation with race-recovery."),
    ("Stripe", "International cards / Apple Pay / Google Pay / SEPA / wallets."),
    ("Manual / cash", "Front-desk cash collection with receipt printing."),
    ("Wallet", "Single top-up funds all services; 5% top-up bonus."),
    ("Refunds", "Auto via wallet for cancellations; gateway refund for direct-to-card."),
    ("Insurance cashless", "Direct claim flow with empanelled TPAs."),
    ("Pre-auth", "Pre-authorization workflow for planned procedures."),
    ("Wallet withdrawals", "Patient-side withdrawal flow (where regulatorily allowed)."),
])
story.append(PageBreak())

# =====================================================
# 10. MOBILE
# =====================================================
section("10. Mobile Applications")
features([
    ("Patient Android / iOS", "Find a doctor, book, video / chat consult, prescriptions, lab reports, wallet, family accounts, ABHA, wearables sync."),
    ("Doctor Android / iOS", "Appointments, EMR, voice + AI prescription, e-sign, push notifications, earnings."),
    ("Reception / ward Android", "Walk-in registration, queue, payment collection, IPD board, code-blue alerting."),
    ("Auth", "JWT issued by mobile-auth endpoint; refresh tokens; biometric unlock."),
    ("Push", "FCM (native tokens) + Expo Push (cross-platform). Per-channel: appointments / chat / promotions / system."),
    ("Offline", "Optimistic UI for vitals / symptom log; sync on reconnect."),
])

story.append(Spacer(1, 0.3 * inch))
story.append(Paragraph("&mdash; End of catalogue &mdash;", CAPTION))
story.append(Paragraph(
    "OduDoc &middot; Full Platform Feature Catalogue &middot; Generated 18 May 2026",
    CAPTION))

# ---------- BUILD ----------
def add_page_number(canvas, _doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.7 * inch, 0.45 * inch, "OduDoc — Full Platform Feature Catalogue")
    canvas.drawRightString(letter[0] - 0.7 * inch, 0.45 * inch, f"Page {_doc.page}")
    canvas.restoreState()

doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
print(f"Wrote {OUT}")
