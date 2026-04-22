# OduDoc for Hospitals — Corporate Demo Playbook

**Audience:** Hospital CEO/COO, Clinic chain owner, CMO, IT Head, Diagnostic-chain admin
**Duration:** 30 minutes (can compress to 15 if needed)
**Live URL:** https://www.odudoc.com/corporate

---

## 1. The pitch in one sentence

> "Replace 6 disconnected tools — EMR, billing, pharmacy, lab, OPD/IPD, telemedicine — with **one modular platform** that your hospital can roll out department-by-department, on your cloud or ours."

---

## 2. Who we're talking to

| Role | Their question | How you answer |
|---|---|---|
| **CEO / Owner** | "What's the ROI?" | Consolidates 6 vendor bills → one. Typical 30–40% software + admin-cost reduction. |
| **CMO / Medical Director** | "Will doctors actually use it?" | Voice-to-note AI, one-click OPD workflow. Show the consult flow. |
| **IT Head** | "How does it integrate & is it secure?" | HL7/FHIR, CSV exports, audit logs on every record, TLS 1.3 + AES-256, HIPAA/GDPR/DPDP track. |
| **CFO / Finance** | "What's the real cost?" | Transparent per-module pricing. Clinic $149/mo, Hospital $749/mo, Enterprise custom. No per-seat surprise fees. |
| **Ops / Admin** | "Migration pain?" | 14-day sandbox seeded with your departments. Side-by-side rollout per module. |

---

## 3. The 30-minute demo flow

### Minute 0–3 — Open on the corporate page
- Navigate to **https://www.odudoc.com/corporate**
- Hero headline lands: *"An intuitive healthcare solution — ERP + EMR + AI"*
- Point to the **12-module constellation** orbiting the OduDoc core on the right
- Say: *"Most hospitals we meet run 4–6 disconnected systems. Patient data lives in one, billing in another, pharmacy in a third. We unify them — and you turn modules on only when you need them."*

### Minute 3–6 — The 4 differentiators (one slide worth, scroll the page)
| | |
|---|---|
| 🧩 **Modular, not monolithic** | Buy only what you need. Turn others on later — no re-platforming. |
| 🛡️ **Compliance-ready** | Audit logs on every record. Role-based access. HIPAA/GDPR/DPDP aligned. |
| ⚡ **Modern stack** | Next.js + Postgres on Vercel. Browser-native — no local installs. |
| 🤝 **No lock-in** | Your data, exportable anytime. HL7/FHIR + CSV exports built-in. |

### Minute 6–18 — The 12 modules (live demo — skip to what they care about)

Ask them first: *"Which module solves your most painful problem today?"* Then deep-dive 3–4, not all 12.

Open a second tab at **https://www.odudoc.com/admin** (admin login) and demo these:

| Module | Admin URL | What to show |
|---|---|---|
| **Patient Management (EMR)** | `/admin/patients` | Patient timeline, allergies, vitals, visit history |
| **IPD / OPD** | `/admin/admissions`, `/admin/bed-census`, `/admin/encounters` | Bed map, admission → discharge summary |
| **Medical Staff** | `/admin/staff`, `/admin/roster`, `/admin/credentialing` | Shifts, license expiry alerts |
| **Quick Consultations** | `/admin/queue`, `/admin/appointments` | OPD token flow |
| **AI & Voice Consult** | `/admin/voice`, `/admin/telemedicine` | Realtime speech-to-note → auto-draft prescription |
| **Lab** | `/admin/lab-orders`, `/admin/lab-tests`, `/admin/pathology` | Order → sample → signed PDF report |
| **Pharmacy** | `/admin/pharmacy-inventory`, `/admin/prescriptions`, `/admin/dispensing` | Batch + expiry tracking |
| **Billing & Accounting** | `/admin/billing`, `/admin/invoices`, `/admin/ar-receipts`, `/admin/gl` | Invoice, insurance claim, GST ledger |
| **Inventory** | `/admin/inventory`, `/admin/vendors`, `/admin/orders` | Reorder points, PO workflow |
| **Surgery / OT** | `/admin/surgeries`, `/admin/pac` | OT calendar, consumables log |
| **Radiology / DICOM** | `/admin/radiology` | Report sign-off, PACS hook |
| **Telemedicine** | `/admin/telemedicine`, `/admin/consultations` | Video consult + e-prescription |

**Bonus — the KPI wow factor:** Open `/admin/kpi-dashboard` at the end — hospital-wide metrics in one screen (bed occupancy, AR days, top diagnoses, doctor productivity).

### Minute 18–22 — Patient-side demo (2 minutes)
Show the patient gets a great experience too:
1. Open https://www.odudoc.com in another tab
2. Click **Find Doctors** → pick a doctor → **Book Appointment**
3. Show the **phone-OTP flow** (no patient account needed)
4. Confirmation in 30 seconds
5. Switch to **Video Consult** button — same flow, lands in a Daily.co room

Say: *"Your brand, your doctors, your pricing — but your patients get an Uber-smooth booking experience. We've seen no-show rates drop 25–40%."*

### Minute 22–26 — Pricing & plans
Open the pricing table on `/corporate`:

| Tier | Price | Best for |
|---|---|---|
| **Clinic** | **$149 / month** | Single-location clinic, up to 10 staff. OPD + Patient EMR + Pharmacy + Billing + Telemedicine. |
| **Hospital** (most popular) | **$749 / month** | Multi-department up to 100 beds. Adds IPD + OT + Inventory + Lab + AI Voice + Priority support. |
| **Enterprise** | **Custom** | 100+ beds, multi-branch, diagnostic chains. Adds DICOM + HL7/FHIR + Dedicated infra + SLA + On-site training. |

**Close lines:**
- *"We start with a 14-day free trial — no card required."*
- *"If you sign a 12-month deal we seed your sandbox with your real org chart, departments, and doctors so you can start testing on day 1."*

### Minute 26–30 — Security, compliance, next step
Scroll to the dark security band on `/corporate` — point to the 6 pillars:

| | |
|---|---|
| Audit logs | Every read + write |
| Encryption | TLS 1.3 + AES-256 at rest |
| Backups | Hourly PITR (Point-In-Time Restore) |
| Roles | 10+ clinical presets |
| Exports | HL7 / FHIR / CSV |
| Hosting | EU / US / IN regions |

**Close:** scroll to the **Request a demo** form → collect their details → tell them:
- *"Pricing quote within 48 hours"*
- *"Sandbox account created the same day"*
- *"Our onboarding team schedules a follow-up with your CMO and IT lead"*

---

## 4. Handling common objections

| Objection | Response |
|---|---|
| *"We already have a HMS."* | "Great — most of our customers did. We migrate you one module at a time. You don't rip anything out until you're happy with the replacement. The lab or pharmacy module is usually the easiest first step." |
| *"Is it cloud-only? Our hospital prefers on-premise."* | "We offer managed cloud by default (EU/US/IN regions) but for Enterprise we can deploy in your own AWS/Azure/GCP account with a signed BAA." |
| *"What about data export if we leave?"* | "Your data is yours. One-click export to HL7, FHIR, or CSV — anytime, not just at cancellation. We'll show you the export button right now." |
| *"Does it work in Hindi/regional language?"* | "The interface supports multiple languages. Prescriptions, reports, and patient-facing SMS/email templates are localizable per branch." |
| *"How long to go live?"* | "Clinic tier: 3 days. Hospital tier: 2–3 weeks with module-by-module rollout. Enterprise: 4–6 weeks including data migration and training." |
| *"Who supports us after go-live?"* | "Email support on Clinic. Priority phone support + Slack channel on Hospital. Dedicated CSM on Enterprise." |
| *"What if you shut down?"* | "Postgres + Next.js — an open standard stack. HL7/FHIR exports. We've built it so you can self-host the whole thing if we ever stopped operating." |

---

## 5. What happens after they say "yes"

### The admin-side journey
1. **Lead lands** at `/admin/enterprise-leads` — sales team sees it immediately
2. **Empanelment** at `/admin/corporate-empanelment` — hospital onboarded as a corporate customer
3. **Sandbox created** — dedicated subdomain seeded with their org chart
4. **Kickoff call** scheduled within 48 hours
5. **Module rollout** — typically OPD + Pharmacy first, then IPD + Lab, then Billing + AI

### Documents we'll send
- Master Services Agreement (MSA) + SOW
- Business Associate Agreement (BAA) for HIPAA customers
- Data Processing Addendum (DPA) for GDPR/DPDP
- Security questionnaire (SOC2-aligned)
- Reference calls with 2–3 similar customers

---

## 6. Demo cheat-sheet card (print this, keep in front of you)

**URLs:**
- Corporate landing → https://www.odudoc.com/corporate
- Live admin → https://www.odudoc.com/admin
- Patient booking → https://www.odudoc.com (Find Doctors → any doctor → Book Appointment)
- KPI dashboard → https://www.odudoc.com/admin/kpi-dashboard

**Magic lines:**
- *"We replace 6 tools with 1 — but you turn modules on when you're ready."*
- *"Your data, your export, anytime — no lock-in."*
- *"14-day free trial, no card."*
- *"Pricing quote in 48 hours."*

**3 numbers to remember:**
- **12** — modules in the platform
- **14** — day free trial
- **48** — hour turnaround on pricing quote

**If asked about compliance:**
- HIPAA-aligned (US)
- GDPR-aligned (EU)
- DPDP-aligned (India)
- Audit logs on every read/write

---

## 7. Common corporate demo scenarios (pick one)

### Scenario A — Small clinic chain (2–5 locations)
Focus on: Patient EMR, Telemedicine, Pharmacy, Billing
Tier: **Clinic** ($149/mo × branches)
Wow moment: One patient record that follows them across branches.

### Scenario B — Standalone 50-bed hospital
Focus on: IPD + OPD + OT + Lab + Pharmacy + Billing
Tier: **Hospital** ($749/mo)
Wow moment: Bed census map + AI voice consult drafting a prescription in 90 seconds.

### Scenario C — Diagnostic lab chain
Focus on: Lab Management + Radiology + HL7/FHIR export
Tier: **Enterprise** (custom)
Wow moment: Order → sample → signed PDF → auto-SMS to patient in under 2 minutes.

### Scenario D — Multi-specialty 200-bed hospital
Focus on: Everything + DICOM + on-prem deployment + dedicated CSM
Tier: **Enterprise** (custom)
Wow moment: KPI dashboard showing cross-department productivity.

---

## 8. Post-demo email template

```
Subject: OduDoc for <Hospital Name> — next steps

Hi <Name>,

Thanks for your time today. As promised:

• 14-day sandbox: <sandbox URL — seeded with your departments>
• Login: <email> / <temp password>
• Pricing quote: attached (valid 30 days)
• Migration plan: 3-phase rollout, draft attached

Next step: 30-min call with your IT lead to review the integration
plan. I've proposed 3 slots in the attached calendar invite.

Questions in the meantime — reply to this email or WhatsApp me on
<number>.

— <Your name>
OduDoc for Hospitals
```

---

**Print this as a PDF and keep a copy open during every corporate demo.**
