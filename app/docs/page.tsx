import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Developer documentation for the OduDoc platform — APIs, webhooks, FHIR, and integration guides.",
  alternates: { canonical: "/docs" },
};

const sections = [
  {
    icon: "🩺",
    title: "Patient APIs",
    body: "Book consultations, fetch prescriptions, sync wearables, manage family profiles.",
    items: ["Auth + sessions", "Bookings", "Consultations", "Prescriptions", "Wearables / Apple Health / Google Fit"],
  },
  {
    icon: "👨‍⚕️",
    title: "Doctor APIs",
    body: "EMR access, prescription publishing, e-signature, voice transcription.",
    items: ["EMR records", "Rx publishing", "Voice + ambient scribe", "Earnings + payouts"],
  },
  {
    icon: "🏥",
    title: "Org / Hospital APIs",
    body: "Admit, transfer, discharge, billing, lab orders, pharmacy dispense.",
    items: ["IPD admissions", "Lab orders + results", "Pharmacy dispense", "Invoices + claims", "Roster + payroll"],
  },
  {
    icon: "🔌",
    title: "Integrations",
    body: "ABDM / ABHA, FHIR R4, HL7, WhatsApp Business, Cashfree, Stripe.",
    items: ["FHIR R4 export", "ABDM care-context", "WhatsApp templates", "Cashfree webhooks", "Stripe webhooks"],
  },
];

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Developer docs</p>
      <h1 className="mt-2 text-4xl font-extrabold text-gray-900 dark:text-slate-100">
        Build on the OduDoc platform
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
        REST + GraphQL APIs, FHIR R4 export, webhooks for every clinical event. Sandbox keys available on request.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/contact?subject=developer-sandbox"
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md"
        >
          Request sandbox keys →
        </Link>
        <a
          href="https://github.com/odudoc"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        >
          GitHub →
        </a>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {sections.map((s) => (
          <div key={s.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-3xl">{s.icon}</div>
            <h2 className="mt-2 text-lg font-bold text-gray-900 dark:text-slate-100">{s.title}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{s.body}</p>
            <ul className="mt-3 space-y-1 text-sm text-gray-700 dark:text-slate-300">
              {s.items.map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-12 rounded-2xl bg-gray-50 p-6 text-sm text-gray-600 dark:bg-slate-900 dark:text-slate-300">
        Full reference is being migrated to a dedicated docs site. In the meantime, contact{" "}
        <a className="text-emerald-600 hover:underline" href="mailto:developers@odudoc.com">developers@odudoc.com</a>{" "}
        with your integration brief.
      </p>
    </main>
  );
}
