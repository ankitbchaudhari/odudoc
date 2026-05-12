import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OduDoc Drive — Secure cloud storage for medical records",
  description:
    "Encrypted storage for patient records, reports, prescriptions, and imaging. Organize, share, and audit medical files with HIPAA-grade controls.",
  alternates: { canonical: "/drive" },
  openGraph: {
    title: "OduDoc Drive — Secure cloud storage for medical records",
    description:
      "Patient record vault, lab integrations, encrypted sharing, mobile access, and full audit trail for clinics and independent practitioners.",
    url: "/drive",
    type: "website",
  },
};

const features = [
  { title: "Secure Cloud Storage", desc: "HIPAA-compliant storage for patient records, reports, prescriptions, and medical images. 256-bit AES encryption.", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" },
  { title: "Patient Record Vault", desc: "Organize records by patient. Auto-tag by date, type, and doctor. Full-text search across all documents.", icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" },
  { title: "Secure Sharing", desc: "Share records with patients or referring doctors via encrypted links. Set expiry times and access controls.", icon: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" },
  { title: "Lab Report Integration", desc: "Auto-import lab results from 500+ partner labs. Reports appear in patient records instantly.", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
  { title: "Mobile Access", desc: "Access any file from your phone. Take photos of documents and they're auto-OCR'd and filed.", icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { title: "Audit Trail", desc: "Complete access log for compliance. Know who viewed what, when, and from where.", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
];

const storagePlans = [
  { name: "Free", storage: "5 GB", price: "$0", features: ["Basic file storage", "Patient record vault", "30-day file history"] },
  { name: "Pro", storage: "100 GB", price: "$9.99/mo", features: ["Everything in Free", "Secure sharing links", "Lab integration", "1-year file history", "Priority support"] },
  { name: "Clinic", storage: "1 TB", price: "$29.99/mo", features: ["Everything in Pro", "Multi-user access", "Audit trail", "API access", "Unlimited file history", "Custom branding"] },
];

export default function DrivePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-800 to-blue-900 py-20 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            Secure Medical Storage
          </div>
          <h1 className="text-4xl font-bold md:text-5xl">OduDoc Drive</h1>
          <p className="mt-4 text-lg text-blue-200">
            HIPAA-compliant cloud storage for medical records. Store, organize, and share patient files securely.
          </p>
          <Link href="/for-doctors/register" className="mt-8 inline-block rounded-xl bg-white dark:bg-slate-900 px-8 py-3 text-sm font-semibold text-blue-700 shadow-lg hover:bg-gray-50 dark:bg-slate-900">
            Get 5 GB Free
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 dark:text-slate-100">Built for Healthcare</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-gray-100 p-6 transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
                  </svg>
                </div>
                <h3 className="mb-2 font-bold text-gray-900 dark:text-slate-100">{f.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-300">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 dark:bg-slate-900 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 dark:text-slate-100">Storage Plans</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {storagePlans.map((p, i) => (
              <div key={p.name} className={`rounded-2xl border-2 p-6 ${i === 1 ? "border-blue-500 bg-white dark:bg-slate-900 shadow-lg" : "border-gray-100 bg-white dark:bg-slate-900"}`}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{p.name}</h3>
                <p className="mt-1 text-sm text-blue-600 font-semibold">{p.storage}</p>
                <p className="mt-2 mb-6 text-2xl font-bold text-gray-900 dark:text-slate-100">{p.price}</p>
                <ul className="mb-6 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/for-doctors/register" className={`block rounded-lg py-2.5 text-center text-sm font-semibold ${i === 1 ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-900"}`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
