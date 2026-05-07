"use client";

// Doctor onboarding & feature guide.
//
// One long page that walks every doctor through the platform's features
// in roughly the order they'll need them: profile setup, availability,
// consultations (scheduled + instant), prescriptions (manual + AI +
// voice), the EMR, earnings/payouts, the AI assistant (Ray), reviews,
// and the mobile app. Each section has a deep-link sidebar entry and
// a clear "Open this feature" CTA so it doubles as a launcher.
//
// Lives under /dashboard/doctor so the verification gate enforces
// that only signed-in doctors see it. A public preview version can
// later be split off to /for-doctors/guide if needed.

import Link from "next/link";
import { useEffect, useState } from "react";

interface Section {
  id: string;
  label: string;
  icon: string;
}

const SECTIONS: Section[] = [
  { id: "getting-started", label: "Getting started", icon: "🎯" },
  { id: "profile", label: "Your public profile", icon: "👤" },
  { id: "availability", label: "Availability & instant mode", icon: "🟢" },
  { id: "consultations", label: "Consultations & video calls", icon: "📞" },
  { id: "prescriptions", label: "Prescriptions", icon: "💊" },
  { id: "ai-prescription", label: "AI prescription assistant", icon: "🤖" },
  { id: "voice", label: "Voice dictation", icon: "🎙️" },
  { id: "emr", label: "Clinic EMR", icon: "📋" },
  { id: "earnings", label: "Earnings & payouts", icon: "💰" },
  { id: "ray", label: "OduDoc Ray (AI co-pilot)", icon: "✨" },
  { id: "reviews", label: "Reviews & reputation", icon: "⭐" },
  { id: "referrals", label: "Refer a colleague", icon: "🤝" },
  { id: "mobile", label: "Mobile app", icon: "📱" },
  { id: "compliance", label: "Compliance & support", icon: "🛡️" },
];

export default function DoctorGuidePage() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  // Scroll-spy: highlight the sidebar entry for whichever section is
  // closest to the top of the viewport. IntersectionObserver with a
  // top-margin so the active entry switches when the heading scrolls
  // past the navbar instead of when it's at the very top.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) {
          setActiveId(visible.target.id);
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0.1,
      },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-600">
            Doctor onboarding
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            Welcome to OduDoc
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            Everything you can do on OduDoc, in the order you&apos;ll usually need it.
            Each section has a one-click link to the actual feature so you can try it
            as you read.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <nav className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                On this page
              </p>
              <ul className="space-y-0.5">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                        activeId === s.id
                          ? "bg-primary-50 font-semibold text-primary-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span aria-hidden className="text-base">
                        {s.icon}
                      </span>
                      <span>{s.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Body */}
          <main className="space-y-12">
            <Section id="getting-started" title="🎯 Getting started" tagline="What happens in your first hour">
              <Step n={1} title="Verify your credentials">
                Upload a government photo ID, a selfie holding the same ID, and your
                medical license. Our compliance team reviews submissions within 48
                hours. Until you&apos;re verified, your profile stays hidden from
                patients and consultations are locked. You can re-submit any time if
                we ask for a clearer scan.
                <Cta href="/dashboard/doctor" label="Open verification panel" />
              </Step>
              <Step n={2} title="Complete your public profile">
                Add a clear photo, your specialty, qualifications, languages, fee,
                and a short bio. Profiles with a real headshot and 80+ words of bio
                get roughly <b>3.4×</b> more bookings.
                <Cta href="/dashboard/doctor/profile" label="Edit my profile" />
              </Step>
              <Step n={3} title="Set your availability">
                Pick the days and time-slots when you&apos;ll accept consultations.
                You can override any specific day from the timetable later. Patients
                can only book inside these windows.
                <Cta href="/dashboard/doctor/timetable" label="Set my hours" />
              </Step>
              <Step n={4} title="Connect a payout method">
                Stripe Connect or, in India, direct UPI / bank transfer. Without a
                payout method we still record your earnings — but you can&apos;t
                withdraw them until it&apos;s connected.
                <Cta href="/dashboard/doctor/earnings" label="Connect payouts" />
              </Step>
            </Section>

            <Section id="profile" title="👤 Your public profile" tagline="What patients see before booking">
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
              <Cta href="/dashboard/doctor/profile" label="Edit my profile" />
            </Section>

            <Section id="availability" title="🟢 Availability & instant mode" tagline="Two ways patients reach you">
              <h3 className="text-base font-semibold text-slate-900">Scheduled slots</h3>
              <p>
                Set a recurring weekly timetable. Patients book a specific 15- or
                30-minute slot, you confirm or reschedule from the consultations
                page, and they pay upfront. If you reject or no-show, the patient
                is refunded automatically.
              </p>
              <h3 className="mt-4 text-base font-semibold text-slate-900">Go available now (instant)</h3>
              <p>
                The big <em>Go available now</em> button on your dashboard puts you
                online for 15 minutes. While the timer runs, any patient looking for
                instant care can pay and start a video call with you immediately.
                The button auto-expires — no need to remember to switch off.
              </p>
              <Cta href="/dashboard/doctor" label="Toggle instant mode" />
            </Section>

            <Section id="consultations" title="📞 Consultations & video calls" tagline="From booking to follow-up">
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
              <Cta href="/dashboard/doctor/consultations" label="Open consultations" />
            </Section>

            <Section id="prescriptions" title="💊 Prescriptions" tagline="Three ways to write a script">
              <p>
                Every prescription is digitally signed, includes a public verification
                URL the pharmacy can scan, and is delivered to the patient by email
                + in-app within seconds.
              </p>
              <Tips
                items={[
                  "Manual: pick from a 30,000-drug catalogue with auto-complete on dose, frequency, and duration.",
                  "AI-assisted: describe the case in plain English, AI suggests Rx, you edit and sign.",
                  "Voice dictation: speak the script in 90+ languages, AI structures it.",
                ]}
              />
              <Cta href="/dashboard/doctor/prescriptions" label="Write a prescription" />
            </Section>

            <Section id="ai-prescription" title="🤖 AI prescription assistant" tagline="Faster Rx, never autopilot">
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
              <Cta href="/dashboard/doctor/ai-prescription" label="Try AI prescriptions" />
            </Section>

            <Section id="voice" title="🎙️ Voice dictation" tagline="Speak it, sign it">
              <p>
                Tap the mic on the prescription page and dictate the script
                naturally — &quot;Amoxicillin 500 milligrams, twice a day, seven
                days, with food.&quot; The AI parses dose, frequency, duration, and
                instructions, and drops them into the form for you to edit and sign.
                Works in 90+ languages including Hindi, Tamil, Telugu, Marathi,
                Bengali, Spanish, French, and Arabic.
              </p>
              <Cta href="/dashboard/doctor/voice-prescription" label="Open voice dictation" />
            </Section>

            <Section id="emr" title="📋 Clinic EMR" tagline="Free electronic medical records">
              <p>
                A complete EMR built into your account — patient list, SOAP notes,
                lab files, vitals, growth charts, vaccination tracking, and HIPAA-
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
              <Cta href="/dashboard/doctor/emr/patients" label="Open EMR" />
            </Section>

            <Section id="earnings" title="💰 Earnings & payouts" tagline="What you keep, when you get it">
              <p>
                You keep <b>70%</b> of the consultation fee on the Bronze tier — the
                platform fee drops to <b>25%</b> at Silver, <b>20%</b> at Gold, and{" "}
                <b>15%</b> at Platinum, based on completed-consultation milestones.
                There&apos;s no monthly subscription — you pay only when you earn.
              </p>
              <p>
                Payouts go out weekly via Stripe Connect (most countries) or direct
                UPI / bank transfer (India). You can also withdraw on demand from
                the earnings page once the balance clears the minimum threshold.
              </p>
              <Cta href="/dashboard/doctor/earnings" label="See earnings" />
            </Section>

            <Section id="ray" title="✨ OduDoc Ray (AI co-pilot)" tagline="Your second brain during consults">
              <p>
                Ray runs alongside you during a consultation — listening (with
                consent) to the live transcript and surfacing differentials,
                flagging red-flag symptoms, suggesting questions, and pulling
                up relevant guidelines. None of it is sent to the patient until
                you choose to share it.
              </p>
              <Cta href="/ray" label="Learn about Ray" />
            </Section>

            <Section id="reviews" title="⭐ Reviews & reputation" tagline="How patients rate you">
              <p>
                After a completed consultation, patients can leave a 5-star rating
                and a written review. Reviews appear on your public profile and
                feed into search ranking. You can reply to any review (publicly or
                privately), and you can flag abusive ones for our team to remove.
              </p>
              <Cta href="/dashboard/doctor/reviews" label="See my reviews" />
            </Section>

            <Section id="referrals" title="🤝 Refer a colleague" tagline="Both of you earn">
              <p>
                Send your unique referral link to another doctor. When they complete
                their first 5 consultations, you each earn a $25 bonus added to your
                next payout. There&apos;s no limit on referrals.
              </p>
              <Cta href="/dashboard/doctor/referrals" label="Get my referral link" />
            </Section>

            <Section id="mobile" title="📱 Mobile app" tagline="Practice from your phone">
              <p>
                Our Android app — <em>OduDoc Doctor</em> — handles instant
                consultations, video calls, prescriptions, and the EMR on the go.
                Push notifications mean you don&apos;t miss instant requests when
                away from your laptop. iOS coming soon.
              </p>
              <p className="text-sm text-slate-500">
                Search &quot;OduDoc Doctor&quot; on the Play Store, or ask support
                for an early-access invite while we&apos;re in closed testing.
              </p>
            </Section>

            <Section id="compliance" title="🛡️ Compliance & support" tagline="When you need a human">
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
            </Section>

            <div className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-sky-50 p-6 text-center">
              <h2 className="text-lg font-bold text-slate-900">
                Stuck on something?
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Our support team replies within one business day. Most doctors get
                onboarded in under 30 minutes.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link
                  href="/contact"
                  className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                >
                  Contact support
                </Link>
                <Link
                  href="/dashboard/doctor"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Back to dashboard
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Small presentational helpers — kept inline so the page is one file.
// ---------------------------------------------------------------------

function Section({
  id,
  title,
  tagline,
  children,
}: {
  id: string;
  title: string;
  tagline?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-20 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <header className="mb-4 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
        {tagline && (
          <p className="mt-1 text-sm text-slate-500">{tagline}</p>
        )}
      </header>
      <div className="space-y-3 text-sm leading-7 text-slate-700 sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-2xl bg-slate-50 p-4">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white shadow">
        {n}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <div className="mt-1 text-sm leading-6 text-slate-700">{children}</div>
      </div>
    </div>
  );
}

function Tips({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2 text-sm text-slate-700">
          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-primary-500" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Cta({
  href,
  label,
  variant = "solid",
}: {
  href: string;
  label: string;
  variant?: "solid" | "ghost";
}) {
  const cls =
    variant === "solid"
      ? "inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
      : "inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50";
  return (
    <Link href={href} className={`mt-3 ${cls}`}>
      {label}
      <span aria-hidden>→</span>
    </Link>
  );
}
