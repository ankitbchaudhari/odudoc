// /support
//
// Required by both Apple App Store Connect ("Support URL", mandatory)
// and Google Play Console ("Contact details → website", mandatory).
// Without a live page here, both submissions get rejected.
//
// Kept intentionally simple — Apple and Play reviewers want a public
// page that lists how to reach a human. No login wall, no JS gates.

import Link from "next/link";

export const metadata = {
  title: "Support — OduDoc",
  description:
    "Get help with the OduDoc Patient and Doctor apps, billing, account issues, and clinical questions.",
};

const channels = [
  {
    label: "Patient app help",
    email: "support@odudoc.com",
    desc: "Login trouble, booking issues, payments, prescriptions, family-account questions.",
    hours: "Mon–Sat, 8 AM – 10 PM IST. Replies within 24 hours.",
  },
  {
    label: "Doctor app help",
    email: "doctors@odudoc.com",
    desc: "Onboarding, KYC, queue / consult issues, payouts, schedule changes.",
    hours: "Mon–Fri, 9 AM – 8 PM IST. Replies within one business day.",
  },
  {
    label: "Clinical emergency",
    email: undefined,
    desc: "OduDoc is NOT for medical emergencies. If you or someone near you is in danger, call 108 (India) or your local emergency number immediately.",
    hours: "24/7 — call your local emergency service, not us.",
  },
  {
    label: "Privacy & data requests",
    email: "privacy@odudoc.com",
    desc: "GDPR / DPDP / CCPA access, correction, deletion. Account-deletion link below.",
    hours: "30-day statutory response window.",
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-4xl font-bold">Support</h1>
          <p className="mt-3 text-primary-100">
            We&apos;re a small team, and we read every message. Tell us what&apos;s
            broken or what you need.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="space-y-4">
          {channels.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-bold text-gray-900">{c.label}</h2>
              <p className="mt-1 text-sm text-gray-600">{c.desc}</p>
              {c.email && (
                <p className="mt-3">
                  <a
                    href={`mailto:${c.email}`}
                    className="font-semibold text-primary-600 hover:underline"
                  >
                    {c.email}
                  </a>
                </p>
              )}
              <p className="mt-2 text-xs uppercase tracking-wide text-gray-400">
                {c.hours}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-bold text-gray-900">Quick links</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link className="text-primary-600 hover:underline" href="/account/delete">
                Delete my account
              </Link>{" "}
              <span className="text-gray-500">— removes your OduDoc login.</span>
            </li>
            <li>
              <Link className="text-primary-600 hover:underline" href="/privacy">
                Privacy policy
              </Link>{" "}
              <span className="text-gray-500">— data we collect and how to control it.</span>
            </li>
            <li>
              <Link className="text-primary-600 hover:underline" href="/terms">
                Terms &amp; Conditions
              </Link>
            </li>
            <li>
              <Link className="text-primary-600 hover:underline" href="/contact">
                General contact form
              </Link>
            </li>
          </ul>
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          <h3 className="mb-2 font-bold text-gray-900">Publisher</h3>
          <p>
            OduDoc is a brand operated by{" "}
            <strong>Sarjudas Digital Trading and Escrow Services LLC</strong>,
            8 The Green, Ste A, Dover, DE 19901, United States.
          </p>
        </div>
      </div>
    </div>
  );
}
