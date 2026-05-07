"use client";

// The actual prose for every guide section, keyed by section id.
// Both /dashboard/doctor/guide (audience="doctor") and
// /for-doctors/guide (audience="public") render from this map.
//
// CTAs adapt to the audience: signed-in doctors see "Open this
// feature" links into the dashboard; public visitors see "Sign up
// to try" pointing at the application form.

import { Step, Tips, Cta } from "./Primitives";
import type { GuideAudience } from "@/lib/doctor-guide-content";

function ctaHref(audience: GuideAudience, dashboardHref: string): string {
  return audience === "doctor" ? dashboardHref : "/for-doctors";
}
function ctaLabel(audience: GuideAudience, doctorLabel: string): string {
  return audience === "doctor" ? doctorLabel : "Sign up to try";
}

export const SECTION_BODIES: Record<
  string,
  (audience: GuideAudience) => React.ReactNode
> = {
  "getting-started": (a) => (
    <>
      <Step n={1} title="Verify your credentials">
        Upload a government photo ID, a selfie holding the same ID, and your
        medical license. Our compliance team reviews submissions within 48
        hours. Until you&apos;re verified, your profile stays hidden from
        patients and consultations are locked. You can re-submit any time if
        we ask for a clearer scan.
        <Cta
          href={ctaHref(a, "/dashboard/doctor")}
          label={ctaLabel(a, "Open verification panel")}
        />
      </Step>
      <Step n={2} title="Complete your public profile">
        Add a clear photo, your specialty, qualifications, languages, fee, and
        a short bio. Profiles with a real headshot and 80+ words of bio get
        roughly <b>3.4×</b> more bookings.
        <Cta
          href={ctaHref(a, "/dashboard/doctor/profile")}
          label={ctaLabel(a, "Edit my profile")}
        />
      </Step>
      <Step n={3} title="Set your availability">
        Pick the days and time-slots when you&apos;ll accept consultations.
        You can override any specific day from the timetable later. Patients
        can only book inside these windows.
        <Cta
          href={ctaHref(a, "/dashboard/doctor/timetable")}
          label={ctaLabel(a, "Set my hours")}
        />
      </Step>
      <Step n={4} title="Connect a payout method">
        Stripe Connect or, in India, direct UPI / bank transfer. Without a
        payout method we still record your earnings — but you can&apos;t
        withdraw them until it&apos;s connected.
        <Cta
          href={ctaHref(a, "/dashboard/doctor/earnings")}
          label={ctaLabel(a, "Connect payouts")}
        />
      </Step>
    </>
  ),

  profile: (a) => (
    <>
      <p>
        Your profile is the page at <code>odudoc.com/d/&lt;your-slug&gt;</code>{" "}
        — it shows up in search, in city pages (e.g. Cardiologist in Mumbai),
        and in WhatsApp/SMS share previews. Edit any field at any time;
        changes go live instantly except for verification fields, which need
        admin re-approval.
      </p>
      <Tips
        items={[
          "Use a clear, recent headshot — patients trust faces, not logos.",
          "List 3–5 services you actively practice. Listing 'everything' looks junior.",
          "Mention languages — multilingual doctors get booked across borders.",
          "Set your fee in your local currency. We auto-display the right currency to each patient.",
        ]}
      />
      <Cta
        href={ctaHref(a, "/dashboard/doctor/profile")}
        label={ctaLabel(a, "Edit my profile")}
      />
    </>
  ),

  availability: (a) => (
    <>
      <h3 className="text-base font-semibold text-slate-900">Scheduled slots</h3>
      <p>
        Set a recurring weekly timetable. Patients book a specific 15- or
        30-minute slot, you confirm or reschedule from the consultations
        page, and they pay upfront. If you reject or no-show, the patient is
        refunded automatically.
      </p>
      <h3 className="mt-4 text-base font-semibold text-slate-900">
        Go available now (instant)
      </h3>
      <p>
        The big <em>Go available now</em> button on your dashboard puts you
        online for 15 minutes. While the timer runs, any patient looking for
        instant care can pay and start a video call with you immediately. The
        button auto-expires — no need to remember to switch off.
      </p>
      <Cta
        href={ctaHref(a, "/dashboard/doctor")}
        label={ctaLabel(a, "Toggle instant mode")}
      />
    </>
  ),

  consultations: (a) => (
    <>
      <Step n={1} title="A booking comes in">
        You&apos;ll get an email + push notification (and an SMS if it&apos;s
        an instant request). The consultation appears on the consultations
        page with status <em>Awaiting doctor</em>.
      </Step>
      <Step n={2} title="Approve, reschedule, or reject">
        One-click. Reschedule offers the patient three alternative slots from
        your timetable. Rejections refund the patient automatically.
      </Step>
      <Step n={3} title="Join the video call">
        When the slot starts, click <em>Join call</em>. Calls are end-to-end
        encrypted, run inside the browser (no install), and have built-in
        live transcription you can pause or hide.
      </Step>
      <Step n={4} title="Wrap up & write a prescription">
        After the call, write a prescription (any of the three flows below),
        add a follow-up note, and mark the consultation complete. Earnings
        drop into your balance the same day.
      </Step>
      <Cta
        href={ctaHref(a, "/dashboard/doctor/consultations")}
        label={ctaLabel(a, "Open consultations")}
      />
    </>
  ),

  prescriptions: (a) => (
    <>
      <p>
        Every prescription is digitally signed, includes a public verification
        URL the pharmacy can scan, and is delivered to the patient by email +
        in-app within seconds.
      </p>
      <Tips
        items={[
          "Manual: pick from a 30,000-drug catalogue with auto-complete on dose, frequency, and duration.",
          "AI-assisted: describe the case in plain English, AI suggests Rx, you edit and sign.",
          "Voice dictation: speak the script in 90+ languages, AI structures it.",
        ]}
      />
      <Cta
        href={ctaHref(a, "/dashboard/doctor/prescriptions")}
        label={ctaLabel(a, "Write a prescription")}
      />
    </>
  ),

  "ai-prescription": (a) => (
    <>
      <p>
        Type a one-line case summary like &quot;42 F, suspected acute sinusitis,
        no allergies, on metformin&quot; and our model proposes a structured
        prescription with dosing, duration, and patient-friendly instructions.
        It also flags interactions with current meds.
      </p>
      <p className="font-medium text-slate-700">
        You always sign the final script — the AI never sends without your
        review.
      </p>
      <Cta
        href={ctaHref(a, "/dashboard/doctor/ai-prescription")}
        label={ctaLabel(a, "Try AI prescriptions")}
      />
    </>
  ),

  voice: (a) => (
    <>
      <p>
        Tap the mic on the prescription page and dictate the script naturally
        — &quot;Amoxicillin 500 milligrams, twice a day, seven days, with
        food.&quot; The AI parses dose, frequency, duration, and instructions,
        and drops them into the form for you to edit and sign. Works in 90+
        languages including Hindi, Tamil, Telugu, Marathi, Bengali, Spanish,
        French, and Arabic.
      </p>
      <Cta
        href={ctaHref(a, "/dashboard/doctor/voice-prescription")}
        label={ctaLabel(a, "Open voice dictation")}
      />
    </>
  ),

  emr: (a) => (
    <>
      <p>
        A complete EMR built into your account — patient list, SOAP notes, lab
        files, vitals, growth charts, vaccination tracking, and HIPAA-
        compliant audit logs. Free for up to 50 new patients per month
        ($50/mo unlocks 250). One-click FHIR / HL7 export so you&apos;re
        never locked in.
      </p>
      <Tips
        items={[
          "Patients page — search any patient by name, phone, or ID.",
          "Per-patient timeline — past consultations, prescriptions, lab uploads, billing.",
          "Staff accounts — add a nurse or receptionist with limited permissions.",
          "Audit log — every record view/edit is timestamped and auditable.",
        ]}
      />
      <Cta
        href={ctaHref(a, "/dashboard/doctor/emr/patients")}
        label={ctaLabel(a, "Open EMR")}
      />
    </>
  ),

  earnings: (a) => (
    <>
      <p>
        You keep <b>70%</b> of the consultation fee on the Bronze tier — the
        platform fee drops to <b>25%</b> at Silver, <b>20%</b> at Gold, and{" "}
        <b>15%</b> at Platinum, based on completed-consultation milestones.
        There&apos;s no monthly subscription — you pay only when you earn.
      </p>
      <p>
        Payouts go out weekly via Stripe Connect (most countries) or direct
        UPI / bank transfer (India). You can also withdraw on demand from the
        earnings page once the balance clears the minimum threshold.
      </p>
      <Cta
        href={ctaHref(a, "/dashboard/doctor/earnings")}
        label={ctaLabel(a, "See earnings")}
      />
    </>
  ),

  ray: (a) => (
    <>
      <p>
        Ray runs alongside you during a consultation — listening (with
        consent) to the live transcript and surfacing differentials, flagging
        red-flag symptoms, suggesting questions, and pulling up relevant
        guidelines. None of it is sent to the patient until you choose to
        share it.
      </p>
      <Cta href={ctaHref(a, "/ray")} label={ctaLabel(a, "Learn about Ray")} />
    </>
  ),

  reviews: (a) => (
    <>
      <p>
        After a completed consultation, patients can leave a 5-star rating and
        a written review. Reviews appear on your public profile and feed into
        search ranking. You can reply to any review (publicly or privately),
        and you can flag abusive ones for our team to remove.
      </p>
      <Cta
        href={ctaHref(a, "/dashboard/doctor/reviews")}
        label={ctaLabel(a, "See my reviews")}
      />
    </>
  ),

  referrals: (a) => (
    <>
      <p>
        Send your unique referral link to another doctor. When they complete
        their first 5 consultations, you each earn a $25 bonus added to your
        next payout. There&apos;s no limit on referrals.
      </p>
      <Cta
        href={ctaHref(a, "/dashboard/doctor/referrals")}
        label={ctaLabel(a, "Get my referral link")}
      />
    </>
  ),

  mobile: () => (
    <>
      <p>
        Our Android app — <em>OduDoc Doctor</em> — handles instant
        consultations, video calls, prescriptions, and the EMR on the go.
        Push notifications mean you don&apos;t miss instant requests when away
        from your laptop. iOS coming soon.
      </p>
      <p className="text-sm text-slate-500">
        Search &quot;OduDoc Doctor&quot; on the Play Store, or ask support for
        an early-access invite while we&apos;re in closed testing.
      </p>
    </>
  ),

  compliance: () => (
    <>
      <Tips
        items={[
          "All consultations and records are encrypted in transit and at rest.",
          "India: ABHA Health ID linking is supported once your HPR ID is on file.",
          "We sign a BAA with you on first login (HIPAA-eligible jurisdictions).",
          "Email support@odudoc.com — we reply same business day.",
        ]}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Cta href="/help" label="Help center" />
        <Cta href="/contact" label="Contact support" variant="ghost" />
        <Cta href="/legal" label="Legal & merchant info" variant="ghost" />
      </div>
    </>
  ),
};
