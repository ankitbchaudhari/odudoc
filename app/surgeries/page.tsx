import Link from "next/link";

const surgeryCategories = [
  {
    name: "Laparoscopic Surgery",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    procedures: ["Gallbladder Removal", "Appendectomy", "Hernia Repair", "Bariatric Surgery"],
    startingPrice: "$2,500",
    description: "Minimally invasive procedures with faster recovery and smaller scars.",
  },
  {
    name: "Orthopedic Surgery",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    procedures: ["Knee Replacement", "Hip Replacement", "ACL Reconstruction", "Spine Surgery"],
    startingPrice: "$4,000",
    description: "Joint replacements and bone surgeries by top orthopedic specialists.",
  },
  {
    name: "Eye Surgery",
    icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    procedures: ["LASIK", "Cataract Surgery", "Glaucoma Surgery", "Retinal Surgery"],
    startingPrice: "$1,200",
    description: "Advanced eye procedures with latest laser and microsurgery technology.",
  },
  {
    name: "Cardiac Surgery",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    procedures: ["Bypass Surgery (CABG)", "Valve Replacement", "Angioplasty", "Pacemaker Implant"],
    startingPrice: "$8,000",
    description: "Life-saving heart procedures performed by India's best cardiologists.",
  },
  {
    name: "Cosmetic Surgery",
    icon: "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    procedures: ["Rhinoplasty", "Liposuction", "Hair Transplant", "Facelift"],
    startingPrice: "$1,500",
    description: "Board-certified plastic surgeons with natural-looking results.",
  },
  {
    name: "Urology",
    icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
    procedures: ["Kidney Stone Removal", "Prostate Surgery", "Circumcision", "Vasectomy"],
    startingPrice: "$1,000",
    description: "Advanced urological procedures with quick recovery protocols.",
  },
];

const whyChoose = [
  { title: "Expert Surgeons", desc: "Board-certified specialists with 15+ years experience" },
  { title: "Transparent Pricing", desc: "No hidden costs — all-inclusive surgery packages" },
  { title: "Free Follow-ups", desc: "Post-surgery consultations included for 30 days" },
  { title: "Insurance Support", desc: "We handle insurance paperwork and cashless claims" },
  { title: "EMI Options", desc: "0% EMI available on surgeries above $2,000" },
  { title: "Safe & Accredited", desc: "All partner hospitals are NABH/JCI accredited" },
];

export default function SurgeriesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-20 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h1 className="text-4xl font-bold md:text-5xl">Surgeries</h1>
          <p className="mt-4 text-lg text-primary-100">
            Safe, affordable surgeries with top specialists. Transparent pricing. Zero surprises.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/consult/book" className="rounded-xl bg-white px-8 py-3 text-sm font-semibold text-primary-700 shadow-lg hover:bg-gray-50">
              Book Free Consultation
            </Link>
            <a href="tel:+15550001234" className="rounded-xl border-2 border-white/30 px-8 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Call: +1 (555) 000-1234
            </a>
          </div>
        </div>
      </section>

      {/* Surgery Categories */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">Our Surgery Categories</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {surgeryCategories.map((cat) => (
              <div key={cat.name} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                    <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={cat.icon} />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{cat.name}</h3>
                    <p className="text-xs text-primary-600">Starting {cat.startingPrice}</p>
                  </div>
                </div>
                <p className="mb-4 text-sm text-gray-600">{cat.description}</p>
                <ul className="space-y-1.5">
                  {cat.procedures.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-gray-700">
                      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
                <Link href="/consult/book" className="mt-4 block rounded-lg bg-primary-50 py-2 text-center text-sm font-semibold text-primary-700 hover:bg-primary-100">
                  Get Free Quote
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">Why Choose OduDoc for Surgery?</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {whyChoose.map((item) => (
              <div key={item.title} className="rounded-xl bg-white p-5 shadow-sm">
                <h3 className="mb-1 font-bold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Need a Surgery Consultation?</h2>
          <p className="mb-6 text-gray-600">
            Talk to our medical coordinators for free. We'll help you understand your options, compare costs, and connect you with the best surgeon.
          </p>
          <Link href="/consult/book" className="btn-primary">
            Book Free Consultation
          </Link>
        </div>
      </section>
    </div>
  );
}
