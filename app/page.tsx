import HeroSearch from "@/components/HeroSearch";
import ServiceCard from "@/components/ServiceCard";
import HealthConcernCard from "@/components/HealthConcernCard";
import SpecialtyCard from "@/components/SpecialtyCard";
import TestimonialCard from "@/components/TestimonialCard";
import StatsSection from "@/components/StatsSection";
import Link from "next/link";
import { healthConcerns, specialties, testimonials } from "@/lib/data";

const services = [
  { icon: "📹", title: "Video Consultation", description: "Consult top doctors from home", href: "/consult", color: "bg-blue-50" },
  { icon: "🔍", title: "Find Doctors", description: "Book in-clinic appointments", href: "/doctors", color: "bg-green-50" },
  { icon: "🧪", title: "Lab Tests", description: "Sample pickup from home", href: "/tests", color: "bg-purple-50" },
  { icon: "🏥", title: "Surgeries", description: "Safe & trusted surgery centers", href: "#", color: "bg-orange-50" },
];

const articles = [
  { title: "10 Tips for a Healthy Heart", category: "Cardiology", readTime: "5 min read", color: "bg-red-50" },
  { title: "Understanding Diabetes: A Complete Guide", category: "Endocrinology", readTime: "8 min read", color: "bg-blue-50" },
  { title: "Mental Health: Breaking the Stigma", category: "Psychology", readTime: "6 min read", color: "bg-purple-50" },
  { title: "Nutrition Basics for Busy People", category: "Wellness", readTime: "4 min read", color: "bg-green-50" },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-teal-50 pb-20 pt-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Your Health, <span className="text-primary-600">Our Priority</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
            Find and book appointments with top doctors, consult online, book lab tests, and more.
          </p>
          <div className="mt-8">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="-mt-10 pb-16">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 sm:px-6 md:grid-cols-4 md:gap-6 lg:px-8">
          {services.map((s) => (
            <ServiceCard key={s.title} {...s} />
          ))}
        </div>
      </section>

      {/* Health Concerns */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Consult Top Doctors Online</h2>
          <p className="section-subtitle text-center">for any health concern</p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {healthConcerns.map((c) => (
              <HealthConcernCard key={c.id} concern={c} />
            ))}
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Book Appointment with Specialists</h2>
          <p className="section-subtitle text-center">Choose from a wide range of specialties</p>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {specialties.slice(0, 6).map((s) => (
              <SpecialtyCard key={s.id} specialty={s} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/doctors" className="btn-outline">
              View All Specialties
            </Link>
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Health Articles & Tips</h2>
          <p className="section-subtitle text-center">Stay informed about your health</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {articles.map((a) => (
              <div key={a.title} className="card group cursor-pointer">
                <div className={`mb-4 h-36 rounded-lg ${a.color}`} />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">
                  {a.category}
                </span>
                <h3 className="mt-1 font-semibold text-gray-900 group-hover:text-primary-600">
                  {a.title}
                </h3>
                <p className="mt-2 text-xs text-gray-400">{a.readTime}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">What Our Users Say</h2>
          <p className="section-subtitle text-center">Trusted by millions of patients</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.slice(0, 3).map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <StatsSection />

      {/* App Download CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-teal-500 p-8 text-center text-white md:p-16">
            <h2 className="text-3xl font-bold md:text-4xl">
              Download the OduDoc App
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-100">
              Get instant access to top doctors, book appointments, order lab tests, and manage your health -- all from your phone.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-lg transition-transform hover:scale-105">
                <span className="text-2xl">&#63743;</span> App Store
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-lg transition-transform hover:scale-105">
                <span className="text-2xl">&#9654;</span> Google Play
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
