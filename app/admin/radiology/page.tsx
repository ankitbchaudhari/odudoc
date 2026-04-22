"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  RadiologyOrder,
  Modality,
  RadiologyStatus,
  RadiologyPriority,
} from "@/lib/hospital/radiology-store";
import type { Patient } from "@/lib/patients-store";

const MODALITIES: Modality[] = [
  "xray",
  "ct",
  "mri",
  "ultrasound",
  "mammography",
  "fluoroscopy",
  "nuclear",
  "pet",
  "dexa",
  "other",
];
const STATUSES: RadiologyStatus[] = [
  "ordered",
  "scheduled",
  "in_progress",
  "completed",
  "reported",
  "cancelled",
];
const PRIORITIES: RadiologyPriority[] = ["routine", "urgent", "stat"];

const STATUS_COLOR: Record<RadiologyStatus, string> = {
  ordered: "bg-blue-100 text-blue-700",
  scheduled: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-teal-100 text-teal-700",
  reported: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-200 text-slate-600",
};

const PRIORITY_COLOR: Record<RadiologyPriority, string> = {
  routine: "bg-slate-100 text-slate-600",
  urgent: "bg-amber-100 text-amber-700",
  stat: "bg-red-100 text-red-700",
};

const COMMON_STUDIES: Array<{
  modality: Modality;
  studyName: string;
  views?: string[];
}> = [
  { modality: "xray", studyName: "Chest X-ray", views: ["PA", "Lateral"] },
  { modality: "xray", studyName: "Abdomen X-ray (erect + supine)", views: ["Erect", "Supine"] },
  { modality: "ct", studyName: "CT Head (plain)" },
  { modality: "ct", studyName: "CT Chest + Abdomen (contrast)" },
  { modality: "mri", studyName: "MRI Brain" },
  { modality: "mri", studyName: "MRI Lumbar Spine" },
  { modality: "ultrasound", studyName: "USG Abdomen & Pelvis" },
  { modality: "ultrasound", studyName: "Obstetric USG" },
  { modality: "mammography", studyName: "Bilateral Mammography" },
];

interface OrderForm {
  patientId: string;
  modality: Modality;
  studyName: string;
  bodyPart: string;
  views: string; // comma-separated
  contrast: boolean;
  contrastAgent: string;
  clinicalIndication: string;
  priority: RadiologyPriority;
  orderedBy: string;
}

const EMPTY_FORM: OrderForm = {
  patientId: "",
  modality: "xray",
  studyName: "",
  bodyPart: "",
  views: "",
  contrast: false,
  contrastAgent: "",
  clinicalIndication: "",
  priority: "routine",
  orderedBy: "",
};

interface ReportDraft {
  technique: string;
  findings: string;
  impression: string;
  radiologist: string;
  criticalFlag: boolean;
  imageUrl: string;
  imageLabel: string;
}

const EMPTY_REPORT: ReportDraft = {
  technique: "",
  findings: "",
  impression: "",
  radiologist: "",
  criticalFlag: false,
  imageUrl: "",
  imageLabel: "",
};

export default function RadiologyPage() {
  const [orders, setOrders] = useState<RadiologyOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterModality, setFilterModality] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OrderForm>(EMPTY_FORM);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ReportDraft>>({});

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams();
      if (filterStatus) q.set("status", filterStatus);
      if (filterModality) q.set("modality", filterModality);
      if (filterPriority) q.set("priority", filterPriority);
      const [oRes, pRes] = await Promise.all([
        fetch(`/api/hospital/radiology?${q.toString()}`, { cache: "no-store" }),
        fetch("/api/patients", { cache: "no-store" }),
      ]);
      const o = await oRes.json();
      const p = await pRes.json();
      if (!oRes.ok) throw new Error(o.error || "load_failed");
      setOrders(o.orders || []);
      setPatients(p.patients || []);
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patientMap = useMemo(() => {
    const m = new Map<string, Patient>();
    patients.forEach((p) => m.set(p.id, p));
    return m;
  }, [patients]);

  function reset() {
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  function pickCommon(s: (typeof COMMON_STUDIES)[number]) {
    setForm({
      ...form,
      modality: s.modality,
      studyName: s.studyName,
      views: (s.views || []).join(", "),
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      patientId: form.patientId,
      modality: form.modality,
      studyName: form.studyName.trim(),
      bodyPart: form.bodyPart.trim() || undefined,
      views: form.views
        ? form.views.split(",").map((v) => v.trim()).filter(Boolean)
        : undefined,
      contrast: form.contrast,
      contrastAgent: form.contrastAgent.trim() || undefined,
      clinicalIndication: form.clinicalIndication.trim() || undefined,
      priority: form.priority,
      orderedBy: form.orderedBy.trim() || undefined,
    };
    const res = await fetch("/api/hospital/radiology", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    reset();
    load();
  }

  async function setStatus(id: string, status: RadiologyStatus) {
    const res = await fetch("/api/hospital/radiology", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this order?")) return;
    const res = await fetch("/api/hospital/radiology", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  function draftFor(o: RadiologyOrder): ReportDraft {
    return (
      drafts[o.id] || {
        technique: o.technique || "",
        findings: o.findings || "",
        impression: o.impression || "",
        radiologist: o.radiologist || "",
        criticalFlag: !!o.criticalFlag,
        imageUrl: "",
        imageLabel: "",
      }
    );
  }

  function setDraft(id: string, patch: Partial<ReportDraft>) {
    setDrafts((d) => ({ ...d, [id]: { ...draftFor(orders.find((o) => o.id === id)!), ...patch } }));
  }

  async function saveReport(o: RadiologyOrder) {
    const d = draftFor(o);
    const payload: Record<string, unknown> = {
      id: o.id,
      technique: d.technique,
      findings: d.findings,
      impression: d.impression,
      radiologist: d.radiologist,
      criticalFlag: d.criticalFlag,
    };
    const res = await fetch("/api/hospital/radiology", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setDrafts((dd) => ({ ...dd, [o.id]: { ...d, imageUrl: "", imageLabel: "" } }));
      load();
    }
  }

  async function addImage(o: RadiologyOrder) {
    const d = draftFor(o);
    if (!d.imageUrl.trim()) return;
    const res = await fetch("/api/hospital/radiology", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: o.id,
        addImage: { url: d.imageUrl, label: d.imageLabel || undefined },
      }),
    });
    if (res.ok) {
      setDrafts((dd) => ({ ...dd, [o.id]: { ...d, imageUrl: "", imageLabel: "" } }));
      load();
    }
  }

  async function removeImage(o: RadiologyOrder, url: string) {
    const res = await fetch("/api/hospital/radiology", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: o.id, removeImageUrl: url }),
    });
    if (res.ok) load();
  }

  const statCounts = useMemo(() => {
    const c: Record<RadiologyStatus, number> = {
      ordered: 0,
      scheduled: 0,
      in_progress: 0,
      completed: 0,
      reported: 0,
      cancelled: 0,
    };
    orders.forEach((o) => (c[o.status] += 1));
    return c;
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Radiology</h2>
          <p className="text-sm text-slate-500">
            Imaging orders across modalities. Authoring an impression
            auto-advances status to <code className="rounded bg-slate-100 px-1">reported</code>.
          </p>
        </div>
        <button
          onClick={() => (showForm ? reset() : setShowForm(true))}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          {showForm ? "Close" : "+ New order"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {([
          ["ordered", "Ordered"],
          ["in_progress", "In progress"],
          ["completed", "Completed"],
          ["reported", "Reported"],
          ["cancelled", "Cancelled"],
        ] as const).map(([k, lbl]) => (
          <div key={k} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">{lbl}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{statCounts[k]}</div>
          </div>
        ))}
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      )}

      {showForm && (
        <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">New radiology order</h3>

          <div className="flex flex-wrap gap-2">
            {COMMON_STUDIES.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pickCommon(s)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                {s.studyName}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Patient*">
              <select required value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} className="input">
                <option value="">— select —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            </Field>
            <Field label="Modality*">
              <select value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value as Modality })} className="input">
                {MODALITIES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as RadiologyPriority })} className="input">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Study name*">
              <input required value={form.studyName} onChange={(e) => setForm({ ...form, studyName: e.target.value })} className="input" />
            </Field>
            <Field label="Body part">
              <input value={form.bodyPart} onChange={(e) => setForm({ ...form, bodyPart: e.target.value })} className="input" />
            </Field>
            <Field label="Views (comma-separated)">
              <input value={form.views} onChange={(e) => setForm({ ...form, views: e.target.value })} className="input" placeholder="PA, Lateral" />
            </Field>
            <Field label="Ordered by">
              <input value={form.orderedBy} onChange={(e) => setForm({ ...form, orderedBy: e.target.value })} className="input" placeholder="Dr. …" />
            </Field>
            <label className="flex items-end gap-2 pb-1 text-sm">
              <input type="checkbox" checked={form.contrast} onChange={(e) => setForm({ ...form, contrast: e.target.checked })} />
              Contrast
            </label>
            {form.contrast && (
              <Field label="Contrast agent">
                <input value={form.contrastAgent} onChange={(e) => setForm({ ...form, contrastAgent: e.target.value })} className="input" placeholder="Iohexol / Gadolinium" />
              </Field>
            )}
            <div className="md:col-span-3">
              <Field label="Clinical indication">
                <textarea value={form.clinicalIndication} onChange={(e) => setForm({ ...form, clinicalIndication: e.target.value })} className="input min-h-[50px]" />
              </Field>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white">Create order</button>
            <button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <Field label="Status">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input">
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Modality">
          <select value={filterModality} onChange={(e) => setFilterModality(e.target.value)} className="input">
            <option value="">All</option>
            {MODALITIES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="input">
            <option value="">All</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <button onClick={load} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white">Apply</button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Ordered</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Study</th>
              <th className="px-4 py-3">Modality</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No orders.</td></tr>
            ) : (
              orders.map((o) => {
                const p = patientMap.get(o.patientId);
                const isOpen = expanded === o.id;
                const d = draftFor(o);
                return (
                  <>
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(o.orderedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {p ? `${p.firstName} ${p.lastName}` : o.patientId}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{o.studyName}</div>
                        {o.bodyPart && <div className="text-[11px] text-slate-500">{o.bodyPart}</div>}
                        {o.contrast && <div className="text-[11px] text-indigo-600">+ contrast {o.contrastAgent ? `(${o.contrastAgent})` : ""}</div>}
                        {o.criticalFlag && <div className="text-[11px] font-semibold text-red-700">⚠ CRITICAL</div>}
                      </td>
                      <td className="px-4 py-3 uppercase">{o.modality}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLOR[o.priority]}`}>{o.priority}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={o.status}
                          onChange={(e) => setStatus(o.id, e.target.value as RadiologyStatus)}
                          className={`rounded-full border-0 px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[o.status]}`}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button onClick={() => setExpanded(isOpen ? null : o.id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
                            {isOpen ? "Hide" : "Report"}
                          </button>
                          <button onClick={() => remove(o.id)} className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50">Del</button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={o.id + "-d"} className="bg-slate-50/50">
                        <td colSpan={7} className="px-4 py-4 space-y-3">
                          {o.clinicalIndication && (
                            <div className="text-xs text-slate-600">
                              <b>Indication:</b> {o.clinicalIndication}
                            </div>
                          )}
                          {o.views && o.views.length > 0 && (
                            <div className="text-xs text-slate-600">
                              <b>Views:</b> {o.views.join(", ")}
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Field label="Technique">
                              <textarea value={d.technique} onChange={(e) => setDraft(o.id, { technique: e.target.value })} className="input min-h-[50px]" />
                            </Field>
                            <Field label="Radiologist">
                              <input value={d.radiologist} onChange={(e) => setDraft(o.id, { radiologist: e.target.value })} className="input" />
                            </Field>
                            <div className="md:col-span-2">
                              <Field label="Findings">
                                <textarea value={d.findings} onChange={(e) => setDraft(o.id, { findings: e.target.value })} className="input min-h-[80px]" />
                              </Field>
                            </div>
                            <div className="md:col-span-2">
                              <Field label="Impression (authoring this auto-advances to reported)">
                                <textarea value={d.impression} onChange={(e) => setDraft(o.id, { impression: e.target.value })} className="input min-h-[60px]" />
                              </Field>
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={d.criticalFlag} onChange={(e) => setDraft(o.id, { criticalFlag: e.target.checked })} />
                              Critical finding (call-back required)
                            </label>
                          </div>

                          <button onClick={() => saveReport(o)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white">
                            Save report
                          </button>

                          <div className="border-t border-slate-200 pt-3">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">Images / PACS links</div>
                            {o.images.length === 0 ? (
                              <div className="text-xs text-slate-500">No images attached.</div>
                            ) : (
                              <ul className="space-y-1 text-xs">
                                {o.images.map((im) => (
                                  <li key={im.url} className="flex items-center gap-2">
                                    <a href={im.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                                      {im.label || im.url}
                                    </a>
                                    <button onClick={() => removeImage(o, im.url)} className="text-red-500 hover:text-red-700" title="Remove">×</button>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="mt-2 flex gap-2">
                              <input
                                value={d.imageUrl}
                                onChange={(e) => setDraft(o.id, { imageUrl: e.target.value })}
                                className="input flex-1"
                                placeholder="PACS / DICOM URL"
                              />
                              <input
                                value={d.imageLabel}
                                onChange={(e) => setDraft(o.id, { imageLabel: e.target.value })}
                                className="input w-40"
                                placeholder="Label (optional)"
                              />
                              <button onClick={() => addImage(o)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white">Add</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          background: white;
          outline: none;
        }
        .input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
