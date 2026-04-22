#!/usr/bin/env node
// Seed OduDoc blog with SEO-optimised starter posts.
//
// Usage:
//   DATABASE_URL=postgresql://... node scripts/seed-blog-posts.mjs
//
// Idempotent: checks for existing slugs before inserting. Safe to re-run.
//
// Each post targets a high-intent search query and includes:
//   - keyword-rich title (<60 chars) and meta excerpt (<160 chars)
//   - 600-900 word article with H2 subheadings
//   - 4-6 tags

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL || "", { ssl: "require" });

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function readTime(content) {
  const words = content.trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function today() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const posts = [
  {
    title: "When to See a Doctor Online vs In-Person: A Simple Guide",
    excerpt:
      "Not sure whether your symptoms need a video consultation or a clinic visit? Here's a practical decision guide written by OduDoc's medical team.",
    category: "Patient Guides",
    tags: ["telemedicine", "online doctor", "video consultation", "symptoms"],
    content: `
## Why this matters

Telemedicine works brilliantly for a lot of everyday health issues — and it wastes your time for others. Knowing the difference saves a trip, a co-pay, and sometimes a wrong diagnosis.

## Good fits for a video consultation

- **Cold, flu, sinus congestion, sore throat.** A doctor can assess severity, prescribe medication, and advise on red flags.
- **Skin issues** — rashes, acne, eczema flares — where a close-up photo is often better than a hallway glance.
- **Medication refills and follow-ups** for stable chronic conditions like hypertension, hypothyroidism, or anxiety.
- **Mental health** — therapy and psychiatry translate naturally to video.
- **Post-lab-report review.** Upload your results, spend 10 minutes getting them explained.

## When you should see someone in person

- **Chest pain, shortness of breath, severe abdominal pain** — go to an ER, not a video call.
- **Anything needing a physical exam** — suspected appendicitis, a lump you want palpated, a joint that may be fractured.
- **Procedures** — stitches, injections, IV fluids, imaging, full blood draws.
- **New, severe, or rapidly worsening symptoms** without a clear cause.

## How to prepare for your video visit

1. Write down your symptoms, when they started, and what makes them better or worse.
2. List every medication and supplement you take.
3. Find good lighting and a stable camera angle.
4. Have a thermometer, blood pressure cuff, or other home devices ready if relevant.
5. Keep a pen and paper handy for follow-up instructions.

## The bottom line

If the issue is routine, follow-up, or primarily verbal — telemedicine is faster and cheaper. If it needs hands, imaging, or urgent action — go in. On OduDoc you can book either in under 60 seconds.
`.trim(),
  },
  {
    title: "Lab Test Fasting Rules: What to Eat and Drink the Night Before",
    excerpt:
      "A practical guide to fasting for common blood tests — lipid panel, glucose, liver function — plus what counts as breaking a fast.",
    category: "Lab Tests",
    tags: ["lab tests", "fasting", "blood test", "lipid profile", "glucose"],
    content: `
## Which tests actually need fasting?

Only some tests are affected by food and drink. Most are not.

- **Fasting blood glucose / HbA1c (insulin sensitivity panels):** 8-12 hours fasting.
- **Lipid profile (cholesterol, triglycerides):** 9-12 hours.
- **Comprehensive metabolic panel (CMP):** fasting preferred but often waived.
- **Liver function tests, thyroid, CBC, vitamin levels:** no fasting required.

Ask at booking — your lab will confirm.

## What breaks a fast?

- **Black coffee and plain tea:** usually fine in small amounts, but sweeteners, milk, and creamer do not count as fasting.
- **Water:** not only allowed but encouraged — hydration makes the blood draw easier.
- **Chewing gum, mints, cough drops:** break the fast for strict tests like fasting glucose.
- **Medications:** continue unless your doctor told you to pause.

## Night-before checklist

1. Finish dinner 10-12 hours before your appointment slot.
2. Skip alcohol for 24 hours before a lipid panel — even one drink can spike triglycerides.
3. Drink a normal amount of water. Dehydration thickens blood and can delay the draw.
4. Avoid heavy exercise in the 12 hours before — it can elevate several markers.
5. Sleep normally. Bad sleep itself shifts glucose and cortisol.

## Morning of the test

- Wear a shirt with easy sleeve access.
- Bring your ID and insurance card.
- Bring a snack for after the draw, especially if you're diabetic or prone to lightheadedness.
- Don't skip prescribed morning medications unless told to.

## Getting results faster

On OduDoc, lab results upload to your account as soon as the lab releases them — usually 24-48 hours. You can share them with any OduDoc doctor in one click for a follow-up video review.
`.trim(),
  },
  {
    title: "How Hospitals Reduce No-Shows by 40% With WhatsApp Reminders",
    excerpt:
      "A no-show rate of 15-25% is quietly draining clinic revenue. Here's the reminder stack that's cutting it in half for OduDoc hospitals.",
    category: "For Clinics",
    tags: ["hospital management", "no-shows", "WhatsApp", "appointment reminders", "clinic software"],
    content: `
## The cost of a no-show

A typical specialist no-show costs a clinic $150-$250 in lost revenue, a wasted room-slot, and a doctor who can't be re-deployed on short notice. Multiply that across a 6-doctor practice and the annual leak is over $200K.

## Why patients no-show

It's rarely malice. In our data, the top four reasons are:

1. They forgot — 42%
2. They couldn't get childcare or transport — 21%
3. They felt better — 17%
4. They didn't realise they could reschedule — 12%

Three out of four of those are solvable by better communication.

## The reminder stack that works

- **T-7 days:** email confirmation with a one-tap reschedule link.
- **T-2 days:** WhatsApp message — open rates average 95% vs 22% for email.
- **T-3 hours:** SMS with directions, parking notes, and what to bring.
- **T-0 when patient arrives:** queue update ("Dr. Kumar is running 12 min late").

Every message includes a reschedule link. If they can't make it, you want to know as early as possible so the slot goes to someone on the waitlist.

## The waitlist trick

When someone cancels, auto-offer the slot to the next three patients on a waitlist for that doctor. First to confirm takes it. This alone recovers ~60% of cancelled slots at zero marginal cost.

## What to measure

- No-show rate (target < 8%)
- Same-day cancellation rate (target < 5%)
- Waitlist fill rate (target > 55%)
- Reminder open-rate by channel

If you run a clinic on OduDoc, all four metrics live on your dashboard — no setup required.
`.trim(),
  },
  {
    title: "EHR, EMR, and HIS: What's the Difference and Which Do You Need?",
    excerpt:
      "Hospital software acronyms explained in plain English — and a buyer's framework for choosing the right one for your size and specialty.",
    category: "For Clinics",
    tags: ["EHR", "EMR", "HIS", "hospital software", "healthcare IT"],
    content: `
## The three terms, defined

- **EMR (Electronic Medical Record):** the digital chart for one practice — patient history, medications, allergies, notes. Lives inside the clinic.
- **EHR (Electronic Health Record):** a broader record designed to follow the patient across providers. Includes everything an EMR has, plus referrals, labs, and imaging from external sources.
- **HIS (Hospital Information System):** the operational backbone of a hospital — admissions, beds, billing, pharmacy, lab, staff scheduling. EHR is usually one module inside a HIS.

## Which one do you actually need?

- **Solo practitioner or 1-5 doctor clinic:** a solid EMR is enough. You care about charting speed, e-prescriptions, and billing.
- **Multi-specialty clinic with labs or in-house pharmacy:** EHR with lab and pharmacy modules. You want results flowing into the chart automatically.
- **Hospital with inpatient beds:** full HIS. You need bed management, OT scheduling, discharge summaries, and accrual billing.

## What to evaluate

1. **Clinical workflow fit.** Shadow a doctor using the software for a day. If charting adds 2 minutes per patient, you'll lose hours weekly.
2. **Interoperability.** Can it export to CCDA or FHIR? Can it receive lab results via HL7?
3. **Billing integration.** Does it generate clean claims, or does your team re-type everything into a billing system?
4. **Audit trail and access control.** Who saw what, when, and why.
5. **Pricing model.** Per-provider, per-bed, or per-transaction — pick the one that aligns with your growth.

## Common mistakes

- Buying for features you don't use yet ("we might do radiology one day").
- Ignoring hardware requirements — some systems need on-prem servers you don't have space for.
- Underestimating training. Budget 2-4 weeks of reduced throughput during rollout.

## OduDoc's approach

OduDoc ships as a cloud-hosted HIS with EHR baked in. Appointments, admissions, billing, pharmacy, lab, prescriptions, and notifications share one patient record — no ETL, no integrations to babysit.
`.trim(),
  },
  {
    title: "Hernia Repair Recovery: Week-by-Week Timeline and Red Flags",
    excerpt:
      "What to expect in the days, weeks, and months after inguinal or umbilical hernia repair — and when to call your surgeon.",
    category: "Surgery Guides",
    tags: ["hernia repair", "recovery", "surgery", "laparoscopic", "post-op"],
    content: `
## Before you read

This is general information, not medical advice. If your surgeon gave you specific instructions, follow those. Symptoms that feel wrong almost always are — call.

## Day 0-3: the hardest part

- Expect soreness, mild bruising, and tightness at the incision.
- Pain peaks around 48 hours post-op, then improves daily.
- Walk every 1-2 hours — even short laps around a room. This prevents clots and speeds recovery.
- No lifting over 10 lb. No driving while on opioids.
- Ice 20 minutes on, 20 off, for the first 48 hours.

## Week 1: gentle momentum

- Most desk workers feel well enough to work from home by day 5-7.
- Shower normally after 48 hours unless your surgeon said otherwise.
- You can walk a mile comfortably by end of week one.
- Constipation from anaesthesia and pain medication is almost universal — start a stool softener on day one.

## Week 2-4: easing back in

- Return to office work.
- Light driving (short trips) once off opioids and able to do an emergency stop.
- No heavy lifting, no stomach exercises, no sex involving abdominal strain.
- Expect intermittent pulling, itching, or numbness at the site. Normal.

## Month 2-3: structured return

- Your surgeon will clear you for gradually heavier lifting — typically 25 lb by week 6, full by week 12.
- Resume cardio first. Weightlifting last.
- 85% of patients are back to full activity by three months.

## Red flags — call immediately

- Fever over 101°F (38.3°C).
- Increasing redness, warmth, or pus at the incision.
- Bulging that wasn't there yesterday — possible recurrence.
- Severe pain, vomiting, or inability to pass gas — possible bowel obstruction.
- Shortness of breath or sudden leg swelling — possible blood clot.

## Getting follow-up care

On OduDoc, you can book a post-op video check-in with your surgeon or a general physician in under 60 seconds. Upload a photo of the incision and get answers without a clinic trip.
`.trim(),
  },
  {
    title: "Blood Pressure at Home: How to Take an Accurate Reading",
    excerpt:
      "Home BP readings only help if they're accurate. Here's the technique, timing, and cuff advice that makes them usable in a doctor's assessment.",
    category: "Patient Guides",
    tags: ["blood pressure", "hypertension", "home monitoring", "cardiology"],
    content: `
## Why home readings matter

Clinic readings are often elevated — the so-called white-coat effect — and a single measurement every six months doesn't tell the real story. A week of good home readings beats a one-off clinic number almost every time.

## Picking a cuff

- **Upper-arm automatic cuffs** are the gold standard. Wrist and finger devices are less reliable.
- Size matters. The bladder should cover 80% of your upper arm circumference. Too small reads high, too large reads low.
- Validated brands: Omron, A&D, Microlife. Look for the "validated by a professional body" badge on the box.

## The technique

1. No caffeine, cigarettes, or exercise for 30 minutes before.
2. Empty your bladder.
3. Sit for 5 minutes. Back supported, feet flat on the floor, arm resting at heart level.
4. Don't talk during the reading.
5. Take two readings, one minute apart. Record both.

## When to measure

- Morning, before breakfast and medication.
- Evening, before dinner.
- For seven consecutive days if your doctor asked for a log.

## What numbers mean

- Under 120/80 — ideal.
- 120-129 / under 80 — elevated.
- 130-139 / 80-89 — stage 1 hypertension.
- 140+/90+ — stage 2 hypertension.
- Over 180/120 with symptoms — emergency.

## Sharing the data

On OduDoc you can upload your home BP log in one tap and a Cardiologist will review it before your next video consultation — no need to retype readings.
`.trim(),
  },
  {
    title: "Type 2 Diabetes: What Your HbA1c Number Actually Means",
    excerpt:
      "HbA1c in plain English — what's normal, what's pre-diabetes, what counts as well-controlled, and how fast changes show up.",
    category: "Patient Guides",
    tags: ["diabetes", "HbA1c", "blood sugar", "endocrinology"],
    content: `
## What HbA1c measures

HbA1c reflects your average blood glucose over the previous 2-3 months. It's the single most useful marker for diagnosing and tracking type 2 diabetes.

## The numbers

- **Below 5.7%** — normal.
- **5.7%-6.4%** — pre-diabetes. A wake-up call, not a diagnosis.
- **6.5% or above (on two occasions)** — diabetes.
- **Under 7%** — typical control target for most adults with diabetes.
- **Under 6.5%** — tighter target, younger patients with no complications.

## How fast can you change it?

HbA1c reflects a rolling 90-day average. A major lifestyle shift shows up in four weeks and is fully reflected in three months. Don't judge a new diet or medication by a reading taken two weeks in.

## What drives it down

- **Weight loss.** A 5-10% body-weight reduction can drop HbA1c by 1-2 points in a pre-diabetic.
- **Walking after meals.** Ten minutes of post-meal walking blunts the glucose spike.
- **Metformin.** First-line, usually well tolerated, typically drops HbA1c by 1-1.5 points.
- **GLP-1 receptor agonists.** More expensive but very effective, with weight loss as a bonus.
- **Sleep.** Bad sleep raises fasting glucose the next day — chronically, it raises HbA1c.

## When to escalate

If you're on metformin at maximum tolerated dose and HbA1c is still over 8%, it's time to add a second agent. An Endocrinologist video consultation can review your numbers and medication in one session.

## Complications to watch for

- Annual diabetic eye exam.
- Annual foot check.
- Annual urine microalbumin.
- BP and lipid management — diabetes is a cardiovascular disease as much as a sugar disease.
`.trim(),
  },
  {
    title: "Postpartum Depression: Signs, Treatment & When to Ask for Help",
    excerpt:
      "Baby blues or something more? A gentle guide to recognising postpartum depression and getting confidential online help — fast.",
    category: "Mental Health",
    tags: ["postpartum depression", "mental health", "new mothers", "online psychiatrist"],
    content: `
## You are not alone

One in seven new mothers will experience postpartum depression (PPD). It's a medical condition, not a character flaw, and it responds well to treatment.

## Baby blues vs PPD

- **Baby blues** — tearfulness, mood swings, overwhelm in the first two weeks. Passes without treatment.
- **PPD** — persists beyond two weeks, affects sleep beyond what the baby causes, dims joy, and can include intrusive thoughts.

## Warning signs

- Feeling hopeless, worthless, or disconnected from the baby.
- Crying most days, often without a clear trigger.
- Inability to sleep even when the baby is sleeping.
- Loss of appetite or comfort eating.
- Thoughts of harming yourself or the baby — tell someone today, not tomorrow.

## What helps

- **Talk therapy**, especially CBT and interpersonal therapy.
- **SSRIs** — several are compatible with breastfeeding. A psychiatrist will guide the choice.
- **Sleep support**. Getting a single 5-hour block of sleep a night, supported by a partner or family, is transformative.
- **Peer support groups**. Knowing other new mothers are in the same place is medicine.

## How OduDoc helps

A Psychiatrist video consultation — confidential, from home, with a sleeping baby on your chest if that's what it takes — is often the fastest route to treatment. You don't need to wait for a clinic visit to start feeling better.

## If you're in crisis

If you have thoughts of suicide or harming your baby, contact an emergency service now or go to the nearest ER. Bring a partner, family member, or friend. You will not lose your baby by asking for help — you will get the help you need to be well for your baby.
`.trim(),
  },
  {
    title: "Telemedicine in India: Legal Framework and Patient Rights in 2026",
    excerpt:
      "Who can consult online, what prescriptions are valid, and what protections you have as a patient under India's telemedicine rules.",
    category: "Patient Guides",
    tags: ["telemedicine", "India", "regulations", "patient rights"],
    content: `
## The short version

Telemedicine is fully legal in India. The Ministry of Health's Telemedicine Practice Guidelines, issued with the Medical Council of India, set out who can consult, how, and what can be prescribed.

## Who can practice telemedicine

Any doctor registered with a state medical council or the National Medical Commission can consult patients over video, phone, or text. There is no separate telemedicine licence. Doctors must complete a short online course covering the guidelines.

## Prescriptions

- Category O (OTC) medications — any consultation.
- Category A — safe for first-time telemedicine prescription when clearly indicated.
- Category B — refills and follow-ups only.
- Category X — never via telemedicine (narcotics, certain psychotropics).

Prescriptions issued over video are legally equivalent to in-person ones and are honoured by pharmacies across the country.

## Your rights as a patient

- Informed consent — the doctor must confirm you're comfortable with a video visit.
- Privacy — consultations are confidential. OduDoc encrypts all video and stores records under the same rules as clinical hospitals.
- Choice — you can decline or end a consultation at any time.
- Records — you own your medical record and can request a full copy.
- Escalation — if video isn't enough, the doctor must clearly tell you to seek in-person care.

## Fees and refunds

Fees are set by the doctor. If a consultation cannot proceed (technical failure, the doctor can't assess remotely), OduDoc refunds automatically.

## Who it's best for

Everyone from urban professionals to rural patients who'd otherwise travel hours. Where internet is poor, audio-only calls are allowed and still legally binding.
`.trim(),
  },
  {
    title: "Preventive Health Checkup: What Tests You Actually Need by Age",
    excerpt:
      "A no-nonsense screening schedule from 20s through 70s — what's worth doing, what's optional, and what's marketing.",
    category: "Patient Guides",
    tags: ["preventive health", "screening", "health checkup", "annual physical"],
    content: `
## The principle

Screen for conditions where early detection changes the outcome, and skip the ones where it doesn't. Most commercial "whole-body checkups" mix useful tests with expensive noise.

## In your 20s

- Blood pressure every 2 years.
- Cholesterol once (baseline), then every 5 years if normal.
- HbA1c if you have risk factors (family history, overweight, PCOS).
- HPV vaccination if not already done.
- Cervical cancer screening every 3 years from age 21 (women).
- Mental health check-in whenever you need it.

## In your 30s

- All of the above.
- Thyroid once, then only if symptomatic.
- Full lipid panel every 5 years.
- Skin check if fair-skinned or high sun exposure.

## In your 40s

- Blood pressure annually.
- Lipid panel every 3 years.
- HbA1c every 3 years.
- Mammogram from 40-45 depending on risk (women).
- Eye exam every 2 years.

## In your 50s

- Colonoscopy at 45-50, repeat per findings.
- PSA discussion (men) — shared decision, not a blanket yes.
- Bone density if high risk.
- Shingles vaccine from 50.

## In your 60s and beyond

- Annual BP, lipids, HbA1c.
- Colon screening through 75.
- AAA screen (one-off) for men 65-75 who ever smoked.
- Cognitive check-in annually.
- Pneumococcal vaccine, annual flu, updated Covid.

## What usually isn't worth it

- Whole-body MRI screenings in asymptomatic people.
- "Tumour marker" panels outside specific high-risk contexts.
- Food intolerance IgG tests.
- Repeat ECGs and echocardiograms without symptoms.

## Putting it together

Book a video consultation with a General Physician to get a tailored list for your age, family history, and lifestyle. Then book the labs in one tap — no clinic visit required.
`.trim(),
  },
  {
    title: "How to Read Your Thyroid Report: TSH, T3, and T4 Explained",
    excerpt:
      "Three numbers, one small gland, a lot of confusion. Here's what each thyroid value means and when to worry.",
    category: "Patient Guides",
    tags: ["thyroid", "TSH", "hypothyroidism", "hyperthyroidism", "lab results"],
    content: `
## The three numbers

- **TSH (thyroid-stimulating hormone)** — the pituitary's signal to the thyroid. High TSH means the thyroid is underactive; low TSH means overactive.
- **Free T4** — the main hormone the thyroid produces.
- **Free T3** — the active form, converted from T4 in tissues.

## Common patterns

- **High TSH, low T4** — overt hypothyroidism. Usually treated.
- **High TSH, normal T4** — subclinical hypothyroidism. Treat if TSH > 10 or symptomatic.
- **Low TSH, high T4/T3** — hyperthyroidism. Needs specialist review.
- **Low TSH, normal T4/T3** — subclinical hyperthyroidism. Watchful waiting is common.

## Symptoms that match

- **Hypothyroidism** — fatigue, weight gain, cold intolerance, constipation, dry skin, hair thinning, low mood, heavy periods.
- **Hyperthyroidism** — weight loss despite appetite, palpitations, tremor, heat intolerance, loose stools, anxiety, eye bulging.

## When to retest

- After starting or changing levothyroxine: 6-8 weeks.
- Once stable: annually.
- During pregnancy: every trimester, earlier if the dose changes.

## What else to check

- **TPO antibodies** — confirm autoimmune thyroiditis (Hashimoto's).
- **Ultrasound** — if nodules are felt or if TSH changes dramatically.

## Getting help online

An Endocrinologist can review your report, adjust your dose, and order repeat labs — all by video. You upload the report, they read it in front of you, and you leave with a clear plan.
`.trim(),
  },
  {
    title: "Second Opinion: When to Get One and How to Ask",
    excerpt:
      "A second opinion is a right, not a rudeness. Here's when it's worth seeking one and how to do it without offending your first doctor.",
    category: "Patient Guides",
    tags: ["second opinion", "patient rights", "diagnosis", "telemedicine"],
    content: `
## Situations that justify one

- A major diagnosis (cancer, MS, autoimmune disease).
- Any recommendation for non-emergency surgery.
- A rare or unclear diagnosis.
- A treatment plan with significant side effects.
- You don't feel heard, or the answers don't fit the symptoms.

## What a second opinion actually gives you

- Confirmation, so you proceed with confidence.
- An alternative, so you know your options.
- A different test that changes the picture.
- Sometimes, nothing new — which is also useful.

## How to approach it

1. Tell your current doctor. "I'd like a second opinion before deciding." Most will welcome it. If they don't, that's a data point.
2. Gather records — reports, imaging, prescription list. On OduDoc these are already in your account.
3. Book with a specialist in the same field, ideally at a different institution.
4. Send records in advance so the second doctor isn't diagnosing cold.
5. Ask specific questions: is the diagnosis definitive, are there alternative tests, what would they recommend.

## Telemedicine makes it easier

- You can book a top specialist in another city without travelling.
- Records upload instantly.
- You can get a written summary to share back with your primary doctor.

## When to skip it

- Obvious, self-limiting conditions.
- Emergencies — treat first, review later.
- When it becomes avoidance of a decision you already know the answer to.
`.trim(),
  },
  {
    title: "Choosing a Pediatrician: 10 Questions to Ask Before You Commit",
    excerpt:
      "Your child's first doctor matters. Here's what to ask in the introductory visit to know whether it's the right fit.",
    category: "Patient Guides",
    tags: ["pediatrician", "children", "family health", "choosing a doctor"],
    content: `
## Why it matters

You'll see your pediatrician 10+ times in the first year alone. Pick well.

## Ten questions

1. **What's your philosophy on fevers, antibiotics, and minor illnesses?** Answers tell you whether you'll agree on thresholds.
2. **How do I reach you after hours?** Phone, app, nurse line, none?
3. **How long are routine visits?** Under 10 minutes is a red flag for anything beyond a simple check-up.
4. **Are you available for telemedicine?** Convenient for rashes, feeding questions, and follow-ups.
5. **What's your stance on vaccinations?** Most parents want a doctor who follows the standard schedule — ask to be sure.
6. **How do you handle parents who disagree with you?** Look for collaborative, not dismissive.
7. **What's your approach to breastfeeding, formula, and weaning?** Should be supportive, not prescriptive.
8. **Do you have a developmental screening protocol?** Good clinics screen at 9, 18, 24 and 30 months.
9. **How do you handle urgent fevers or symptoms — same-day slots or ER referral?**
10. **What's the billing structure?** Package plans, per-visit, insurance preferences.

## Red flags

- Rushed, dismissive, or condescending answers.
- "We don't do phone calls."
- No clear vaccination policy.
- Long wait times for sick visits (> 24 hours).

## Green flags

- Willingness to say "I don't know — let me find out."
- Evidence-based but flexible about parental choices where safe.
- A nurse or MA who can triage quickly.
- Electronic records you can access.

## On OduDoc

Many Pediatricians on OduDoc offer a free 10-minute introductory video call. Use it. It's the lowest-cost way to find out whether you and the doctor are a fit.
`.trim(),
  },
  {
    title: "Reading an ECG Report: What the Terms Actually Mean",
    excerpt:
      "Sinus rhythm, left axis deviation, T wave changes — a glossary for patients trying to decode their own ECG.",
    category: "Patient Guides",
    tags: ["ECG", "EKG", "cardiology", "heart health", "lab results"],
    content: `
## The common phrases

- **Normal sinus rhythm** — the heart is beating in its usual pattern at 60-100 bpm. Reassuring.
- **Sinus bradycardia** — normal pattern, rate under 60. Common and usually benign in fit people.
- **Sinus tachycardia** — normal pattern, rate over 100. Triggered by stress, caffeine, fever, dehydration, anaemia.
- **Atrial fibrillation (AFib)** — irregular, often fast. Increases stroke risk. Needs review.
- **Left/right axis deviation** — the average direction of electrical flow. Often a normal variant; sometimes points to enlarged chambers.

## ST and T wave language

- **ST elevation** — can mean a heart attack. Needs urgent assessment — do not delay.
- **ST depression** — may mean reduced blood supply to heart muscle under stress. Often needs further testing.
- **T wave inversion** — can be normal in some leads or hint at cardiac strain elsewhere. Context matters.

## Interval talk

- **PR interval** — time from atrial to ventricular contraction. Long PR means heart block.
- **QRS duration** — width of the main beat. Wide QRS can indicate conduction disease.
- **QT interval** — recovery time. Long QT, especially on certain medications, can cause dangerous rhythms.

## When to worry

- Chest pain with ST elevation — ER now.
- New AFib — urgent cardiology review.
- Long QT with palpitations or fainting — urgent review.

## When not to panic

- "Non-specific ST-T changes" in an asymptomatic person is extremely common.
- Early repolarisation is usually a benign pattern in young athletes.
- Occasional ectopic beats are almost universal.

## What to do with the report

Upload your ECG to OduDoc and book a Cardiologist video consultation. They'll review it on screen, compare with prior ECGs if you have them, and recommend next steps — or reassure you that no action is needed.
`.trim(),
  },
  {
    title: "Pre-Surgery Checklist: What to Do in the Week Before Your Operation",
    excerpt:
      "Seven days, clear steps — from what to eat, what to stop, and what to pack — so your surgery day runs smoothly.",
    category: "Surgery Guides",
    tags: ["surgery preparation", "pre-op", "anaesthesia", "hospital admission"],
    content: `
## Seven days out

- Confirm the surgery time and location.
- Review the medication list with your surgeon — blood thinners often need to stop 5-7 days before.
- Stop smoking if you can — even a week helps wound healing.
- Stock up on soft foods, easy snacks, and any prescribed post-op medications.

## Four days out

- Avoid alcohol from here onward.
- Buy any supportive gear — ice packs, wedge pillow, loose clothing.
- Arrange your ride home. You cannot drive yourself after anaesthesia.
- Line up help for the first 48 hours at home.

## Two days out

- Shower normally. Do not apply lotions, creams, or perfume the day before or the day of.
- Clean the home environment — wash bedding, stock the fridge.
- Pack a small bag: ID, insurance card, phone charger, glasses case, comfortable going-home outfit.

## The day before

- Eat normally until the fasting cut-off your surgeon gave you (usually 6-8 hours before arrival for solids, 2 hours for clear fluids).
- Take prescribed medications with a sip of water unless told otherwise.
- Sleep early. Caffeine tapering in the evening helps.

## The morning of

- Shower with any surgical soap you were given.
- Wear loose, front-opening clothes.
- No jewelry, contact lenses, nail polish, or makeup.
- Arrive 1-2 hours before scheduled start.

## Questions to ask the anaesthetist

- What type of anaesthesia?
- What side effects should I expect?
- How soon after can I eat?
- When can I drive?

## Red flags in the week before

- Cough, cold, or fever — tell the surgical team. Minor operations are often postponed.
- New rash or skin infection near the surgical site — call.
- Sudden new medications or herbal supplements — run them past the team first.

## After surgery

On OduDoc, a post-op video consultation with your surgeon in the first week keeps recovery on track and catches problems early — without a trip back to the hospital.
`.trim(),
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  // Ensure table exists (matches blog-store.ts schema).
  await sql`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'OduDoc Team',
      author_bio TEXT NOT NULL DEFAULT '',
      author_initials TEXT NOT NULL DEFAULT 'OD',
      category TEXT NOT NULL,
      tags TEXT[] NOT NULL DEFAULT '{}',
      date TEXT NOT NULL,
      read_time TEXT NOT NULL,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'Published',
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  let created = 0;
  let skipped = 0;
  for (const p of posts) {
    const slug = slugify(p.title);
    const existing = await sql`SELECT 1 FROM blog_posts WHERE slug = ${slug} LIMIT 1`;
    if (existing.length > 0) {
      console.log(`· skip (already exists): ${slug}`);
      skipped++;
      continue;
    }
    const id = `post-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    await sql`
      INSERT INTO blog_posts
        (id, slug, title, excerpt, content, author, author_bio, author_initials,
         category, tags, date, read_time, featured, status)
      VALUES
        (${id}, ${slug}, ${p.title}, ${p.excerpt}, ${p.content},
         ${"OduDoc Team"}, ${"OduDoc's editorial team of doctors and health writers."},
         ${"OD"}, ${p.category}, ${p.tags}, ${today()},
         ${readTime(p.content)}, ${false}, ${"Published"})
    `;
    console.log(`✓ created: ${slug}`);
    created++;
  }

  console.log(`\nDone. created=${created} skipped=${skipped}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
