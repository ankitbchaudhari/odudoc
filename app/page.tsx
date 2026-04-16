import HeroWithTextSlider from "@/components/hero/HeroWithTextSlider";
import WorkingProcess from "@/components/WorkingProcess";
import StatsSection from "@/components/StatsSection";
import AwardsSection from "@/components/AwardsSection";
import FAQAccordion from "@/components/FAQAccordion";
import DoctorCard from "@/components/DoctorCard";
import BannerWithCTA from "@/components/banner/BannerWithCTA";
import Link from "next/link";
import { doctors, faqs } from "@/lib/data";

const departments = [
  { icon: "🫀", name: "Cardiology", patients: "12K+", color: "bg-red-50 text-red-600" },
  { icon: "🧠", name: "Neurology", patients: "8K+", color: "bg-purple-50 text-purple-600" },
  { icon: "🦴", name: "Orthopedics", patients: "15K+", color: "bg-amber-50 text-amber-600" },
  { icon: "👶", name: "Pediatrics", patients: "20K+", color: "bg-blue-50 text-blue-600" },
  { icon: "🔬", name: "Oncology", patients: "5K+", color: "bg-rose-50 text-rose-600" },
  { icon: "👁️", name: "Ophthalmology", patients: "10K+", color: "bg-teal-50 text-teal-600" },
  { icon: "🦷", name: "Dental Care", patients: "18K+", color: "bg-cyan-50 text-cyan-600" },
  { icon: "🧬", name: "Genetics", patients: "3K+", color: "bg-indigo-50 text-indigo-600" },
];

export default function Home() {
  return (
    <>
      <HeroWithTextSlider />

      <WorkingProcess />

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="section-title">Our Departments</h2>
            <p className="section-subtitle">Comprehensive medical services across all specialties</p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {departments.map((d) => (
              <Link
                key={d.name}
                href="/departments"
                className="group rounded-xl border border-gray-100 bg-white p-5 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${d.color}`}>
                  <span className="text-2xl">{d.icon}</span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-gray-900">{d.name}</h3>
                <p className="mt-1 text-xs text-gray-400">{d.patients} patients</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="section-title">Our Expert Doctors</h2>
            <p className="section-subtitle">Meet the professionals behind your care</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {doctors.slice(0, 8).map((doc) => (
              <DoctorCard key={doc.id} doctor={doc} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/doctors" className="btn-outline">View All Doctors</Link>
          </div>
        </div>
      </section>

      <StatsSection />

      <AwardsSection />

      <BannerWithCTA
        title="Need Urgent Medical Care?"
        subtitle="Our emergency team is available 24/7. Do not hesitate to reach out."
        buttonText="Book Consultation"
        buttonHref="/consult"
      />

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-primary-600">FAQ</span>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-gray-500 leading-relaxed">
                Find answers to common questions about our services, appointments,
                insurance, and more.
              </p>
              <div className="mt-6">
                <Link href="/faq" className="btn-outline">View All FAQs</Link>
              </div>
            </div>
            <FAQAccordion items={faqs.slice(0, 5)} />
          </div>
        </div>
      </section>
    </>
  );
}
