"use client";

import { useState } from "react";
import WorkingHours from "@/components/WorkingHours";

const contactInfo = [
  {
    icon: "📍",
    title: "Office Address",
    lines: ["123 Health Avenue, Suite 500", "New York, NY 10001"],
  },
  {
    icon: "📞",
    title: "Phone",
    lines: ["+1 (800) 123-4567", "Mon - Sat: 8 AM - 10 PM"],
  },
  {
    icon: "✉️",
    title: "Email",
    lines: ["support@odudoc.com", "partners@odudoc.com"],
  },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 md:text-4xl">Get in Touch</h1>
          <p className="mt-3 text-gray-500">
            Have a question or need help? We would love to hear from you.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Contact Info */}
          <div className="space-y-6">
            {contactInfo.map((c) => (
              <div key={c.title} className="card">
                <div className="flex items-start gap-4">
                  <span className="text-2xl">{c.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.title}</h3>
                    {c.lines.map((line) => (
                      <p key={line} className="text-sm text-gray-500">{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Working Hours */}
            <WorkingHours />

            {/* Map */}
            <div className="overflow-hidden rounded-2xl shadow-lg">
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
              <div className="bg-white px-4 py-3">
                <p className="text-sm text-gray-500">Visit us at our main office</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="card lg:col-span-2">
            {submitted ? (
              <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
                  &#10003;
                </div>
                <h2 className="text-xl font-bold text-gray-900">Message Sent!</h2>
                <p className="mt-2 text-gray-500">
                  Thank you for reaching out. We will get back to you within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="btn-primary mt-6"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <>
                <h2 className="mb-6 text-xl font-bold text-gray-900">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Full Name
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="John Doe"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Email Address
                      </label>
                      <input
                        required
                        type="email"
                        placeholder="john@example.com"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Subject
                    </label>
                    <select className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-600 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                      <option>General Inquiry</option>
                      <option>Appointment Help</option>
                      <option>Technical Support</option>
                      <option>Billing Question</option>
                      <option>Partnership</option>
                      <option>Feedback</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="How can we help you?"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full sm:w-auto">
                    Send Message
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
