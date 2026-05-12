import type { Metadata } from "next";

// Legal & merchant compliance page.
//
// Surfaces the registered Indian entity — required by every Indian
// payment gateway (Razorpay, IndusPays, PayU, Cashfree, etc.) during
// KYC. The reviewers want to land on a public URL that lists CIN, GST,
// PAN, TAN, and the registered office, so this page exists as a
// stable destination for that.

export const metadata: Metadata = {
  title: "Legal & Compliance | OduDoc",
  description:
    "Registered entity, statutory identifiers, and contact details for OduDoc's payment processing operations.",
  alternates: { canonical: "/legal" },
  robots: { index: true, follow: true },
};

const COMPANY = {
  name: "SARJUDAS DIGITAL TRADING AND ESCROW SERVICES PRIVATE LIMITED",
  cin: "U52520GJ2019PTC109503",
  pan: "ABCCS4962M",
  tan: "SRTS23036G",
  gst: "24ABCCS4962M1ZY",
  address:
    "A-1002, 10th Floor, Aakash Pruthhvi, Moje Village Vadod, Majura, Pandesara, Surat, Surat City, Gujarat, India, 394221",
  email: "support@odudoc.com",
  phone: "+1 (302) 899-2625",
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-1 gap-1 border-b border-gray-100 px-6 py-4 last:border-b-0 sm:grid-cols-3 sm:gap-6">
    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">{label}</dt>
    <dd className="break-words text-sm text-gray-900 dark:text-slate-100 sm:col-span-2">{value}</dd>
  </div>
);

export default function LegalPage() {
  return (
    <main className="bg-gray-50 dark:bg-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
            Compliance
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 dark:text-slate-100 sm:text-5xl">
            Legal &amp; Merchant Details
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
            Statutory identifiers and registered office for the entity that
            processes payments on the OduDoc platform. Provided here as a
            stable, public reference for payment gateways, banks, and
            regulators.
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-gray-200 dark:ring-slate-800">
          <div className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Registered entity
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Indian private limited company under the Companies Act, 2013.
            </p>
          </div>
          <dl>
            <Row label="Company name" value={COMPANY.name} />
            <Row label="CIN" value={COMPANY.cin} />
            <Row label="PAN" value={COMPANY.pan} />
            <Row label="TAN" value={COMPANY.tan} />
            <Row label="GSTIN" value={COMPANY.gst} />
            <Row label="Registered office" value={COMPANY.address} />
            <Row label="Email" value={COMPANY.email} />
            <Row label="Phone" value={COMPANY.phone} />
          </dl>
        </section>

        <section className="mt-10 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm ring-1 ring-gray-200 dark:ring-slate-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Payment processing
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
            All consultation fees, prescription orders, lab bookings, and
            subscription charges on www.odudoc.com are processed by{" "}
            <span className="font-medium text-gray-900 dark:text-slate-100">{COMPANY.name}</span>{" "}
            (CIN {COMPANY.cin}, GSTIN {COMPANY.gst}). Charges may appear on
            your card or bank statement under the merchant descriptor
            &quot;ODUDOC&quot; or &quot;SARJUDAS DIGITAL&quot;.
          </p>
          <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
            For refund requests, payment disputes, or tax invoices, email{" "}
            <a
              href={`mailto:${COMPANY.email}`}
              className="font-medium text-primary-600 hover:underline"
            >
              {COMPANY.email}
            </a>
            . Refunds are processed to the original payment method within 5–7
            working days of approval.
          </p>
        </section>

        <section className="mt-10 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm ring-1 ring-gray-200 dark:ring-slate-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Related policies
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a
                href="/terms"
                className="font-medium text-primary-600 hover:underline"
              >
                Terms of Service
              </a>
            </li>
            <li>
              <a
                href="/privacy"
                className="font-medium text-primary-600 hover:underline"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="/contact"
                className="font-medium text-primary-600 hover:underline"
              >
                Contact &amp; support
              </a>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
