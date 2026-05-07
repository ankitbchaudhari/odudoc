// Shared content for the doctor onboarding guide.
//
// Used by /dashboard/doctor/guide (signed-in, "Open feature" CTAs) and
// /for-doctors/guide (public preview, "Sign up to try" CTAs). Keeping
// the body here means a copy edit lands on both surfaces in one PR.
//
// Each section optionally has a `videoId` (YouTube). When set, the
// guide pages render an inline player above the prose. When unset
// (the default for now), they render a placeholder. Fill these in as
// the videos get produced — see docs/doctor-guide-video-scripts.md
// for the recording brief per section.

import type { ReactNode } from "react";

export type GuideAudience = "doctor" | "public";

export interface GuideSection {
  id: string;
  label: string;
  icon: string;
  /** Heading for the section body — same on both audiences. */
  title: string;
  /** One-line tagline shown under the heading. */
  tagline?: string;
  /** YouTube video ID (the bit after `?v=`). Leave empty until recorded. */
  videoId?: string;
  /** Body renderer. Receives the audience so the prose can adapt
   *  CTAs ("Open feature" vs "Sign up"). */
  body: (audience: GuideAudience) => ReactNode;
}

// CTA href helpers — public visitors hit /for-doctors signup, signed-in
// doctors get sent to the actual feature.
function ctaHref(audience: GuideAudience, dashboardHref: string): string {
  return audience === "doctor" ? dashboardHref : "/for-doctors";
}
function ctaLabel(audience: GuideAudience, doctorLabel: string): string {
  return audience === "doctor" ? doctorLabel : "Sign up to try";
}

// Re-exported so the page templates can render their own JSX without
// pulling in a dozen helper imports.
export const guideHelpers = { ctaHref, ctaLabel };

// Sections in onboarding order. Keep this list in sync with both
// guide pages — each entry's id becomes both the sidebar link and
// the in-page anchor.
export const GUIDE_SECTIONS: ReadonlyArray<Omit<GuideSection, "body">> = [
  { id: "getting-started", label: "Getting started", icon: "🎯", title: "🎯 Getting started", tagline: "What happens in your first hour" },
  { id: "profile", label: "Your public profile", icon: "👤", title: "👤 Your public profile", tagline: "What patients see before booking" },
  { id: "availability", label: "Availability & instant mode", icon: "🟢", title: "🟢 Availability & instant mode", tagline: "Two ways patients reach you" },
  { id: "consultations", label: "Consultations & video calls", icon: "📞", title: "📞 Consultations & video calls", tagline: "From booking to follow-up" },
  { id: "prescriptions", label: "Prescriptions", icon: "💊", title: "💊 Prescriptions", tagline: "Three ways to write a script" },
  { id: "ai-prescription", label: "AI prescription assistant", icon: "🤖", title: "🤖 AI prescription assistant", tagline: "Faster Rx, never autopilot" },
  { id: "voice", label: "Voice dictation", icon: "🎙️", title: "🎙️ Voice dictation", tagline: "Speak it, sign it" },
  { id: "emr", label: "Clinic EMR", icon: "📋", title: "📋 Clinic EMR", tagline: "Free electronic medical records" },
  { id: "earnings", label: "Earnings & payouts", icon: "💰", title: "💰 Earnings & payouts", tagline: "What you keep, when you get it" },
  { id: "ray", label: "OduDoc Ray (AI co-pilot)", icon: "✨", title: "✨ OduDoc Ray (AI co-pilot)", tagline: "Your second brain during consults" },
  { id: "reviews", label: "Reviews & reputation", icon: "⭐", title: "⭐ Reviews & reputation", tagline: "How patients rate you" },
  { id: "referrals", label: "Refer a colleague", icon: "🤝", title: "🤝 Refer a colleague", tagline: "Both of you earn" },
  { id: "mobile", label: "Mobile app", icon: "📱", title: "📱 Mobile app", tagline: "Practice from your phone" },
  { id: "compliance", label: "Compliance & support", icon: "🛡️", title: "🛡️ Compliance & support", tagline: "When you need a human" },
];

// YouTube IDs are stored separately so the marketing/ops team can
// update them without touching feature code. Empty string = no video
// available yet, the page will show a placeholder.
export const GUIDE_VIDEO_IDS: Record<string, string> = {
  "getting-started": "",
  "profile": "",
  "availability": "",
  "consultations": "",
  "prescriptions": "",
  "ai-prescription": "",
  "voice": "",
  "emr": "",
  "earnings": "",
  "ray": "",
  "reviews": "",
  "referrals": "",
  "mobile": "",
  "compliance": "",
};
