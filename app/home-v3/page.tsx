import HeroWithSchedule from "@/components/hero/HeroWithSchedule";
import CoreValues from "@/components/CoreValues";
import TestimonialCard from "@/components/TestimonialCard";
import PartnerLogos from "@/components/PartnerLogos";
import BannerRounded from "@/components/banner/BannerRounded";
import Link from "next/link";
import { testimonials } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home V3 - Schedule Hero",
};

const whyChooseFeatures = [
  {
    icon: "🏥",
    title: "Advanced Infrastructure",
    desc: "Equipped with cutting-edge medical technology for accurate diagnosis and treatment.",
  },
  {
    icon: "👨‍⚕️",
    title: "Expert Medical Team",
    desc: "200+ specialists with international training and decades of combined experience.",
  },
  {
    icon: "💊",
    title: "Comprehensive Services",
    desc: "From preventive care to complex surgeries, all under one roof.",
  },
  {
    icon: "🕐",
    title: "24/7 Emergency Care",
    desc: "Round-the-clock emergency department with rapid response teams.",
  },
  {
    icon: "💰",
    title: "Affordable Pricing",
    desc: "Transparent pricing and flexible payment plans for all patients.",
  },
  {
    icon: "📱",
    title: "Digital Health",
    desc: "Telemedicine, online booking, and digital health records for convenience.",
  },
];

const pricingPlans = [
  {
    name: "Basic",
    price: "$49",
    period: "/month",
    features: ["General Checkup", "Basic Lab Tests", "Email Support", "Health Reports"],
    popular: false,
  },
  {
    name: "Premium",
    price: "$99",
    period: "/month",
    features: ["All Basic Features", "Specialist Consultations", "Priority Booking", "Video Consultations", "24/7 Support"],
    popular: true,
  },
  {
    name: "Family",
    price: "$149",
    period: "/month",
    features: ["All Premium Features", "Up to 5 Family Members", "Home Visit (2x/month)", "Dental & Vision", "Annual Health Camp"],
    popular: false,
  },
];

const galleryImages = [
  { color: "from-cyan-400 to-blue-500", label: "Reception" },
  { color: "from-teal-400 to-emerald-500", label: "Surgery Room" },
  { color: "from-violet-400 to-purple-500", label: "Patient Room" },
  { color: "from-amber-400 to-orange-500", label: "Lab" },
  { color: "from-rose-400 to-pink-500", label: "Pharmacy" },
  { color: "from-sky-400 to-indigo-500", label: "Lobby" },
];

export default function HomeV3() {
  return (
    <>
      <HeroWithSchedule />

      {/* Why Choose Us */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-primary-600">Why Choose Us</span>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">
                We Provide the Best Healthcare Experience
              </h2>
              <p className="mt-4 text-gray-500 leading-relaxed">
                Our commitment to excellence has made us a trusted name in healthcare.
                Here is what sets us apart from the rest.
              </p>
              <div className="mt-8">
                <Link href="/about" className="btn-primary">Discover More</Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {whyChooseFeatures.slice(0, 4).map((f) => (
                <div key={f.title} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                  <span className="text-2xl">{f.icon}</span>
                  <h3 className="mt-3 text-sm font-bold text-gray-900">{f.title}</h3>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <CoreValues />

      {/* Pricing */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="section-title">Healthcare Plans</h2>
            <p className="section-subtitle">Choose a plan that fits your healthcare needs</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl bg-white p-8 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl ${
                  plan.popular ? "ring-2 ring-primary-500" : ""
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-xs font-bold text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="h-4 w-4 flex-shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className={`mt-8 block rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                    plan.popular
                      ? "bg-primary-600 text-white hover:bg-primary-700"
                      : "border-2 border-gray-200 text-gray-700 hover:border-primary-600 hover:text-primary-600"
                  }`}
                >
                  Choose Plan
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="section-title">Patient Testimonials</h2>
            <p className="section-subtitle">Hear what our patients have to say</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.slice(0, 6).map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        </div>
      </section>

      {/* Photo Gallery */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="section-title">Our Facilities</h2>
            <p className="section-subtitle">Take a virtual tour of our world-class facilities</p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
            {galleryImages.map((img) => (
              <div
                key={img.label}
                className={`group relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br ${img.color} shadow-md transition-all hover:shadow-xl`}
              >
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="text-sm font-bold text-white">{img.label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/gallery" className="btn-outline">View Full Gallery</Link>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <BannerRounded
        title="Ready to Experience Better Healthcare?"
        subtitle="Book your appointment today and let our experts take care of your health."
      />

      {/* Partner Logos */}
      <PartnerLogos />
    </>
  );
}
