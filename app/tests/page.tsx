"use client";

import { useState, useMemo } from "react";
import { labTests } from "@/lib/data";

const steps = [
  { icon: "📋", title: "Select a Test", desc: "Choose from a wide range of health packages and individual tests" },
  { icon: "🏠", title: "Home Sample Pickup", desc: "A certified phlebotomist visits your home at a convenient time" },
  { icon: "📊", title: "Get Reports Online", desc: "Receive accurate, detailed reports delivered to your inbox" },
];

const safetyMeasures = [
  { icon: "🧤", title: "Certified Phlebotomists", desc: "Trained and verified professionals" },
  { icon: "🧊", title: "Temperature Controlled", desc: "Samples transported at optimal temperature" },
  { icon: "🏥", title: "NABL Accredited Labs", desc: "Partnered with top-certified laboratories" },
  { icon: "🛡️", title: "Safe & Hygienic", desc: "Strict safety and hygiene protocols" },
];

export default function TestsPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return labTests;
    const q = search.toLowerCase();
    return labTests.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-600 to-indigo-600 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold sm:text-4xl md:text-5xl">
            Lab Tests &amp; Health Packages
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-purple-100">
            Book lab tests with home sample collection. Accurate results from NABL-accredited labs.
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <div className="flex overflow-hidden rounded-xl bg-white shadow-lg">
              <input
                type="text"
                placeholder="Search tests and packages..."
                className="flex-1 px-4 py-3.5 text-sm text-gray-700 outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="bg-purple-600 px-6 text-sm font-semibold text-white hover:bg-purple-700">
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">How It Works</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-3xl">
                  {s.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{s.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Test Packages */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">
            {search ? `Results for "${search}"` : "Popular Test Packages"}
          </h2>
          <p className="section-subtitle text-center">Comprehensive health checkups at affordable prices</p>

          {filtered.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((test) => (
                <div key={test.id} className="card relative flex flex-col">
                  {test.popular && (
                    <span className="absolute -top-2 right-4 rounded-full bg-orange-500 px-3 py-0.5 text-xs font-bold text-white">
                      Popular
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{test.name}</h3>
                  <p className="mt-2 flex-1 text-sm text-gray-500">{test.description}</p>
                  <div className="mt-4 flex items-center gap-4 border-t border-gray-100 pt-4">
                    <span className="text-xs text-gray-400">{test.parameters} parameters</span>
                    <span className="text-xs text-gray-400">{test.turnaround}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-xl font-bold text-gray-900">${test.price}</span>
                      <span className="ml-2 text-sm text-gray-400 line-through">
                        ${test.originalPrice}
                      </span>
                      <span className="ml-2 text-xs font-semibold text-green-600">
                        {Math.round(((test.originalPrice - test.price) / test.originalPrice) * 100)}% off
                      </span>
                    </div>
                    <button className="btn-primary !px-4 !py-2 !text-xs">
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-xl bg-white py-16 text-center shadow">
              <p className="text-4xl">🔬</p>
              <p className="mt-4 text-lg font-semibold text-gray-900">No tests found</p>
              <p className="mt-1 text-sm text-gray-500">Try a different search term</p>
            </div>
          )}
        </div>
      </section>

      {/* Safety */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Your Safety is Our Priority</h2>
          <p className="section-subtitle text-center">Stringent safety measures at every step</p>
          <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
            {safetyMeasures.map((s) => (
              <div key={s.title} className="card text-center">
                <span className="mb-3 block text-4xl">{s.icon}</span>
                <h3 className="font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-1 text-xs text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
