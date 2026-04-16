import HeroWithStats from "@/components/hero/HeroWithStats";
import StatsSection from "@/components/StatsSection";
import TestimonialCard from "@/components/TestimonialCard";
import BlogCard from "@/components/BlogCard";
import NewsletterSignup from "@/components/NewsletterSignup";
import DoctorCard from "@/components/DoctorCard";
import Link from "next/link";
import { testimonials, blogPosts, doctors } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home V2 - Stats Hero",
};

const departments = [
  { icon: "🫀", name: "Cardiology", desc: "Heart and cardiovascular care" },
  { icon: "🧠", name: "Neurology", desc: "Brain and nervous system" },
  { icon: "🦴", name: "Orthopedics", desc: "Bones, joints, and muscles" },
  { icon: "👶", name: "Pediatrics", desc: "Children's healthcare" },
  { icon: "🔬", name: "Oncology", desc: "Cancer treatment" },
  { icon: "👁️", name: "Ophthalmology", desc: "Eye care and surgery" },
];

const features = [
  { title: "Expert Physicians", desc: "Board-certified doctors with years of experience in their specialties." },
  { title: "Modern Facilities", desc: "State-of-the-art medical equipment and comfortable patient rooms." },
  { title: "Compassionate Care", desc: "Patient-centered approach with personalized treatment plans." },
  { title: "24/7 Availability", desc: "Round-the-clock emergency services and support for all patients." },
];

export default function HomeV2() {
  return (
    <>
      <HeroWithStats />

      {/* About section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Image placeholder */}
            <div className="relative">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-primary-400 to-teal-400 shadow-xl">
                <div className="flex h-full items-center justify-center text-white/80">
                  <div className="text-center">
                    <svg className="mx-auto h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="mt-2 text-sm font-medium">Our Hospital</p>
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 rounded-xl bg-white px-6 py-4 shadow-lg">
                <p className="text-2xl font-bold text-primary-600">25+</p>
                <p className="text-xs text-gray-500">Years Experience</p>
              </div>
            </div>

            {/* Features list */}
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-primary-600">About OduDoc</span>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">
                Why Patients Choose Us
              </h2>
              <p className="mt-4 text-gray-500 leading-relaxed">
                With over 25 years of experience, we have built a reputation for
                delivering world-class medical care with warmth and precision.
              </p>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {features.map((f) => (
                  <div key={f.title} className="rounded-xl border border-gray-100 p-4 transition-all hover:shadow-md">
                    <h3 className="text-sm font-bold text-gray-900">{f.title}</h3>
                    <p className="mt-1 text-xs text-gray-500">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Departments grid */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="section-title">Our Departments</h2>
            <p className="section-subtitle">Specialized care across all major medical fields</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => (
              <div key={d.name} className="group rounded-xl bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <span className="text-4xl">{d.icon}</span>
                <h3 className="mt-4 text-lg font-bold text-gray-900">{d.name}</h3>
                <p className="mt-2 text-sm text-gray-500">{d.desc}</p>
                <Link href="/departments" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 opacity-0 transition-all group-hover:opacity-100">
                  Learn more
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="section-title">Meet Our Doctors</h2>
            <p className="section-subtitle">Highly skilled professionals dedicated to your health</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {doctors.slice(0, 4).map((doc) => (
              <DoctorCard key={doc.id} doctor={doc} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/doctors" className="btn-outline">View All Doctors</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <StatsSection />

      {/* Testimonials */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="section-title">What Our Patients Say</h2>
            <p className="section-subtitle">Real stories from real patients</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.slice(0, 3).map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter + Blog */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="section-title">Latest Health Insights</h2>
              <p className="section-subtitle">Expert articles from our medical professionals</p>
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {blogPosts.slice(0, 2).map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            </div>
            <div>
              <NewsletterSignup />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
