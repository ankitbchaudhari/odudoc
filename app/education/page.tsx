// Public courses feed.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface Course {
  id: string; organizationId: string;
  title: string; specialty?: string; level: string; mode: string;
  duration?: string; feeRupees?: number; city?: string;
  description: string; websiteUrl?: string; enrollOnPlatform: boolean;
}

const LEVEL_LABEL: Record<string, string> = {
  certificate: "Certificate", diploma: "Diploma", undergrad: "Undergrad",
  postgrad: "Postgrad", fellowship: "Fellowship", cme: "CME", workshop: "Workshop",
};
const MODE_LABEL: Record<string, string> = {
  in_person: "In-person", online_self_paced: "Self-paced", online_live: "Live online",
  online_one_on_one: "1:1 online", hybrid: "Hybrid",
};

export default function EducationFeedPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [mode, setMode] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (level) params.set("level", level);
      if (mode) params.set("mode", mode);
      const r = await fetch(`/api/education?${params.toString()}`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setCourses(d.courses || []);
      }
    } finally { setLoading(false); }
  }, [query, level, mode]);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of courses) c[x.level] = (c[x.level] || 0) + 1;
    return c;
  }, [courses]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Education partners</p>
          <h1 className="mt-2 text-4xl font-extrabold text-slate-900 sm:text-5xl">Courses &amp; training</h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Certificates, diplomas, fellowships, CME, and 1:1 online training from OduDoc education partners.
          </p>
        </header>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or description" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" />
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="">All levels</option>
            {Object.keys(LEVEL_LABEL).map((k) => <option key={k} value={k}>{LEVEL_LABEL[k]}{counts[k] ? ` (${counts[k]})` : ""}</option>)}
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="">All modes</option>
            {Object.keys(MODE_LABEL).map((k) => <option key={k} value={k}>{MODE_LABEL[k]}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">Loading…</p>
        ) : courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-3xl">🎓</p>
            <p className="mt-2 text-base font-bold text-slate-700">No matching courses</p>
            <p className="mt-1 text-sm text-slate-500">Try a different filter.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {courses.map((c) => (
              <li key={c.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">{LEVEL_LABEL[c.level]} · {MODE_LABEL[c.mode]}</p>
                <h3 className="mt-1 text-base font-bold text-slate-900">{c.title}</h3>
                <p className="text-xs text-slate-500">
                  {c.specialty && <>{c.specialty} · </>}
                  {c.duration && <>{c.duration} · </>}
                  {c.feeRupees ? <>₹{c.feeRupees.toLocaleString("en-IN")}</> : "Free"}
                </p>
                <p className="mt-2 line-clamp-3 text-sm text-slate-700">{c.description}</p>
                {(c.websiteUrl || c.enrollOnPlatform) && (
                  <div className="mt-3 flex justify-end">
                    {c.websiteUrl ? (
                      <a href={c.websiteUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white">Learn more ↗</a>
                    ) : (
                      <Link href={`/c/${c.organizationId}`} className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white">Apply</Link>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
