"use client";

import { useEffect, useState } from "react";
import type {
  OrthoCase, FractureRecord, CaseType, CaseStatus, Region, BodySide,
  FractureType, FractureStatus, ImmobilizationType,
} from "@/lib/hospital/ortho-store";
// Inlined from ortho-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const CASE_TYPE_LABEL: Record<CaseType, string> = {
  trauma: "Trauma", degenerative: "Degenerative", inflammatory: "Inflammatory",
  sports: "Sports", pediatric: "Pediatric", spine: "Spine", post_op: "Post-op", other: "Other",
};
const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  open: "Open", in_treatment: "In treatment", post_op: "Post-op", rehab: "Rehab", closed: "Closed", referred: "Referred",
};
const REGION_LABEL: Record<Region, string> = {
  cervical: "Cervical", thoracic: "Thoracic", lumbar: "Lumbar",
  shoulder: "Shoulder", elbow: "Elbow", wrist_hand: "Wrist/hand",
  hip: "Hip", knee: "Knee", ankle_foot: "Ankle/foot", pelvis: "Pelvis", other: "Other",
};
const FX_TYPE_LABEL: Record<FractureType, string> = {
  closed: "Closed", open: "Open", comminuted: "Comminuted", greenstick: "Greenstick",
  spiral: "Spiral", transverse: "Transverse", oblique: "Oblique", impacted: "Impacted",
  pathological: "Pathological", stress: "Stress",
};
const FX_STATUS_LABEL: Record<FractureStatus, string> = {
  acute: "Acute", reduced: "Reduced", immobilized: "Immobilized", post_op: "Post-op",
  healing: "Healing", healed: "Healed", nonunion: "Nonunion", malunion: "Malunion",
};
const IMMOB_LABEL: Record<ImmobilizationType, string> = {
  cast: "Cast", splint: "Splint", brace: "Brace", sling: "Sling", traction: "Traction",
  external_fixator: "External fixator", internal_fixation: "Internal fixation", none: "None",
};
const SIDE_LABEL: Record<BodySide, string> = {
  left: "Left", right: "Right", bilateral: "Bilateral", midline: "Midline", na: "N/A",
};

interface Patient { id: string; firstName: string; lastName: string; }

const CASE_TYPES: CaseType[] = ["trauma", "degenerative", "inflammatory", "sports", "pediatric", "spine", "post_op", "other"];
const CASE_STATUSES: CaseStatus[] = ["open", "in_treatment", "post_op", "rehab", "closed", "referred"];
const REGIONS: Region[] = ["cervical", "thoracic", "lumbar", "shoulder", "elbow", "wrist_hand", "hip", "knee", "ankle_foot", "pelvis", "other"];
const SIDES: BodySide[] = ["left", "right", "bilateral", "midline", "na"];
const FX_TYPES: FractureType[] = ["closed", "open", "comminuted", "greenstick", "spiral", "transverse", "oblique", "impacted", "pathological", "stress"];
const FX_STATUSES: FractureStatus[] = ["acute", "reduced", "immobilized", "post_op", "healing", "healed", "nonunion", "malunion"];
const IMMOBS: ImmobilizationType[] = ["cast", "splint", "brace", "sling", "traction", "external_fixator", "internal_fixation", "none"];

export default function OrthoPage() {
  const [tab, setTab] = useState<"cases" | "fractures">("cases");
  const [cases, setCases] = useState<OrthoCase[]>([]);
  const [fractures, setFractures] = useState<FractureRecord[]>([]);
  const [stats, setStats] = useState<{ openCases: number; inTreatment: number; postOp: number; rehab: number; newCasesWeek: number; acuteFractures: number; openFractures: number; nonunion: number; healedMonth: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showCase, setShowCase] = useState(false);
  const [showFx, setShowFx] = useState(false);
  const [editCase, setEditCase] = useState<OrthoCase | null>(null);
  const [editFx, setEditFx] = useState<FractureRecord | null>(null);

  async function load() {
    const res = await fetch("/api/hospital/orthopedics", { cache: "no-store" });
    const data = await res.json();
    setCases(data.cases || []);
    setFractures(data.fractures || []);
    setStats(data.stats || null);
  }
  async function loadPatients() {
    try {
      const res = await fetch("/api/patients", { cache: "no-store" });
      const data = await res.json();
      setPatients(data.patients || []);
    } catch {}
  }
  useEffect(() => { load(); loadPatients(); }, []);

  async function removeCase(id: string) {
    if (!confirm("Delete case?")) return;
    await fetch("/api/hospital/orthopedics", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }
  async function removeFx(id: string) {
    if (!confirm("Delete fracture?")) return;
    await fetch("/api/hospital/orthopedics", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, kind: "fracture" }) });
    load();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orthopedics</h1>
          <p className="text-sm text-slate-500">Cases, exam, ROM, imaging, fracture tracking (AO / Gustilo)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditCase(null); setShowCase(true); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Case</button>
          <button onClick={() => { setEditFx(null); setShowFx(true); }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Fracture</button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5 lg:grid-cols-9">
          <StatTile label="Open cases" value={stats.openCases} tone="amber" />
          <StatTile label="In treatment" value={stats.inTreatment} tone="slate" />
          <StatTile label="Post-op" value={stats.postOp} tone="indigo" />
          <StatTile label="Rehab" value={stats.rehab} tone="indigo" />
          <StatTile label="New / week" value={stats.newCasesWeek} tone="slate" />
          <StatTile label="Acute Fx" value={stats.acuteFractures} tone="amber" />
          <StatTile label="Open Fx" value={stats.openFractures} tone="rose" />
          <StatTile label="Nonunion" value={stats.nonunion} tone="rose" />
          <StatTile label="Healed / month" value={stats.healedMonth} tone="emerald" />
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 border-b border-slate-200">
        <TabBtn active={tab === "cases"} onClick={() => setTab("cases")}>Cases ({cases.length})</TabBtn>
        <TabBtn active={tab === "fractures"} onClick={() => setTab("fractures")}>Fractures ({fractures.length})</TabBtn>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {tab === "cases" ? (
          cases.length === 0 ? <Empty label="No cases." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Region / Side</th>
                    <th className="px-4 py-3">Pain</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.id}</td>
                      <td className="px-4 py-3 font-medium">{c.patientName}</td>
                      <td className="px-4 py-3">{c.providerName}</td>
                      <td className="px-4 py-3">{CASE_TYPE_LABEL[c.caseType]}</td>
                      <td className="px-4 py-3">{REGION_LABEL[c.region]} · {SIDE_LABEL[c.side]}</td>
                      <td className="px-4 py-3">{c.painScoreNrs != null ? `${c.painScoreNrs}/10` : "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(c.visitDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><Pill tone={c.status === "closed" ? "slate" : c.status === "rehab" ? "indigo" : c.status === "post_op" ? "indigo" : c.status === "referred" ? "slate" : "amber"}>{CASE_STATUS_LABEL[c.status]}</Pill></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setEditCase(c); setShowCase(true); }} className="text-xs font-semibold text-primary-600 hover:underline">Edit</button>
                        <button onClick={() => removeCase(c.id)} className="ml-3 text-xs font-semibold text-rose-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : fractures.length === 0 ? <Empty label="No fractures." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Bone / Side</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">AO / Gustilo</th>
                  <th className="px-4 py-3">Immob.</th>
                  <th className="px-4 py-3">Diagnosed</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {fractures.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{f.id}</td>
                    <td className="px-4 py-3 font-medium">{f.patientName}</td>
                    <td className="px-4 py-3">{f.bone} · {SIDE_LABEL[f.side]}</td>
                    <td className="px-4 py-3">{FX_TYPE_LABEL[f.fractureType]}</td>
                    <td className="px-4 py-3 text-xs">{f.aoClassification || "-"}{f.gustiloGrade ? ` / ${f.gustiloGrade}` : ""}</td>
                    <td className="px-4 py-3">{IMMOB_LABEL[f.immobilization]}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(f.diagnosedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><Pill tone={f.status === "healed" ? "emerald" : f.status === "nonunion" || f.status === "malunion" ? "rose" : "amber"}>{FX_STATUS_LABEL[f.status]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditFx(f); setShowFx(true); }} className="text-xs font-semibold text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => removeFx(f.id)} className="ml-3 text-xs font-semibold text-rose-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCase && <CaseModal patients={patients} editing={editCase} onClose={() => setShowCase(false)} onSaved={() => { setShowCase(false); load(); }} />}
      {showFx && <FxModal patients={patients} editing={editFx} onClose={() => setShowFx(false)} onSaved={() => { setShowFx(false); load(); }} />}
    </div>
  );
}

function CaseModal({ patients, editing, onClose, onSaved }: { patients: Patient[]; editing: OrthoCase | null; onClose: () => void; onSaved: () => void; }) {
  const [patientId, setPatientId] = useState(editing?.patientId || "");
  const [providerName, setProviderName] = useState(editing?.providerName || "");
  const [caseType, setCaseType] = useState<CaseType>(editing?.caseType || "trauma");
  const [status, setStatus] = useState<CaseStatus>(editing?.status || "open");
  const [region, setRegion] = useState<Region>(editing?.region || "other");
  const [side, setSide] = useState<BodySide>(editing?.side || "na");
  const [visitDate, setVisitDate] = useState(editing?.visitDate?.slice(0, 16) || new Date().toISOString().slice(0, 16));
  const [chiefComplaint, setChiefComplaint] = useState(editing?.chiefComplaint || "");
  const [mechanism, setMechanism] = useState(editing?.mechanism || "");
  const [historyNote, setHistoryNote] = useState(editing?.historyNote || "");
  const [inspection, setInspection] = useState(editing?.inspection || "");
  const [palpation, setPalpation] = useState(editing?.palpation || "");
  const [swellingDeformity, setSwellingDeformity] = useState(editing?.swellingDeformity || "");
  const [neurovascular, setNeurovascular] = useState(editing?.neurovascular || "");
  const [specialTests, setSpecialTests] = useState(editing?.specialTests || "");
  const [painScoreNrs, setPainScoreNrs] = useState<number | "">(editing?.painScoreNrs ?? "");
  const [weightBearing, setWeightBearing] = useState(editing?.weightBearing || "");
  const [gaitNote, setGaitNote] = useState(editing?.gaitNote || "");
  const [imagingModality, setImagingModality] = useState(editing?.imagingModality || "");
  const [imagingNote, setImagingNote] = useState(editing?.imagingNote || "");
  const [impression, setImpression] = useState(editing?.impression || "");
  const [plan, setPlan] = useState(editing?.plan || "");
  const [rehabPlan, setRehabPlan] = useState(editing?.rehabPlan || "");
  const [nextReviewDate, setNextReviewDate] = useState(editing?.nextReviewDate?.slice(0, 10) || "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!patientId || !providerName) return;
    const p = patients.find((x) => x.id === patientId);
    if (!p) return;
    setSaving(true);
    const payload = {
      id: editing?.id,
      patientId, patientName: `${p.firstName} ${p.lastName}`,
      providerName, caseType, status, region, side,
      visitDate: new Date(visitDate).toISOString(),
      chiefComplaint: chiefComplaint || undefined,
      mechanism: mechanism || undefined,
      historyNote: historyNote || undefined,
      inspection: inspection || undefined,
      palpation: palpation || undefined,
      swellingDeformity: swellingDeformity || undefined,
      neurovascular: neurovascular || undefined,
      specialTests: specialTests || undefined,
      painScoreNrs: painScoreNrs === "" ? undefined : Number(painScoreNrs),
      weightBearing: weightBearing || undefined,
      gaitNote: gaitNote || undefined,
      imagingModality: imagingModality || undefined,
      imagingNote: imagingNote || undefined,
      impression: impression || undefined,
      plan: plan || undefined,
      rehabPlan: rehabPlan || undefined,
      nextReviewDate: nextReviewDate ? new Date(nextReviewDate).toISOString() : undefined,
    };
    await fetch("/api/hospital/orthopedics", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 border-b border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">{editing ? "Edit case" : "New case"}</h2>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Patient">
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select...</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
              </select>
            </Field>
            <Field label="Provider"><input value={providerName} onChange={(e) => setProviderName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Visit date"><input type="datetime-local" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Case type">
              <select value={caseType} onChange={(e) => setCaseType(e.target.value as CaseType)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {CASE_TYPES.map((v) => <option key={v} value={v}>{CASE_TYPE_LABEL[v]}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as CaseStatus)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {CASE_STATUSES.map((v) => <option key={v} value={v}>{CASE_STATUS_LABEL[v]}</option>)}
              </select>
            </Field>
            <Field label="Region">
              <select value={region} onChange={(e) => setRegion(e.target.value as Region)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {REGIONS.map((v) => <option key={v} value={v}>{REGION_LABEL[v]}</option>)}
              </select>
            </Field>
            <Field label="Side">
              <select value={side} onChange={(e) => setSide(e.target.value as BodySide)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {SIDES.map((v) => <option key={v} value={v}>{SIDE_LABEL[v]}</option>)}
              </select>
            </Field>
            <Field label="Pain NRS (0-10)"><input type="number" min={0} max={10} value={painScoreNrs} onChange={(e) => setPainScoreNrs(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Weight-bearing (NWB/PWB/FWB)"><input value={weightBearing} onChange={(e) => setWeightBearing(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>

          <Field label="Chief complaint"><input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Mechanism of injury"><input value={mechanism} onChange={(e) => setMechanism(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="History"><input value={historyNote} onChange={(e) => setHistoryNote(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-600">Clinical exam</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Inspection"><input value={inspection} onChange={(e) => setInspection(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Field>
              <Field label="Palpation"><input value={palpation} onChange={(e) => setPalpation(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Field>
              <Field label="Swelling / deformity"><input value={swellingDeformity} onChange={(e) => setSwellingDeformity(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Field>
              <Field label="Neurovascular (pulses/sensation/motor)"><input value={neurovascular} onChange={(e) => setNeurovascular(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Field>
              <Field label="Special tests (Lachman, McMurray...)"><input value={specialTests} onChange={(e) => setSpecialTests(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Field>
              <Field label="Gait"><input value={gaitNote} onChange={(e) => setGaitNote(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Field>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Imaging modality (X-ray/MRI/CT/US)"><input value={imagingModality} onChange={(e) => setImagingModality(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Imaging note"><input value={imagingNote} onChange={(e) => setImagingNote(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>
          <Field label="Impression / diagnosis"><textarea value={impression} onChange={(e) => setImpression(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="Plan"><textarea value={plan} onChange={(e) => setPlan(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="Rehab plan"><textarea value={rehabPlan} onChange={(e) => setRehabPlan(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="Next review"><input type="date" value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={submit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function FxModal({ patients, editing, onClose, onSaved }: { patients: Patient[]; editing: FractureRecord | null; onClose: () => void; onSaved: () => void; }) {
  const [patientId, setPatientId] = useState(editing?.patientId || "");
  const [providerName, setProviderName] = useState(editing?.providerName || "");
  const [bone, setBone] = useState(editing?.bone || "");
  const [side, setSide] = useState<BodySide>(editing?.side || "na");
  const [fractureType, setFractureType] = useState<FractureType>(editing?.fractureType || "closed");
  const [status, setStatus] = useState<FractureStatus>(editing?.status || "acute");
  const [aoClassification, setAo] = useState(editing?.aoClassification || "");
  const [gustiloGrade, setGustilo] = useState(editing?.gustiloGrade || "");
  const [reductionMethod, setReduction] = useState(editing?.reductionMethod || "");
  const [immobilization, setImmob] = useState<ImmobilizationType>(editing?.immobilization || "cast");
  const [diagnosedAt, setDiagnosedAt] = useState(editing?.diagnosedAt?.slice(0, 16) || new Date().toISOString().slice(0, 16));
  const [castRemovalDate, setCastRemoval] = useState(editing?.castRemovalDate?.slice(0, 10) || "");
  const [unionExpectedDate, setUnionExpected] = useState(editing?.unionExpectedDate?.slice(0, 10) || "");
  const [complications, setComplications] = useState(editing?.complications || "");
  const [notes, setNotes] = useState(editing?.notes || "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!patientId || !providerName || !bone) return;
    const p = patients.find((x) => x.id === patientId);
    if (!p) return;
    setSaving(true);
    const payload = {
      kind: "fracture",
      id: editing?.id,
      patientId, patientName: `${p.firstName} ${p.lastName}`,
      providerName, bone, side, fractureType, status,
      aoClassification: aoClassification || undefined,
      gustiloGrade: gustiloGrade || undefined,
      reductionMethod: reductionMethod || undefined,
      immobilization,
      diagnosedAt: new Date(diagnosedAt).toISOString(),
      castRemovalDate: castRemovalDate ? new Date(castRemovalDate).toISOString() : undefined,
      unionExpectedDate: unionExpectedDate ? new Date(unionExpectedDate).toISOString() : undefined,
      complications: complications || undefined,
      notes: notes || undefined,
    };
    await fetch("/api/hospital/orthopedics", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 border-b border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">{editing ? "Edit fracture" : "New fracture"}</h2>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Patient">
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select...</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
              </select>
            </Field>
            <Field label="Provider"><input value={providerName} onChange={(e) => setProviderName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Diagnosed at"><input type="datetime-local" value={diagnosedAt} onChange={(e) => setDiagnosedAt(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Bone"><input value={bone} onChange={(e) => setBone(e.target.value)} placeholder="e.g. distal radius" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Side">
              <select value={side} onChange={(e) => setSide(e.target.value as BodySide)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {SIDES.map((v) => <option key={v} value={v}>{SIDE_LABEL[v]}</option>)}
              </select>
            </Field>
            <Field label="Fracture type">
              <select value={fractureType} onChange={(e) => setFractureType(e.target.value as FractureType)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {FX_TYPES.map((v) => <option key={v} value={v}>{FX_TYPE_LABEL[v]}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as FractureStatus)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {FX_STATUSES.map((v) => <option key={v} value={v}>{FX_STATUS_LABEL[v]}</option>)}
              </select>
            </Field>
            <Field label="AO/OTA (e.g. 23-A2)"><input value={aoClassification} onChange={(e) => setAo(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Gustilo (for open)"><input value={gustiloGrade} onChange={(e) => setGustilo(e.target.value)} placeholder="I / II / IIIA / IIIB / IIIC" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Reduction method"><input value={reductionMethod} onChange={(e) => setReduction(e.target.value)} placeholder="closed / ORIF / MIPO" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Immobilization">
              <select value={immobilization} onChange={(e) => setImmob(e.target.value as ImmobilizationType)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {IMMOBS.map((v) => <option key={v} value={v}>{IMMOB_LABEL[v]}</option>)}
              </select>
            </Field>
            <Field label="Cast removal date"><input type="date" value={castRemovalDate} onChange={(e) => setCastRemoval(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Union expected"><input type="date" value={unionExpectedDate} onChange={(e) => setUnionExpected(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>
          <Field label="Complications"><input value={complications} onChange={(e) => setComplications(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={submit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" }) {
  const map: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  };
  return (
    <div className={`rounded-lg p-3 ring-1 ${map[tone]}`}>
      <div className="text-xs">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode; }) {
  return <button onClick={onClick} className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${active ? "border-primary-600 text-primary-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{children}</button>;
}
function Pill({ tone, children }: { tone: "slate" | "amber" | "emerald" | "rose" | "indigo"; children: React.ReactNode; }) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    indigo: "bg-indigo-100 text-indigo-700",
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${map[tone]}`}>{children}</span>;
}
function Field({ label, children }: { label: string; children: React.ReactNode; }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>{children}</label>;
}
function Empty({ label }: { label: string }) {
  return <div className="p-8 text-center text-sm text-slate-500">{label}</div>;
}
