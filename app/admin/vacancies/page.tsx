"use client";

// Vacancy poster — admin UI for /api/vacancies.
//
// Lists this org's open + closed vacancies, lets admin add a new
// one inline, edit status, and delete. Active org id is read from
// localStorage (org-switcher convention).

import { useCallback, useEffect, useState } from "react";
import { PageHero } from "@/components/admin/PageShell";

type Kind = "full_time" | "part_time" | "locum" | "contract" | "internship" | "fellowship" | "residency" | "volunteer";
type Status = "open" | "filled" | "closed" | "draft";

interface Vacancy {
  id: string; organizationId: string;
  title: string; department?: string; specialty?: string;
  kind: Kind; location: string; remoteOk?: boolean;
  salary?: string; description: string;
  responsibilities: string[]; requirements: string[];
  postedAt: string; status: Status;
}

const KINDS: Kind[] = ["full_time", "part_time", "locum", "contract", "internship", "fellowship", "residency", "volunteer"];

export default function VacanciesAdminPage() {
  const [orgId, setOrgId] = useState("");
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOrgId(localStorage.getItem("odudoc:active-org") || "");
  }, []);

  const load = useCallback(async () => {
    if (!orgId) return;
    const r = await fetch(`/api/vacancies?orgId=${encodeURIComponent(orgId)}&openOnly=0`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setVacancies(d.vacancies || []);
    }
  }, [orgId]);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: Status) => {
    await fetch("/api/vacancies", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_status", id, organizationId: orgId, status }),
    });
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this vacancy?")) return;
    await fetch(`/api/vacancies?id=${encodeURIComponent(id)}&orgId=${encodeURIComponent(orgId)}`, { method: "DELETE" });
    load();
  };

  if (!orgId) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Pick an organization from the header.</p>;

  return (
    <div className="space-y-6">
      <PageHero
        icon="💼"
        eyebrow="Hiring"
        title="Vacancies"
        subtitle="Open roles — surfaced on /jobs and your /c/<slug> mini-site."
        tone="amber"
        primaryAction={{
          label: showForm ? "Cancel" : "+ New vacancy",
          onClick: () => setShowForm((v) => !v),
        }}
      />

      {showForm && <VacancyForm orgId={orgId} onSaved={() => { setShowForm(false); load(); }} />}

      {vacancies.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No vacancies yet.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {vacancies.map((v) => (
            <li key={v.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{v.title}</p>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-800">{v.kind.replace(/_/g, " ")}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      v.status === "open" ? "bg-emerald-100 text-emerald-800"
                      : v.status === "draft" ? "bg-slate-100 text-slate-700"
                      : "bg-rose-100 text-rose-800"
                    }`}>{v.status}</span>
                  </div>
                  <p className="text-xs text-slate-500">{v.location}{v.specialty ? ` · ${v.specialty}` : ""}{v.salary ? ` · ${v.salary}` : ""}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{v.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={v.status}
                    onChange={(e) => setStatus(v.id, e.target.value as Status)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    {["open", "filled", "closed", "draft"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => remove(v.id)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" aria-label="Delete">
                    ✕
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VacancyForm({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Kind>("full_time");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [salary, setSalary] = useState("");
  const [description, setDescription] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [requirements, setRequirements] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!title.trim() || !location.trim() || !description.trim()) {
      setError("Title, location, and description are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/vacancies", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          organizationId: orgId,
          title: title.trim(), kind, location: location.trim(),
          department: department.trim() || undefined,
          specialty: specialty.trim() || undefined,
          salary: salary.trim() || undefined,
          description: description.trim(),
          responsibilities: responsibilities.split("\n").map((r) => r.trim()).filter(Boolean),
          requirements: requirements.split("\n").map((r) => r.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b.error || "Failed"); return; }
      onSaved();
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-bold text-slate-900">New vacancy</p>
      {error && <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Inp label="Title" value={title} onChange={setTitle} placeholder="Cardiologist · Senior" />
        <Sel label="Kind" value={kind} onChange={(v) => setKind(v as Kind)} options={KINDS.map((k) => ({ value: k, label: k.replace(/_/g, " ") }))} />
        <Inp label="Location" value={location} onChange={setLocation} placeholder="Hyderabad / Remote" />
        <Inp label="Department (optional)" value={department} onChange={setDepartment} />
        <Inp label="Specialty (optional)" value={specialty} onChange={setSpecialty} />
        <Inp label="Salary (optional)" value={salary} onChange={setSalary} placeholder="₹ 30L - 45L / annum" />
        <Area label="Description" value={description} onChange={setDescription} className="sm:col-span-2" />
        <Area label="Responsibilities (one per line)" value={responsibilities} onChange={setResponsibilities} className="sm:col-span-2" />
        <Area label="Requirements (one per line)" value={requirements} onChange={setRequirements} className="sm:col-span-2" />
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={submit} disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Post vacancy"}
        </button>
      </div>
    </div>
  );
}

function Inp({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="text-xs font-semibold text-slate-700">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
    </label>
  );
}
function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="text-xs font-semibold text-slate-700">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
function Area({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={`text-xs font-semibold text-slate-700 ${className}`}>
      {label}
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
    </label>
  );
}
