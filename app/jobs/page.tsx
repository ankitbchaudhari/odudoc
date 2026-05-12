// Public jobs feed — pulls org-vacancies from any registered
// hospital / lab / pharmacy / pharma / insurer / education partner.
// Internships filterable as their own kind. The platform's own
// careers (lib/careers-store) live separately at /careers.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface Vacancy {
  id: string; organizationId: string; orgKind?: string;
  title: string; department?: string; specialty?: string;
  kind: string; location: string; remoteOk?: boolean;
  salary?: string; description: string;
  responsibilities: string[]; requirements: string[];
  postedAt: string; closesAt?: string;
  contactEmail?: string; applyUrl?: string;
  status: string;
}

const KIND_LABEL: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", locum: "Locum",
  contract: "Contract", internship: "Internship", fellowship: "Fellowship",
  residency: "Residency", volunteer: "Volunteer",
};

export default function JobsPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [filter, setFilter] = useState<"all" | string>("all");
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ openOnly: "1" });
      if (filter !== "all") params.set("kind", filter);
      if (city.trim()) params.set("city", city.trim());
      if (query.trim()) params.set("query", query.trim());
      const r = await fetch(`/api/vacancies?${params.toString()}`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setVacancies(d.vacancies || []);
      }
    } finally { setLoading(false); }
  }, [filter, city, query]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: vacancies.length };
    for (const v of vacancies) c[v.kind] = (c[v.kind] || 0) + 1;
    return c;
  }, [vacancies]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">Healthcare careers</p>
          <h1 className="mt-2 text-4xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-5xl">Jobs &amp; internships</h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
            Open roles posted by hospitals, labs, pharmacies, pharma companies, insurers, and education partners on OduDoc.
          </p>
        </header>

        {/* Filter row */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, description"
            className="rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm"
          />
          <input
            value={city} onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm"
          />
          <Link href="/careers" className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 sm:col-span-2 lg:col-span-2 text-center">
            Looking for OduDoc platform roles? → /careers
          </Link>
        </div>

        {/* Kind chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Chip active={filter === "all"} onClick={() => setFilter("all")} count={counts.all}>All</Chip>
          {Object.keys(KIND_LABEL).map((k) => {
            const c = counts[k] || 0;
            if (c === 0 && filter !== k) return null;
            return (
              <Chip key={k} active={filter === k} onClick={() => setFilter(k)} count={c}>
                {KIND_LABEL[k]}
              </Chip>
            );
          })}
        </div>

        {loading ? (
          <p className="rounded-xl bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-400 shadow-sm">Loading…</p>
        ) : vacancies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white dark:bg-slate-900 p-10 text-center">
            <p className="text-3xl">💼</p>
            <p className="mt-2 text-base font-bold text-slate-700 dark:text-slate-300">No matching roles</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try a different filter, or check back later — postings refresh daily.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {vacancies.map((v) => (
              <li key={v.id} className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{v.title}</h3>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-800">{KIND_LABEL[v.kind] || v.kind}</span>
                      {v.remoteOk && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">Remote OK</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                      {v.department && <>{v.department} · </>}{v.specialty && <>{v.specialty} · </>}{v.location}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-700 dark:text-slate-300">{v.description}</p>
                    {v.salary && <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{v.salary}</p>}
                    <p className="mt-1 text-[10px] text-slate-400">Posted {new Date(v.postedAt).toLocaleDateString()}{v.closesAt ? ` · closes ${new Date(v.closesAt).toLocaleDateString()}` : ""}</p>
                  </div>
                  {v.applyUrl ? (
                    <a href={v.applyUrl} target="_blank" rel="noreferrer" className="flex-none rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Apply</a>
                  ) : v.contactEmail ? (
                    <a href={`mailto:${v.contactEmail}?subject=${encodeURIComponent(`Application — ${v.title}`)}`} className="flex-none rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Apply</a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function Chip({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${active ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-slate-50 dark:bg-slate-900"}`}
    >
      {children}
      <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>{count}</span>
    </button>
  );
}
