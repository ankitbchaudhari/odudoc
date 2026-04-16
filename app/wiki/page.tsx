"use client";

import { useState } from "react";
import Link from "next/link";

const categories = [
  {
    name: "Common Conditions",
    color: "bg-blue-50 text-blue-700",
    articles: [
      { title: "Diabetes Mellitus", summary: "Types, symptoms, diagnosis, and management of diabetes including insulin therapy and lifestyle modifications.", readTime: "8 min" },
      { title: "Hypertension", summary: "Understanding high blood pressure — causes, risk factors, treatment options, and when to see a doctor.", readTime: "6 min" },
      { title: "Asthma", summary: "A chronic respiratory condition involving airway inflammation. Triggers, symptoms, inhalers, and action plans.", readTime: "7 min" },
      { title: "Migraine", summary: "Severe headaches with aura, nausea, and light sensitivity. Types, triggers, preventive and acute treatments.", readTime: "5 min" },
      { title: "Thyroid Disorders", summary: "Hypothyroidism vs hyperthyroidism — symptoms, TSH testing, medications, and monitoring.", readTime: "6 min" },
    ],
  },
  {
    name: "Medications",
    color: "bg-green-50 text-green-700",
    articles: [
      { title: "Paracetamol (Acetaminophen)", summary: "Uses, dosage, side effects, and maximum daily limits. Safety during pregnancy and for children.", readTime: "4 min" },
      { title: "Amoxicillin", summary: "A widely-used antibiotic for bacterial infections. When to use, dosage, resistance concerns, and allergies.", readTime: "5 min" },
      { title: "Metformin", summary: "First-line medication for Type 2 diabetes. Mechanism, dosing, GI side effects, and lactic acidosis risk.", readTime: "6 min" },
      { title: "Omeprazole", summary: "Proton pump inhibitor for acid reflux and GERD. Usage guidelines, long-term risks, and alternatives.", readTime: "5 min" },
      { title: "Cetirizine", summary: "Second-generation antihistamine for allergies. Dosage, drowsiness profile, and use in children.", readTime: "3 min" },
    ],
  },
  {
    name: "Nutrition & Wellness",
    color: "bg-orange-50 text-orange-700",
    articles: [
      { title: "Balanced Diet Basics", summary: "Macronutrients, micronutrients, portion sizes, and building a sustainable healthy eating plan.", readTime: "7 min" },
      { title: "Vitamin D Deficiency", summary: "Prevalence, symptoms, testing, supplementation guidelines, and natural sources.", readTime: "5 min" },
      { title: "Importance of Hydration", summary: "Daily water needs, signs of dehydration, electrolyte balance, and myths about water intake.", readTime: "4 min" },
      { title: "Sleep Hygiene", summary: "Evidence-based tips for better sleep. Screen time, sleep schedules, melatonin, and when to seek help.", readTime: "6 min" },
      { title: "Exercise for Beginners", summary: "Starting a fitness routine safely. Cardio vs strength, warm-ups, and recommended weekly activity levels.", readTime: "5 min" },
    ],
  },
  {
    name: "Mental Health",
    color: "bg-purple-50 text-purple-700",
    articles: [
      { title: "Understanding Anxiety", summary: "GAD, panic disorder, social anxiety — symptoms, coping strategies, therapy options, and when to medicate.", readTime: "7 min" },
      { title: "Depression", summary: "Major depressive disorder — symptoms, causes, treatment (CBT, SSRIs), and self-care strategies.", readTime: "8 min" },
      { title: "Stress Management", summary: "Chronic stress and its health effects. Practical techniques: mindfulness, breathing exercises, and time management.", readTime: "5 min" },
      { title: "ADHD in Adults", summary: "Recognition, diagnosis, behavioral strategies, and medication options for adult ADHD.", readTime: "6 min" },
    ],
  },
  {
    name: "First Aid & Emergencies",
    color: "bg-red-50 text-red-700",
    articles: [
      { title: "CPR Basics", summary: "Hands-only CPR steps, when to use an AED, and the chain of survival.", readTime: "4 min" },
      { title: "Burns Treatment", summary: "First-degree through third-degree burns. Immediate first aid, what NOT to do, and when to go to ER.", readTime: "5 min" },
      { title: "Choking Response", summary: "Heimlich maneuver for adults, children, and infants. Back blows technique and when to call 911.", readTime: "4 min" },
      { title: "Wound Care", summary: "Cleaning, dressing, and monitoring wounds. Signs of infection and when stitches are needed.", readTime: "5 min" },
    ],
  },
];

export default function WikiPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const allArticles = categories.flatMap((c) =>
    c.articles.map((a) => ({ ...a, category: c.name, color: c.color }))
  );

  const filtered = allArticles.filter((a) => {
    const matchCategory = activeCategory === "all" || a.category === activeCategory;
    const matchSearch =
      !search.trim() ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.summary.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold">OduDoc Health Wiki</h1>
          <p className="mt-3 text-lg text-primary-100">
            Trusted, doctor-reviewed health information for everyone
          </p>
          <div className="relative mt-8 mx-auto max-w-xl">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conditions, medications, wellness topics..."
              className="w-full rounded-xl border-0 bg-white/10 px-5 py-4 text-white placeholder-white/60 backdrop-blur-sm outline-none focus:ring-2 focus:ring-white/30"
            />
            <svg className="absolute right-4 top-4 h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </section>

      {/* Category filters */}
      <section className="border-b border-gray-100 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-2 px-4">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeCategory === "all" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            All Topics
          </button>
          {categories.map((c) => (
            <button
              key={c.name}
              onClick={() => setActiveCategory(c.name)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeCategory === c.name ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </section>

      {/* Articles */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4">
          <p className="mb-6 text-sm text-gray-500">{filtered.length} article(s)</p>
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((a, i) => (
              <article key={i} className="rounded-xl border border-gray-100 p-5 transition-shadow hover:shadow-md">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${a.color}`}>
                    {a.category}
                  </span>
                  <span className="text-xs text-gray-400">{a.readTime} read</span>
                </div>
                <h3 className="mb-1 text-base font-bold text-gray-900">{a.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{a.summary}</p>
              </article>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center text-gray-400">
              No articles match your search.
            </div>
          )}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="bg-gray-50 py-10">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="text-xs text-gray-500">
            <strong>Medical Disclaimer:</strong> The information provided here is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or qualified health provider.
          </p>
        </div>
      </section>
    </div>
  );
}
