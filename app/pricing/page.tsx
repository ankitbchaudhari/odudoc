"use client";

import Link from "next/link";
import { useState } from "react";
import { pricingPlans, pricingFAQs } from "@/lib/data";

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-teal-50 py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-gray-900 md:text-5xl">
            Choose Your <span className="text-primary-600">Healthcare Plan</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
            Affordable healthcare plans designed to keep you and your family healthy.
            Choose the plan that fits your needs.
          </p>

          {/* Toggle */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${!annual ? "text-gray-900" : "text-gray-500"}`}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative h-7 w-12 rounded-full transition-colors ${annual ? "bg-primary-600" : "bg-gray-300"}`}
              aria-label="Toggle annual pricing"
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${annual ? "translate-x-5" : ""}`}
              />
            </button>
            <span className={`text-sm font-medium ${annual ? "text-gray-900" : "text-gray-500"}`}>
              Annual
            </span>
            {annual && (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                Save up to 16%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 items-start">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 bg-white p-8 shadow-md transition-all duration-300 hover:shadow-xl ${
                  plan.popular
                    ? "border-primary-600 scale-[1.02] md:scale-105 shadow-lg"
                    : "border-gray-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                </div>

                <div className="mt-6 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">
                      ${annual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-sm text-gray-500">
                      /{annual ? "year" : "month"}
                    </span>
                  </div>
                  {annual && (
                    <p className="mt-1 text-xs text-green-600 font-medium">
                      ${Math.round((plan.monthlyPrice * 12 - plan.annualPrice))} saved annually
                    </p>
                  )}
                </div>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-3">
                      {feature.included ? (
                        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={`text-sm ${feature.included ? "text-gray-700" : "text-gray-400"}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Link
                    href="/auth/register"
                    className={`block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-all ${
                      plan.popular
                        ? "bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg"
                        : "border-2 border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table (Desktop) */}
      <section className="hidden md:block bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Feature Comparison</h2>
          <p className="section-subtitle text-center">Compare plans side-by-side to find the best fit</p>

          <div className="mt-10 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-2/5">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Basic</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-primary-600 bg-primary-50">Premium</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { feature: "Doctor Consultations", basic: "2/month", premium: "Unlimited", enterprise: "Unlimited" },
                  { feature: "Lab Test Discount", basic: "10%", premium: "25%", enterprise: "25%" },
                  { feature: "Digital Health Records", basic: true, premium: true, enterprise: true },
                  { feature: "Video Consultations", basic: false, premium: true, enterprise: true },
                  { feature: "Priority Support 24/7", basic: false, premium: true, enterprise: true },
                  { feature: "Family Coverage", basic: false, premium: "Up to 3", enterprise: "Unlimited" },
                  { feature: "Digital Prescriptions", basic: false, premium: true, enterprise: true },
                  { feature: "Surgery Consultations", basic: false, premium: false, enterprise: true },
                  { feature: "Dedicated Health Manager", basic: false, premium: false, enterprise: true },
                  { feature: "Corporate Wellness", basic: false, premium: false, enterprise: true },
                  { feature: "Custom Health Reports", basic: false, premium: false, enterprise: true },
                  { feature: "Home Visit Doctors", basic: false, premium: false, enterprise: true },
                ].map((row) => (
                  <tr key={row.feature}>
                    <td className="px-6 py-3.5 text-sm text-gray-700 font-medium">{row.feature}</td>
                    {[row.basic, row.premium, row.enterprise].map((val, i) => (
                      <td key={i} className={`px-6 py-3.5 text-center ${i === 1 ? "bg-primary-50/30" : ""}`}>
                        {val === true ? (
                          <svg className="mx-auto h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : val === false ? (
                          <svg className="mx-auto h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <span className="text-sm text-gray-700">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Frequently Asked Questions</h2>
          <p className="section-subtitle text-center">Everything you need to know about our pricing</p>

          <div className="mt-10 space-y-3">
            {pricingFAQs.map((faq) => (
              <div
                key={faq.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-gray-900">{faq.question}</span>
                  <svg
                    className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${
                      openFaq === faq.id ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === faq.id && (
                  <div className="border-t border-gray-100 px-6 py-4">
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Custom Plan CTA */}
      <section className="bg-primary-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Need a Custom Plan?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-100">
            We offer tailored healthcare solutions for large organizations, hospitals,
            and corporate wellness programs. Let us create a plan that fits your needs.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-600 shadow-sm transition-all hover:bg-gray-50"
            >
              Contact Sales
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              Learn More About Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
