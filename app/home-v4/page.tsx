import HeroWithTextSlider from "@/components/hero/HeroWithTextSlider";
import WorkingProcess from "@/components/WorkingProcess";
import StatsSection from "@/components/StatsSection";
import AwardsSection from "@/components/AwardsSection";
import FAQAccordion from "@/components/FAQAccordion";
import DoctorCard from "@/components/DoctorCard";
import BannerWithCTA from "@/components/banner/BannerWithCTA";
import Link from "next/link";
import { doctors, faqs } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home V4 - Text Slider Hero",
};

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

export default function HomeV4() {
  return (
    <>
      <HeroWithTextSlider />

      {/* Working Process */}
      <WorkingProcess />

      {/* Departments Carousel-style grid */}
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

      {/* Team grid */}
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
        </div>
      </section>

      {/* Stats */}
      <StatsSection />

      {/* Awards */}
      <AwardsSection />

      {/* CTA Banner */}
      <BannerWithCTA
        title="Need Urgent Medical Care?"
        subtitle="Our emergency team is available 24/7. Do not hesitate to reach out."
        buttonText="Contact Emergency"
        buttonHref="/contact"
      />

      {/* FAQ */}
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
                insurance, and more. Can not find what you are looking for? Contact us directly.
              </p>
              <div className="mt-6">
                <Link href="/faq" className="btn-outline">View All FAQs</Link>
              </div>
            </div>
            <FAQAccordion items={faqs.slice(0, 5)} />
          </div>
        </div>
      </section>

      {/* Contact form inline */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div>
              <h2 className="section-title">Get in Touch</h2>
              <p className="section-subtitle">
                Have questions or need to book an appointment? Fill out the form and our team will get back to you shortly.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">+1 (800) 123-4567</p>
                    <p className="text-xs text-gray-500">Available 24/7</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">contact@odudoc.com</p>
                    <p className="text-xs text-gray-500">We reply within 24 hours</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">123 Health Avenue</p>
                    <p className="text-xs text-gray-500">New York, NY 10001</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-md">
              <form className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Department</label>
                  <select className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20">
                    <option>Select Department</option>
                    <option>Cardiology</option>
                    <option>Neurology</option>
                    <option>Orthopedics</option>
                    <option>Pediatrics</option>
                    <option>General Medicine</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
                  <textarea
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    placeholder="How can we help you?"
                  />
                </div>
                <button type="submit" className="btn-primary w-full">
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
