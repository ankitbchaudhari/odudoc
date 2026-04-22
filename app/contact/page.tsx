"use client";

import { useState } from "react";
import WorkingHours from "@/components/WorkingHours";

const contactInfo = [
  {
    icon: "📍",
    title: "Head Office",
    gradient: "from-sky-500 to-indigo-600",
    lines: [
      "OduDoc Inc.",
      "8 The Green, Suite A",
      "Dover, Delaware 19901",
      "United States",
    ],
  },
  {
    icon: "📞",
    title: "Call Us",
    gradient: "from-emerald-500 to-teal-600",
    lines: [
      "Toll-Free: +1 (302) 899-2625",
      "Mon – Sat · 8:00 AM – 10:00 PM (EST)",
      "Sunday · Closed",
    ],
  },
  {
    icon: "✉️",
    title: "Email Us",
    gradient: "from-rose-500 to-pink-600",
    lines: [
      "support@odudoc.com",
      "Replies within 24 hours",
    ],
  },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-teal-50 to-rose-50 py-24">
        <div className="pointer-events-none absolute -top-32 -left-24 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary-200/40 to-teal-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-24 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-rose-200/40 to-amber-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-100 to-teal-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-700">
            <span>💬</span> We're Listening
          </span>
          <h1 className="mt-6 text-4xl font-bold text-gray-900 md:text-6xl">
            Get in{" "}
            <span className="bg-gradient-to-r from-primary-600 via-teal-500 to-rose-500 bg-clip-text text-transparent">
              Touch
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-600">
            Have a question or need help? We would love to hear from you — our team replies within 24 hours.
          </p>
        </div>
      </section>

      {/* Contact grid */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-primary-50/40 py-20">
        <div className="pointer-events-none absolute -top-24 right-0 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-teal-200/30 to-primary-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Contact Info */}
            <div className="space-y-6">
              {contactInfo.map((c) => (
                <div
                  key={c.title}
                  className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${c.gradient} text-xl text-white shadow-lg ring-4 ring-white`}
                    >
                      {c.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{c.title}</h3>
                      {c.lines.map((line) => (
                        <p key={line} className="text-sm text-gray-500">{line}</p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Working Hours */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg ring-4 ring-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900">Working Hours</h3>
                </div>
                <WorkingHours />
              </div>

              {/* Map */}
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-xl">
                <div className="relative">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.2412648750455!2d-73.98784368459395!3d40.74844797932681!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259a9b3117469%3A0xd134e199a405a163!2sEmpire%20State%20Building!5e0!3m2!1sen!2sus!4v1629910380000!5m2!1sen!2sus"
                    width="100%"
                    height="400"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="OduDoc Office Location"
                  />
                </div>
                <div className="bg-gradient-to-r from-primary-50 to-teal-50 px-4 py-3">
                  <p className="text-sm font-medium text-primary-700">📍 Visit us at our main office</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:shadow-xl lg:col-span-2">
              {submitted ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-3xl text-white shadow-lg ring-4 ring-white">
                    &#10003;
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Message Sent!</h2>
                  <p className="mt-2 text-gray-500">
                    Thank you for reaching out. We will get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition-all hover:scale-105"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-100 to-rose-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-700">
                    <span>✨</span> Send a Message
                  </span>
                  <h2 className="mt-4 mb-6 text-2xl font-bold text-gray-900">
                    Tell us how we can{" "}
                    <span className="bg-gradient-to-r from-primary-600 via-teal-500 to-rose-500 bg-clip-text text-transparent">
                      help
                    </span>
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                          Full Name
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="John Doe"
                          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                          Email Address
                        </label>
                        <input
                          required
                          type="email"
                          placeholder="john@example.com"
                          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        Subject
                      </label>
                      <select className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10">
                        <option>General Inquiry</option>
                        <option>Appointment Help</option>
                        <option>Technical Support</option>
                        <option>Billing Question</option>
                        <option>Partnership</option>
                        <option>Feedback</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        Message
                      </label>
                      <textarea
                        required
                        rows={5}
                        placeholder="How can we help you?"
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition-all hover:scale-105 sm:w-auto"
                    >
                      Send Message →
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
