"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  EmployeeRecord, HealthEncounter,
  EmployeeRole, EmploymentStatus, FitnessStatus,
  EncounterKind, EncounterStatus, VaccineType,
} from "@/lib/hospital/employee-health-store";
// Inlined from employee-health-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const ROLE_LABEL: Record<EmployeeRole, string> = {
  doctor: "Doctor", nurse: "Nurse", technician: "Technician",
  pharmacist: "Pharmacist", housekeeping: "Housekeeping", security: "Security",
  admin: "Admin", food_services: "Food services", biomedical: "Biomedical", other: "Other",
};
const EMP_STATUS_LABEL: Record<EmploymentStatus, string> = {
  active: "Active", on_leave: "On leave", terminated: "Terminated", retired: "Retired",
};
const FITNESS_LABEL: Record<FitnessStatus, string> = {
  fit: "Fit", fit_with_restrictions: "Fit w/ restrictions",
  temporarily_unfit: "Temporarily unfit", permanently_unfit: "Permanently unfit",
  pending: "Pending",
};
const ENC_KIND_LABEL: Record<EncounterKind, string> = {
  pre_employment: "Pre-employment", periodic_exam: "Periodic exam",
  vaccination: "Vaccination", needlestick: "Needlestick",
  sharps_injury: "Sharps injury", blood_body_fluid_exposure: "Blood/BF exposure",
  tb_screening: "TB screening", n95_fit_test: "N95 fit test",
  fitness_certificate: "Fitness cert", return_to_work: "Return to work",
  illness_absence: "Illness / absence", injury_on_duty: "Injury on duty",
  psych_wellness: "Psych / wellness", radiation_monitoring: "Radiation monitoring",
  other: "Other",
};
const VACCINE_LABEL: Record<VaccineType, string> = {
  hep_b: "Hepatitis B", influenza: "Influenza", covid19: "COVID-19",
  mmr: "MMR", tdap: "Tdap", varicella: "Varicella",
  typhoid: "Typhoid", hepatitis_a: "Hepatitis A", rabies_pep: "Rabies PEP",
  bcg: "BCG", other: "Other",
};
const ENC_STATUS_LABEL: Record<EncounterStatus, string> = {
  draft: "Draft", open: "Open", follow_up: "Follow-up",
  closed: "Closed", referred: "Referred",
};

const ROLES: EmployeeRole[] = ["doctor", "nurse", "technician", "pharmacist", "housekeeping", "security", "admin", "food_services", "biomedical", "other"];
const EMP_STATUSES: EmploymentStatus[] = ["active", "on_leave", "terminated", "retired"];
const FITNESS: FitnessStatus[] = ["fit", "fit_with_restrictions", "temporarily_unfit", "permanently_unfit", "pending"];
const ENC_KINDS: EncounterKind[] = ["pre_employment", "periodic_exam", "vaccination", "needlestick", "sharps_injury", "blood_body_fluid_exposure", "tb_screening", "n95_fit_test", "fitness_certificate", "return_to_work", "illness_absence", "injury_on_duty", "psych_wellness", "radiation_monitoring", "other"];
const ENC_STATUSES: EncounterStatus[] = ["draft", "open", "follow_up", "closed", "referred"];
const VACCINES: VaccineType[] = ["hep_b", "influenza", "covid19", "mmr", "tdap", "varicella", "typhoid", "hepatitis_a", "rabies_pep", "bcg", "other"];

export default function EmployeeHealthPage() {
  const [tab, setTab] = useState<"encounters" | "staff">("encounters");
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [encounters, setEncounters] = useState<HealthEncounter[]>([]);
  const [stats, setStats] = useState<{ activeStaff: number; hepBIncomplete: number; fitnessExpiring: number; vaccinationsMonth: number; sharpsMonth: number; openExposures: number; absenceDaysMonth: number } | null>(null);
  const [showEmp, setShowEmp] = useState(false);
  const [showEnc, setShowEnc] = useState(false);
  const [editEmp, setEditEmp] = useState<EmployeeRecord | null>(null);
  const [editEnc, setEditEnc] = useState<HealthEncounter | null>(null);
  const [fRole, setFRole] = useState<EmployeeRole | "">("");
  const [fKind, setFKind] = useState<EncounterKind | "">("");

  async function load() {
    const res = await fetch("/api/hospital/employee-health", { cache: "no-store" });
    const data = await res.json();
    setEmployees(data.employees || []);
    setEncounters(data.encounters || []);
    setStats(data.stats || null);
  }
  useEffect(() => { load(); }, []);

  async function del(id: string, recordKind?: string) {
    if (!confirm("Delete?")) return;
    await fetch("/api/hospital/employee-health", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, recordKind }) });
    load();
  }

  const filteredEmps = useMemo(() => employees.filter((e) => (fRole ? e.role === fRole : true)), [employees, fRole]);
  const filteredEncs = useMemo(() => encounters.filter((e) => (fKind ? e.kind === fKind : true)), [encounters, fKind]);

  const ROLE_THEMES: Record<EmployeeRole | "all", string> = {
    all: "from-slate-500 to-gray-600",
    doctor: "from-rose-500 to-pink-600",
    nurse: "from-sky-500 to-blue-600",
    technician: "from-violet-500 to-purple-600",
    pharmacist: "from-emerald-500 to-teal-600",
    housekeeping: "from-amber-500 to-orange-600",
    security: "from-slate-600 to-gray-700",
    admin: "from-indigo-500 to-blue-600",
    food_services: "from-orange-500 to-red-600",
    biomedical: "from-cyan-500 to-sky-600",
    other: "from-slate-500 to-gray-600",
  };
  const KIND_THEMES: Record<EncounterKind | "all", string> = {
    all: "from-slate-500 to-gray-600",
    pre_employment: "from-emerald-500 to-teal-600",
    periodic_exam: "from-cyan-500 to-sky-600",
    vaccination: "from-green-500 to-emerald-600",
    needlestick: "from-rose-500 to-red-600",
    sharps_injury: "from-red-500 to-rose-700",
    blood_body_fluid_exposure: "from-rose-600 to-pink-700",
    tb_screening: "from-amber-500 to-orange-600",
    n95_fit_test: "from-indigo-500 to-blue-600",
    fitness_certificate: "from-teal-500 to-emerald-600",
    return_to_work: "from-sky-500 to-cyan-600",
    illness_absence: "from-amber-500 to-yellow-600",
    injury_on_duty: "from-orange-500 to-red-600",
    psych_wellness: "from-violet-500 to-purple-600",
    radiation_monitoring: "from-fuchsia-500 to-pink-600",
    other: "from-slate-500 to-gray-600",
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-lime-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" />
              </span>
              {encounters.length} encounters · {stats ? `${stats.vaccinationsMonth} vaccinations this month` : "loading…"}
            </div>
            <h1 className="text-2xl font-bold">Employee Health Clinic</h1>
            <p className="mt-1 text-sm text-emerald-50/90">Occupational health · Staff vaccinations · Sharps injury · Fitness certification.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setEditEmp(null); setShowEmp(true); }} className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/25">➕ Staff</button>
            <button onClick={() => { setEditEnc(null); setShowEnc(true); }} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">🩺 Encounter</button>
          </div>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <StatTile label="Active staff" value={stats.activeStaff} tone="emerald" />
          <StatTile label="Hep B incomplete" value={stats.hepBIncomplete} tone="rose" />
          <StatTile label="Fitness expiring (30d)" value={stats.fitnessExpiring} tone="amber" />
          <StatTile label="Vaccinations (mo)" value={stats.vaccinationsMonth} tone="green" />
          <StatTile label="Sharps (mo)" value={stats.sharpsMonth} tone="rose" />
          <StatTile label="Open exposures" value={stats.openExposures} tone="amber" />
          <StatTile label="Absence days (mo)" value={stats.absenceDaysMonth} tone="indigo" />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {(["encounters","staff"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition hover:-translate-y-0.5 ${
              tab === t
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
                : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"
            }`}
          >
            {t} ({t === "encounters" ? encounters.length : employees.length})
          </button>
        ))}
      </div>

      {tab === "staff" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <button onClick={() => setFRole("")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 ${fRole === "" ? `bg-gradient-to-r ${ROLE_THEMES.all} text-white shadow-md` : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"}`}>All roles</button>
            {ROLES.map((r) => (
              <button key={r} onClick={() => setFRole(r)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 ${fRole === r ? `bg-gradient-to-r ${ROLE_THEMES[r]} text-white shadow-md` : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"}`}>{ROLE_LABEL[r]}</button>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gradient-to-r from-emerald-50/60 via-green-50/40 to-teal-50/60 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Hep B</th>
                  <th className="px-4 py-3">TB</th>
                  <th className="px-4 py-3">Fitness</th>
                  <th className="px-4 py-3">Employment</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmps.map((e) => (
                  <tr key={e.id} className="transition-colors hover:bg-emerald-50/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{e.firstName} {e.lastName}</div>
                      <div className="text-xs text-slate-500">{e.employeeCode} · {e.id}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{ROLE_LABEL[e.role]}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{e.department}{e.designation ? ` · ${e.designation}` : ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{e.hepBStatus || "-"}{e.hepBAntibodyTitre ? ` (${e.hepBAntibodyTitre})` : ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{e.tbStatus || "-"}</td>
                    <td className="px-4 py-3 text-xs">
                      {e.fitnessStatus ? <Pill status={e.fitnessStatus}>{FITNESS_LABEL[e.fitnessStatus]}</Pill> : <span className="text-slate-500">-</span>}
                      {e.fitnessExpiresOn && <div className="mt-0.5 text-slate-500">exp {new Date(e.fitnessExpiresOn).toLocaleDateString()}</div>}
                    </td>
                    <td className="px-4 py-3"><Pill status={e.employmentStatus}>{EMP_STATUS_LABEL[e.employmentStatus]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditEmp(e); setShowEmp(true); }} className="mr-2 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">Edit</button>
                      <button onClick={() => del(e.id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow">Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredEmps.length === 0 && <tr><td colSpan={8}><Empty>👥 No staff yet.</Empty></td></tr>}
              </tbody>
            </table></div>
          </div>
        </>
      )}

      {tab === "encounters" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <button onClick={() => setFKind("")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 ${fKind === "" ? `bg-gradient-to-r ${KIND_THEMES.all} text-white shadow-md` : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"}`}>All</button>
            {ENC_KINDS.map((k) => (
              <button key={k} onClick={() => setFKind(k)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 ${fKind === k ? `bg-gradient-to-r ${KIND_THEMES[k]} text-white shadow-md` : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"}`}>{ENC_KIND_LABEL[k]}</button>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gradient-to-r from-emerald-50/60 via-green-50/40 to-teal-50/60 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Attended by</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEncs.map((x) => (
                  <tr key={x.id} className="transition-colors hover:bg-emerald-50/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{x.employeeName}</div>
                      <div className="text-xs text-slate-500">{x.department || "-"}{x.confidential ? " · ◉" : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{new Date(x.encounterDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{ENC_KIND_LABEL[x.kind]}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {x.kind === "vaccination" && x.vaccineType ? `${VACCINE_LABEL[x.vaccineType]}${x.doseNumber ? ` · dose ${x.doseNumber}` : ""}` : null}
                      {(x.kind === "needlestick" || x.kind === "sharps_injury" || x.kind === "blood_body_fluid_exposure") ? `${x.exposureRoute || "-"}${x.sourceStatus ? ` · src ${x.sourceStatus}` : ""}` : null}
                      {x.kind === "fitness_certificate" && x.fitnessOutcome ? FITNESS_LABEL[x.fitnessOutcome] : null}
                      {x.kind === "illness_absence" && x.absenceFromDate ? `${x.absenceFromDate} → ${x.absenceToDate || "?"}` : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{x.attendedBy}</td>
                    <td className="px-4 py-3"><Pill status={x.status}>{ENC_STATUS_LABEL[x.status]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditEnc(x); setShowEnc(true); }} className="mr-2 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">Edit</button>
                      <button onClick={() => del(x.id, "encounter")} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow">Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredEncs.length === 0 && <tr><td colSpan={7}><Empty>🩺 No encounters.</Empty></td></tr>}
              </tbody>
            </table></div>
          </div>
        </>
      )}

      {showEmp && <EmployeeModal initial={editEmp} onClose={() => { setShowEmp(false); setEditEmp(null); }} onSaved={() => { setShowEmp(false); setEditEmp(null); load(); }} />}
      {showEnc && <EncounterModal employees={employees} initial={editEnc} onClose={() => { setShowEnc(false); setEditEnc(null); }} onSaved={() => { setShowEnc(false); setEditEnc(null); load(); }} />}
    </div>
  );
}

function EmployeeModal({ initial, onClose, onSaved }: { initial: EmployeeRecord | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<EmployeeRecord>>(
    initial ?? { role: "nurse", employmentStatus: "active" },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/employee-health", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit employee" : "New employee record"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Employee code *"><input className="inp" value={form.employeeCode || ""} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} /></Field>
          <Field label="First name *"><input className="inp" value={form.firstName || ""} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Last name *"><input className="inp" value={form.lastName || ""} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          <Field label="Role"><select className="inp" value={form.role || "nurse"} onChange={(e) => setForm({ ...form, role: e.target.value as EmployeeRole })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
          <Field label="Department *"><input className="inp" value={form.department || ""} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
          <Field label="Designation"><input className="inp" value={form.designation || ""} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
          <Field label="Date of joining"><input type="date" className="inp" value={(form.dateOfJoining || "").slice(0, 10)} onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} /></Field>
          <Field label="Date of birth"><input type="date" className="inp" value={(form.dateOfBirth || "").slice(0, 10)} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></Field>
          <Field label="Gender"><select className="inp" value={form.gender || ""} onChange={(e) => setForm({ ...form, gender: (e.target.value || undefined) as EmployeeRecord["gender"] })}><option value="">-</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="unspecified">Unspecified</option></select></Field>
          <Field label="Phone"><input className="inp" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><input className="inp" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Blood group"><input className="inp" value={form.bloodGroup || ""} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} /></Field>
          <Field label="Allergies" full><input className="inp" value={form.allergies || ""} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></Field>
          <Field label="Chronic conditions" full><input className="inp" value={form.chronicConditions || ""} onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })} /></Field>
          <Field label="Current medications" full><input className="inp" value={form.currentMedications || ""} onChange={(e) => setForm({ ...form, currentMedications: e.target.value })} /></Field>
          <Field label="Emergency contact"><input className="inp" value={form.emergencyContactName || ""} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} /></Field>
          <Field label="Emergency phone"><input className="inp" value={form.emergencyContactPhone || ""} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} /></Field>
          <Field label="Employment"><select className="inp" value={form.employmentStatus || "active"} onChange={(e) => setForm({ ...form, employmentStatus: e.target.value as EmploymentStatus })}>{EMP_STATUSES.map((s) => <option key={s} value={s}>{EMP_STATUS_LABEL[s]}</option>)}</select></Field>

          <Field label="Hep B status"><select className="inp" value={form.hepBStatus || ""} onChange={(e) => setForm({ ...form, hepBStatus: (e.target.value || undefined) as EmployeeRecord["hepBStatus"] })}><option value="">-</option><option value="full">Full</option><option value="partial">Partial</option><option value="non_responder">Non-responder</option><option value="unvaccinated">Unvaccinated</option><option value="unknown">Unknown</option></select></Field>
          <Field label="Hep B anti-HBs titre"><input type="number" className="inp" value={form.hepBAntibodyTitre ?? ""} onChange={(e) => setForm({ ...form, hepBAntibodyTitre: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="TB status"><select className="inp" value={form.tbStatus || ""} onChange={(e) => setForm({ ...form, tbStatus: (e.target.value || undefined) as EmployeeRecord["tbStatus"] })}><option value="">-</option><option value="negative">Negative</option><option value="latent">Latent</option><option value="active_treated">Active (treated)</option><option value="active_current">Active (current)</option><option value="unknown">Unknown</option></select></Field>
          <Field label="Last medical exam"><input type="date" className="inp" value={(form.lastMedicalExam || "").slice(0, 10)} onChange={(e) => setForm({ ...form, lastMedicalExam: e.target.value })} /></Field>
          <Field label="Fitness"><select className="inp" value={form.fitnessStatus || ""} onChange={(e) => setForm({ ...form, fitnessStatus: (e.target.value || undefined) as FitnessStatus })}><option value="">-</option>{FITNESS.map((f) => <option key={f} value={f}>{FITNESS_LABEL[f]}</option>)}</select></Field>
          <Field label="Fitness expires"><input type="date" className="inp" value={(form.fitnessExpiresOn || "").slice(0, 10)} onChange={(e) => setForm({ ...form, fitnessExpiresOn: e.target.value })} /></Field>
          <Field label="Notes" full><textarea className="inp" rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>

        {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function EncounterModal({ employees, initial, onClose, onSaved }: { employees: EmployeeRecord[]; initial: HealthEncounter | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<HealthEncounter>>(
    initial ?? {
      kind: "periodic_exam", status: "open", confidential: true,
      encounterDate: new Date().toISOString().slice(0, 10),
    },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const kind = form.kind || "periodic_exam";
  const isExposure = kind === "needlestick" || kind === "sharps_injury" || kind === "blood_body_fluid_exposure";

  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form, recordKind: "encounter" };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/employee-health", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-5xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit encounter" : "New health encounter"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Employee *">
            <select className="inp" value={form.employeeId || ""} disabled={!!initial} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">-- Select --</option>
              {employees.map((x) => <option key={x.id} value={x.id}>{x.firstName} {x.lastName} ({x.employeeCode})</option>)}
            </select>
          </Field>
          <Field label="Date *"><input type="date" className="inp" value={(form.encounterDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, encounterDate: e.target.value })} /></Field>
          <Field label="Attended by *"><input className="inp" value={form.attendedBy || ""} onChange={(e) => setForm({ ...form, attendedBy: e.target.value })} /></Field>
          <Field label="Encounter type"><select className="inp" value={form.kind || "periodic_exam"} onChange={(e) => setForm({ ...form, kind: e.target.value as EncounterKind })}>{ENC_KINDS.map((k) => <option key={k} value={k}>{ENC_KIND_LABEL[k]}</option>)}</select></Field>
          <Field label="Status"><select className="inp" value={form.status || "open"} onChange={(e) => setForm({ ...form, status: e.target.value as EncounterStatus })}>{ENC_STATUSES.map((s) => <option key={s} value={s}>{ENC_STATUS_LABEL[s]}</option>)}</select></Field>
          <Field label="Chief complaint" full><input className="inp" value={form.chiefComplaint || ""} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} /></Field>
        </div>

        {kind === "vaccination" && (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-3 text-sm font-semibold text-slate-800">Vaccination</div>
            <Field label="Vaccine"><select className="inp" value={form.vaccineType || ""} onChange={(e) => setForm({ ...form, vaccineType: (e.target.value || undefined) as VaccineType })}><option value="">-</option>{VACCINES.map((v) => <option key={v} value={v}>{VACCINE_LABEL[v]}</option>)}</select></Field>
            <Field label="Brand"><input className="inp" value={form.vaccineBrand || ""} onChange={(e) => setForm({ ...form, vaccineBrand: e.target.value })} /></Field>
            <Field label="Dose #"><input type="number" className="inp" value={form.doseNumber ?? ""} onChange={(e) => setForm({ ...form, doseNumber: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
            <Field label="Batch"><input className="inp" value={form.batchNumber || ""} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} /></Field>
            <Field label="Site"><select className="inp" value={form.vaccineSite || ""} onChange={(e) => setForm({ ...form, vaccineSite: (e.target.value || undefined) as HealthEncounter["vaccineSite"] })}><option value="">-</option><option value="left_deltoid">Left deltoid</option><option value="right_deltoid">Right deltoid</option><option value="gluteal">Gluteal</option><option value="thigh">Thigh</option><option value="oral">Oral</option><option value="intradermal">Intradermal</option><option value="other">Other</option></select></Field>
            <Field label="Next due date"><input type="date" className="inp" value={(form.vaccineNextDueDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, vaccineNextDueDate: e.target.value })} /></Field>
          </div>
        )}

        {isExposure && (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-3 text-sm font-semibold text-slate-800">Exposure / sharps</div>
            <Field label="Exposure time"><input type="datetime-local" className="inp" value={(form.exposureTime || "").slice(0, 16)} onChange={(e) => setForm({ ...form, exposureTime: e.target.value })} /></Field>
            <Field label="Location"><input className="inp" value={form.exposureLocation || ""} onChange={(e) => setForm({ ...form, exposureLocation: e.target.value })} /></Field>
            <Field label="Instrument"><input className="inp" value={form.instrumentInvolved || ""} onChange={(e) => setForm({ ...form, instrumentInvolved: e.target.value })} /></Field>
            <Field label="Route"><select className="inp" value={form.exposureRoute || ""} onChange={(e) => setForm({ ...form, exposureRoute: (e.target.value || undefined) as HealthEncounter["exposureRoute"] })}><option value="">-</option><option value="percutaneous">Percutaneous</option><option value="mucocutaneous">Mucocutaneous</option><option value="intact_skin">Intact skin</option><option value="nonintact_skin">Non-intact skin</option><option value="bite">Bite</option></select></Field>
            <Field label="Source patient ID"><input className="inp" value={form.sourcePatientId || ""} onChange={(e) => setForm({ ...form, sourcePatientId: e.target.value })} /></Field>
            <Field label="Source status"><select className="inp" value={form.sourceStatus || ""} onChange={(e) => setForm({ ...form, sourceStatus: (e.target.value || undefined) as HealthEncounter["sourceStatus"] })}><option value="">-</option><option value="known_hiv">Known HIV</option><option value="known_hbv">Known HBV</option><option value="known_hcv">Known HCV</option><option value="unknown">Unknown</option><option value="negative_source">Negative source</option><option value="na">N/A</option></select></Field>
            <Field label="PEP regimen"><input className="inp" value={form.pepRegimen || ""} onChange={(e) => setForm({ ...form, pepRegimen: e.target.value })} /></Field>
            <Field label="PEP started at"><input type="datetime-local" className="inp" value={(form.pepStartedAt || "").slice(0, 16)} onChange={(e) => setForm({ ...form, pepStartedAt: e.target.value })} /></Field>
            <Field label="Baseline tests ordered" full><input className="inp" value={form.postExposureTestsOrdered || ""} onChange={(e) => setForm({ ...form, postExposureTestsOrdered: e.target.value })} /></Field>
          </div>
        )}

        {kind === "n95_fit_test" && (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-3 text-sm font-semibold text-slate-800">N95 fit test</div>
            <Field label="N95 model"><input className="inp" value={form.n95Model || ""} onChange={(e) => setForm({ ...form, n95Model: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.n95FitPassed} onChange={(e) => setForm({ ...form, n95FitPassed: e.target.checked })} /> Fit passed</label>
          </div>
        )}

        {(kind === "fitness_certificate" || kind === "return_to_work") && (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-3 text-sm font-semibold text-slate-800">Fitness / return to work</div>
            <Field label="Outcome"><select className="inp" value={form.fitnessOutcome || ""} onChange={(e) => setForm({ ...form, fitnessOutcome: (e.target.value || undefined) as FitnessStatus })}><option value="">-</option>{FITNESS.map((f) => <option key={f} value={f}>{FITNESS_LABEL[f]}</option>)}</select></Field>
            <Field label="Valid until"><input type="date" className="inp" value={(form.fitnessValidUntil || "").slice(0, 10)} onChange={(e) => setForm({ ...form, fitnessValidUntil: e.target.value })} /></Field>
            <Field label="Return to work date"><input type="date" className="inp" value={(form.returnToWorkDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, returnToWorkDate: e.target.value })} /></Field>
            <Field label="Restrictions" full><textarea className="inp" rows={2} value={form.fitnessRestrictions || ""} onChange={(e) => setForm({ ...form, fitnessRestrictions: e.target.value })} /></Field>
          </div>
        )}

        {kind === "illness_absence" && (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-3 text-sm font-semibold text-slate-800">Illness / absence</div>
            <Field label="From"><input type="date" className="inp" value={(form.absenceFromDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, absenceFromDate: e.target.value })} /></Field>
            <Field label="To"><input type="date" className="inp" value={(form.absenceToDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, absenceToDate: e.target.value })} /></Field>
            <Field label="Diagnosis"><input className="inp" value={form.diagnosis || ""} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></Field>
          </div>
        )}

        {kind === "radiation_monitoring" && (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-3 text-sm font-semibold text-slate-800">Radiation monitoring</div>
            <Field label="TLD badge #"><input className="inp" value={form.tldBadgeNumber || ""} onChange={(e) => setForm({ ...form, tldBadgeNumber: e.target.value })} /></Field>
            <Field label="Cumulative dose (mSv)"><input type="number" step="0.01" className="inp" value={form.cumulativeDoseMsv ?? ""} onChange={(e) => setForm({ ...form, cumulativeDoseMsv: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-4 text-sm font-semibold text-slate-800">Vitals</div>
          <Field label="BP sys"><input type="number" className="inp" value={form.bpSystolic ?? ""} onChange={(e) => setForm({ ...form, bpSystolic: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="BP dia"><input type="number" className="inp" value={form.bpDiastolic ?? ""} onChange={(e) => setForm({ ...form, bpDiastolic: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Pulse"><input type="number" className="inp" value={form.pulse ?? ""} onChange={(e) => setForm({ ...form, pulse: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Temp °C"><input type="number" step="0.1" className="inp" value={form.temperatureC ?? ""} onChange={(e) => setForm({ ...form, temperatureC: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="SpO₂ %"><input type="number" className="inp" value={form.spo2 ?? ""} onChange={(e) => setForm({ ...form, spo2: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Weight kg"><input type="number" step="0.1" className="inp" value={form.weight ?? ""} onChange={(e) => setForm({ ...form, weight: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Height cm"><input type="number" step="0.1" className="inp" value={form.height ?? ""} onChange={(e) => setForm({ ...form, height: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="BMI"><input type="number" step="0.1" className="inp" value={form.bmi ?? ""} onChange={(e) => setForm({ ...form, bmi: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Test results" full><textarea className="inp" rows={2} value={form.testResults || ""} onChange={(e) => setForm({ ...form, testResults: e.target.value })} /></Field>
          <Field label="Follow-up date"><input type="date" className="inp" value={(form.followUpDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} /></Field>
          <Field label="Referred to"><input className="inp" value={form.referredTo || ""} onChange={(e) => setForm({ ...form, referredTo: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.confidential} onChange={(e) => setForm({ ...form, confidential: e.target.checked })} /> Confidential</label>
          <Field label="Notes" full><textarea className="inp" rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>

        {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" | "green" }) {
  const map: Record<string, { grad: string; ring: string; text: string; dot: string }> = {
    slate: { grad: "from-slate-50 to-gray-50", ring: "ring-slate-200", text: "text-slate-700", dot: "bg-slate-400" },
    amber: { grad: "from-amber-50 to-yellow-50", ring: "ring-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    rose: { grad: "from-rose-50 to-red-50", ring: "ring-rose-200", text: "text-rose-700", dot: "bg-rose-500" },
    emerald: { grad: "from-emerald-50 to-teal-50", ring: "ring-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
    green: { grad: "from-green-50 to-lime-50", ring: "ring-green-200", text: "text-green-700", dot: "bg-green-500" },
    indigo: { grad: "from-indigo-50 to-blue-50", ring: "ring-indigo-200", text: "text-indigo-700", dot: "bg-indigo-500" },
  };
  const t = map[tone];
  return (
    <div className={`rounded-xl bg-gradient-to-br ${t.grad} p-4 ring-1 ${t.ring} shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
      <div className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} /><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</div></div>
      <div className={`mt-1 text-2xl font-bold ${t.text}`}>{value}</div>
    </div>
  );
}
function Pill({ status, children }: { status: string; children: React.ReactNode }) {
  const map: Record<string, { pill: string; dot: string }> = {
    active: { pill: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
    on_leave: { pill: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
    terminated: { pill: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
    retired: { pill: "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
    fit: { pill: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
    fit_with_restrictions: { pill: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
    temporarily_unfit: { pill: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
    permanently_unfit: { pill: "bg-gradient-to-r from-rose-100 to-red-100 text-rose-800 ring-rose-300", dot: "bg-rose-600" },
    pending: { pill: "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
    draft: { pill: "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
    open: { pill: "bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 ring-indigo-200", dot: "bg-indigo-500" },
    follow_up: { pill: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
    closed: { pill: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
    referred: { pill: "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 ring-indigo-200", dot: "bg-indigo-500" },
  };
  const t = map[status] || { pill: "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 ring-slate-200", dot: "bg-slate-400" };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${t.pill}`}><span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />{children}</span>;
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <label className={`block ${full ? "md:col-span-3" : ""}`}><div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>{children}</label>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-16 text-center text-sm text-gray-400">{children}</div>;
}
