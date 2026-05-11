"use client";

// Education partner admin — courses + placement-request inbox.

import { useCallback, useEffect, useState } from "react";
import { PageHero } from "@/components/admin/PageShell";

type Level = "certificate" | "diploma" | "undergrad" | "postgrad" | "fellowship" | "cme" | "workshop";
type Mode = "in_person" | "online_self_paced" | "online_live" | "online_one_on_one" | "hybrid";
type PlacementStatus = "submitted" | "in_review" | "matched" | "placed" | "withdrawn";

interface Course {
  id: string; organizationId: string;
  title: string; specialty?: string; level: Level; mode: Mode;
  duration?: string; feeRupees?: number; intakeSchedule?: string;
  city?: string; countryIso2?: string;
  description: string; syllabus?: string[]; prerequisites?: string[];
  websiteUrl?: string; enrollOnPlatform: boolean;
  active: boolean; updatedAt: string;
}
interface Placement {
  id: string; organizationId: string;
  studentName: string; studentEmail: string; studentPhone?: string;
  qualifications: string; specialtySought?: string; preferredCities?: string;
  courseId?: string; objective?: string;
  status: PlacementStatus; matchedVacancyId?: string; notes?: string;
  updatedAt: string; createdAt: string;
}

const LEVELS: Level[] = ["certificate", "diploma", "undergrad", "postgrad", "fellowship", "cme", "workshop"];
const MODES: Mode[] = ["in_person", "online_self_paced", "online_live", "online_one_on_one", "hybrid"];
const STATUSES: PlacementStatus[] = ["submitted", "in_review", "matched", "placed", "withdrawn"];

export default function EducationAdminPage() {
  const [orgId, setOrgId] = useState("");
  const [tab, setTab] = useState<"courses" | "placements">("courses");
  const [courses, setCourses] = useState<Course[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrgId(localStorage.getItem("odudoc:active-org") || "");
  }, []);

  const load = useCallback(async () => {
    if (!orgId) return;
    const [cR, pR] = await Promise.all([
      fetch(`/api/education?scope=courses&orgId=${encodeURIComponent(orgId)}`, { cache: "no-store" }),
      fetch(`/api/education?scope=placements&orgId=${encodeURIComponent(orgId)}`, { cache: "no-store" }),
    ]);
    if (cR.ok) setCourses((await cR.json()).courses || []);
    if (pR.ok) setPlacements((await pR.json()).placements || []);
  }, [orgId]);
  useEffect(() => { load(); }, [load]);

  const setActive = async (c: Course, active: boolean) => {
    await fetch("/api/education", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_course", id: c.id, organizationId: orgId, patch: { active } }),
    });
    load();
  };
  const removeCourse = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    await fetch(`/api/education?id=${encodeURIComponent(id)}&orgId=${encodeURIComponent(orgId)}&target=course`, { method: "DELETE" });
    load();
  };
  const setPlacementStatus = async (p: Placement, status: PlacementStatus) => {
    await fetch("/api/education", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_placement", id: p.id, organizationId: orgId, patch: { status } }),
    });
    load();
  };

  if (!orgId) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Pick an organization from the header.</p>;

  return (
    <div className="space-y-6">
      <PageHero
        icon="🎓"
        eyebrow="Academic"
        title="Education Partners"
        subtitle="Course catalogue + student placement requests."
        tone="emerald"
        primaryAction={
          tab === "courses"
            ? { label: showForm ? "Cancel" : "+ New course", onClick: () => setShowForm((v) => !v) }
            : undefined
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {(["courses", "placements"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setShowForm(false); }} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${tab === t ? "bg-indigo-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
            {t === "courses" ? `Courses (${courses.length})` : `Placements (${placements.length})`}
          </button>
        ))}
      </div>

      {tab === "courses" ? (
        <>
          {showForm && <CourseForm orgId={orgId} onSaved={() => { setShowForm(false); load(); }} />}
          {courses.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No courses yet.</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {courses.map((c) => (
                <li key={c.id} className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${!c.active ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{c.title}</p>
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-800">{c.level}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">{c.mode.replace(/_/g, " ")}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {c.specialty && <>{c.specialty} · </>}
                        {c.duration && <>{c.duration} · </>}
                        {c.feeRupees && <>₹{c.feeRupees.toLocaleString("en-IN")}</>}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{c.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setActive(c, !c.active)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-300">
                        {c.active ? "Pause" : "Activate"}
                      </button>
                      <button onClick={() => removeCourse(c.id)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" aria-label="Delete">✕</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        placements.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No placement requests yet.</p>
        ) : (
          <ul className="space-y-3">
            {placements.map((p) => (
              <li key={p.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{p.studentName}</p>
                    <p className="text-xs text-slate-500">{p.studentEmail}{p.studentPhone ? ` · ${p.studentPhone}` : ""}</p>
                    <p className="mt-0.5 text-xs text-slate-700">{p.qualifications}</p>
                    {p.specialtySought && <p className="text-[11px] text-slate-500">Seeking: {p.specialtySought}{p.preferredCities ? ` · ${p.preferredCities}` : ""}</p>}
                    {p.objective && <p className="mt-1 text-[11px] italic text-slate-500">{p.objective}</p>}
                  </div>
                  <select
                    value={p.status}
                    onChange={(e) => setPlacementStatus(p, e.target.value as PlacementStatus)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

function CourseForm({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [s, setS] = useState({
    title: "", specialty: "", level: "certificate" as Level, mode: "in_person" as Mode,
    duration: "", feeRupees: "", intakeSchedule: "", city: "", countryIso2: "IN",
    description: "", syllabus: "", prerequisites: "", websiteUrl: "",
    enrollOnPlatform: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!s.title.trim() || !s.description.trim()) { setError("Title + description required."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/education", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_course",
          organizationId: orgId,
          title: s.title.trim(),
          specialty: s.specialty.trim() || undefined,
          level: s.level,
          mode: s.mode,
          duration: s.duration.trim() || undefined,
          feeRupees: s.feeRupees ? Number(s.feeRupees) : undefined,
          intakeSchedule: s.intakeSchedule.trim() || undefined,
          city: s.city.trim() || undefined,
          countryIso2: s.countryIso2.trim().toUpperCase(),
          description: s.description.trim(),
          syllabus: s.syllabus.split("\n").map((x) => x.trim()).filter(Boolean),
          prerequisites: s.prerequisites.split("\n").map((x) => x.trim()).filter(Boolean),
          websiteUrl: s.websiteUrl.trim() || undefined,
          enrollOnPlatform: s.enrollOnPlatform,
        }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b.error || "Failed"); return; }
      onSaved();
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-bold text-slate-900">New course</p>
      {error && <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <I label="Title" v={s.title} on={(v) => setS({ ...s, title: v })} className="sm:col-span-2" />
        <Sel label="Level" v={s.level} on={(v) => setS({ ...s, level: v as Level })} options={LEVELS} />
        <Sel label="Mode" v={s.mode} on={(v) => setS({ ...s, mode: v as Mode })} options={MODES.map((m) => m)} />
        <I label="Specialty" v={s.specialty} on={(v) => setS({ ...s, specialty: v })} placeholder="Physiotherapy, Pediatric nursing…" />
        <I label="Duration" v={s.duration} on={(v) => setS({ ...s, duration: v })} placeholder="3 months / 6 weekends" />
        <I label="Fee (₹)" v={s.feeRupees} on={(v) => setS({ ...s, feeRupees: v })} />
        <I label="Intake schedule" v={s.intakeSchedule} on={(v) => setS({ ...s, intakeSchedule: v })} placeholder="Rolling / Jan + Jul" />
        <I label="City (in-person)" v={s.city} on={(v) => setS({ ...s, city: v })} />
        <I label="Country (ISO-2)" v={s.countryIso2} on={(v) => setS({ ...s, countryIso2: v })} />
        <Area label="Description" v={s.description} on={(v) => setS({ ...s, description: v })} className="sm:col-span-2" />
        <Area label="Syllabus (one per line)" v={s.syllabus} on={(v) => setS({ ...s, syllabus: v })} className="sm:col-span-2" />
        <Area label="Prerequisites (one per line)" v={s.prerequisites} on={(v) => setS({ ...s, prerequisites: v })} className="sm:col-span-2" />
        <I label="Website URL (partner site)" v={s.websiteUrl} on={(v) => setS({ ...s, websiteUrl: v })} className="sm:col-span-2" />
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 sm:col-span-2">
          <input type="checkbox" checked={s.enrollOnPlatform} onChange={(e) => setS({ ...s, enrollOnPlatform: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
          Allow direct enrollment through OduDoc (else redirect to website URL)
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={submit} disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Publish course"}
        </button>
      </div>
    </div>
  );
}

function I({ label, v, on, placeholder, className = "" }: { label: string; v: string; on: (v: string) => void; placeholder?: string; className?: string }) {
  return <label className={`text-xs font-semibold text-slate-700 ${className}`}>{label}<input value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>;
}
function Sel({ label, v, on, options }: { label: string; v: string; on: (v: string) => void; options: string[] }) {
  return <label className="text-xs font-semibold text-slate-700">{label}<select value={v} onChange={(e) => on(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal">{options.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}</select></label>;
}
function Area({ label, v, on, className = "" }: { label: string; v: string; on: (v: string) => void; className?: string }) {
  return <label className={`text-xs font-semibold text-slate-700 ${className}`}>{label}<textarea value={v} onChange={(e) => on(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>;
}
