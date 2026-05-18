import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OduDoc for Patients — find doctors, book consults, manage your record",
  description: "Book video and in-clinic consultations, manage your medical record, order medicines, book lab tests — all under one OduDoc account.",
  alternates: { canonical: "/for-patients" },
};

const groups = [
  {
    icon: "🩺",
    title: "Book and consult",
    items: [
      { title: "Find doctors", body: "Search by specialty, city, language, rating, fee. Instant + scheduled bookings." },
      { title: "Video consult", body: "HD video with chat fallback. Recorded transcript shared after the consult." },
      { title: "Same-day appointments", body: "15-min slot ladder · 30-min lead time · no double-booking." },
    ],
  },
  {
    icon: "📋",
    title: "Your medical record",
    items: [
      { title: "Health passport", body: "Single QR code so ER staff can see allergies, meds, blood type in seconds." },
      { title: "Prescriptions", body: "Every Rx ever issued. Reorder with one tap. Download PDF anytime." },
      { title: "Lab + radiology", body: "Reports auto-attached. DICOM viewer for X-ray, CT, MRI, ultrasound." },
      { title: "Health timeline", body: "Every consult, lab, vaccine, surgery — chronologically searchable." },
      { title: "Vitals + wearables", body: "Sync Apple Health / Google Fit / Fitbit. Manual BP, glucose, weight." },
    ],
  },
  {
    icon: "👨‍👩‍👧‍👦",
    title: "Family",
    items: [
      { title: "Add dependents", body: "Kids, parents, spouse — each with their own medical ID and timeline." },
      { title: "3 permission levels", body: "Primary (full), Caregiver (view + book), Observer (view only)." },
      { title: "Age-18 auto-transition", body: "Dependents take ownership of their record at 18." },
    ],
  },
  {
    icon: "💊",
    title: "Pharmacy and labs",
    items: [
      { title: "Reorder Rx", body: "One-tap refill of last active prescription. Delivered or pick-up." },
      { title: "Book lab tests", body: "Home sample collection or walk-in slots. Results in 24–48h." },
      { title: "Anti-counterfeit scan", body: "Scan QR on Rx packaging to confirm authenticity." },
      { title: "Adherence reminders", body: "Daily reminders to take meds. Skipped doses flagged to your doctor." },
    ],
  },
  {
    icon: "💰",
    title: "Wallet + insurance",
    items: [
      { title: "Single wallet", body: "Top up once via UPI / RuPay. Pays consults, pharmacy, labs. 5% top-up bonus." },
      { title: "Insurance + cashless", body: "Add your card; if your TPA is empanelled, claims route automatically." },
      { title: "Pre-auth", body: "Pre-authorisation workflow for planned admissions and surgeries." },
    ],
  },
  {
    icon: "🌍",
    title: "Medical tourism",
    items: [
      { title: "Compare costs", body: "Procedure costs across countries with destination-specific quality data." },
      { title: "Pre-flight consult", body: "Mandatory video consult with the destination surgeon before travel." },
      { title: "Post-return follow-up", body: "Your home doctor gets read access during your stay abroad." },
    ],
  },
  {
    icon: "💉",
    title: "Vaccinations",
    items: [
      { title: "UIP schedule", body: "Auto-computed from your DOB. Lifelong calendar with reminders." },
      { title: "Adult + travel vaccines", body: "Flu, Covid, hepatitis, yellow fever. Pre-travel checklist." },
    ],
  },
  {
    icon: "🔒",
    title: "Privacy you control",
    items: [
      { title: "Who accessed my record", body: "Audit log shows every doctor, hospital, pharmacy that opened your data." },
      { title: "Consent per data type", body: "Grant / revoke for consults, labs, Rx, imaging — per consumer." },
      { title: "Time-limited share token", body: "Share a record with a foreign doctor for X days; revoke any time." },
      { title: "Delete account", body: "30-day grace period. Full data export before deletion." },
    ],
  },
];

export default function ForPatientsPage() {
  return (
    <main>
      <section className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-20 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">For patients</p>
          <h1 className="mt-3 text-4xl font-extrabold text-gray-900 dark:text-slate-100 md:text-5xl">
            Your health, on a single account
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
            Book consultations, manage your record, order medicines, sync wearables. Free for patients — always.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/auth/register" className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-transform hover:-translate-y-0.5">
              Get started →
            </Link>
            <Link href="/doctors" className="rounded-xl border-2 border-emerald-600 px-6 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50">
              Browse doctors
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {groups.map((g) => (
              <div key={g.title}>
                <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-slate-100">
                  <span className="text-3xl">{g.icon}</span> {g.title}
                </h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((it) => (
                    <div key={it.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{it.title}</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{it.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
