"use client";

// EMR patient detail — demographics + SOAP visit timeline + inline
// new-visit form. The SOAP form below the timeline keeps the doctor in
// one place: typing a note shouldn't require navigating to another
// page and losing the patient's context.

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age: string;
  sex: string;
  phone: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Visit {
  id: string;
  visitDate: string;
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  vitals?: string;
  createdAt: string;
}

interface EmrFile {
  id: string;
  category: "lab" | "scan" | "report" | "other";
  label: string;
  originalName: string;
  url: string;
  size: number;
  contentType: string;
  createdAt: string;
}

interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Invoice {
  id: string;
  number: string;
  issueDate: string;
  dueDate?: string;
  lineItems: InvoiceLine[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "void";
  notes?: string;
  paidAt?: string;
  paymentMethod?: string;
  publicToken?: string;
  createdAt: string;
}

const EMPTY_VISIT = {
  visitDate: new Date().toISOString().slice(0, 10),
  chiefComplaint: "",
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
  vitals: "",
};

const EMPTY_INVOICE_FORM = {
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  taxRate: "",
  currency: "USD",
  notes: "",
  lineItems: [{ description: "Consultation", quantity: 1, unitPrice: 0 }],
};

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDemographics, setEditingDemographics] = useState(false);
  const [demoDraft, setDemoDraft] = useState<Partial<Patient>>({});
  const [savingDemo, setSavingDemo] = useState(false);
  const [visitForm, setVisitForm] = useState(EMPTY_VISIT);
  const [savingVisit, setSavingVisit] = useState(false);
  const [visitFormOpen, setVisitFormOpen] = useState(false);

  const [files, setFiles] = useState<EmrFile[]>([]);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadCategory, setUploadCategory] = useState<EmrFile["category"]>("lab");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE_FORM);
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, vRes, fRes, iRes] = await Promise.all([
        fetch(`/api/emr/patients/${id}`),
        fetch(`/api/emr/visits?patientId=${id}`),
        fetch(`/api/emr/files?patientId=${id}`),
        fetch(`/api/emr/invoices?patientId=${id}`),
      ]);
      if (!pRes.ok) {
        const data = await pRes.json().catch(() => ({}));
        throw new Error(data.error || "Could not load patient");
      }
      const pData = await pRes.json();
      setPatient(pData.patient);
      setDemoDraft(pData.patient);
      if (vRes.ok) {
        const vData = await vRes.json();
        setVisits(vData.visits || []);
      }
      if (fRes.ok) {
        const fData = await fRes.json();
        setFiles(fData.files || []);
      }
      if (iRes.ok) {
        const iData = await iRes.json();
        setInvoices(iData.invoices || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  async function uploadEmrFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("patientId", id);
      fd.append("file", file);
      fd.append("label", uploadLabel || file.name);
      fd.append("category", uploadCategory);
      const res = await fetch("/api/emr/files", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setFiles((prev) => [data.file, ...prev]);
      setUploadLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deleteEmrFile(fileId: string) {
    if (!confirm("Delete this file? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/emr/files?id=${fileId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function saveInvoice(e: React.FormEvent) {
    e.preventDefault();
    setSavingInvoice(true);
    setError(null);
    try {
      const cleanLines = invoiceForm.lineItems
        .map((li) => ({
          description: li.description.trim(),
          quantity: Number(li.quantity) || 0,
          unitPrice: Number(li.unitPrice) || 0,
        }))
        .filter((li) => li.description && li.quantity > 0);
      if (cleanLines.length === 0) {
        setError("Add at least one line item with a description and quantity.");
        setSavingInvoice(false);
        return;
      }
      const res = await fetch("/api/emr/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientId: id,
          issueDate: invoiceForm.issueDate,
          dueDate: invoiceForm.dueDate || undefined,
          taxRate: invoiceForm.taxRate ? Number(invoiceForm.taxRate) : undefined,
          currency: invoiceForm.currency,
          notes: invoiceForm.notes || undefined,
          lineItems: cleanLines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setInvoices((prev) => [data.invoice, ...prev]);
      setInvoiceForm(EMPTY_INVOICE_FORM);
      setInvoiceFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingInvoice(false);
    }
  }

  async function setInvoiceStatus(invId: string, status: Invoice["status"]) {
    try {
      const res = await fetch(`/api/emr/invoices/${invId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setInvoices((prev) => prev.map((i) => (i.id === invId ? data.invoice : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  function downloadFhir() {
    window.open(`/api/emr/patients/${id}/fhir`, "_blank");
  }

  function downloadHl7() {
    window.open(`/api/emr/patients/${id}/hl7`, "_blank");
  }

  async function copyPaymentLink(inv: Invoice) {
    let token = inv.publicToken;
    // Lazy-generate for legacy invoices created before publicToken
    // existed on the schema. The user gets a single click that
    // "just works" instead of seeing a different button label.
    if (!token) {
      try {
        const res = await fetch(`/api/emr/invoices/${inv.id}/payment-link`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not create link");
        token = data.invoice.publicToken;
        // Reflect the freshly-tokened row in local state so further
        // clicks skip the generation roundtrip.
        setInvoices((prev) =>
          prev.map((i) => (i.id === inv.id ? data.invoice : i))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create link");
        return;
      }
    }
    if (!token) return;
    const url = `${window.location.origin}/pay/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setError(null);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // Fallback: just show the URL so the doctor can copy by hand.
      window.prompt("Copy this payment link:", url);
    }
  }

  async function rotatePaymentLink(inv: Invoice) {
    if (
      !confirm(
        "Rotate this invoice's payment link? Anyone who has the old URL will get a 'not found' error."
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/emr/invoices/${inv.id}/payment-link`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rotate failed");
      setInvoices((prev) =>
        prev.map((i) => (i.id === inv.id ? data.invoice : i))
      );
      // Auto-copy the freshly-rotated link as a convenience — the
      // doctor most likely wants to share the new URL right now.
      const url = `${window.location.origin}/pay/${data.invoice.publicToken}`;
      try {
        await navigator.clipboard.writeText(url);
        setCopiedToken(data.invoice.publicToken);
        setTimeout(() => setCopiedToken(null), 2000);
      } catch {
        window.prompt("New payment link:", url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rotate failed");
    }
  }

  function updateLine(idx: number, field: keyof InvoiceLine, value: string | number) {
    setInvoiceForm((p) => ({
      ...p,
      lineItems: p.lineItems.map((li, i) => (i === idx ? { ...li, [field]: value } : li)),
    }));
  }
  function addLine() {
    setInvoiceForm((p) => ({
      ...p,
      lineItems: [...p.lineItems, { description: "", quantity: 1, unitPrice: 0 }],
    }));
  }
  function removeLine(idx: number) {
    setInvoiceForm((p) => ({
      ...p,
      lineItems: p.lineItems.filter((_, i) => i !== idx),
    }));
  }
  const invoiceSubtotal = invoiceForm.lineItems.reduce(
    (s, li) => s + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0),
    0
  );
  const invoiceTax =
    invoiceForm.taxRate ? (invoiceSubtotal * Number(invoiceForm.taxRate)) / 100 : 0;
  const invoiceTotal = invoiceSubtotal + invoiceTax;

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function saveDemographics() {
    if (!patient) return;
    setSavingDemo(true);
    setError(null);
    try {
      const res = await fetch(`/api/emr/patients/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(demoDraft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setPatient(data.patient);
      setEditingDemographics(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingDemo(false);
    }
  }

  async function deletePatient() {
    if (!confirm("Delete this patient and all their visits? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/emr/patients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      window.location.href = "/dashboard/doctor/emr";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function saveVisit(e: React.FormEvent) {
    e.preventDefault();
    if (!visitForm.chiefComplaint.trim() || !visitForm.assessment.trim() || !visitForm.plan.trim()) {
      setError("Chief complaint, assessment and plan are required.");
      return;
    }
    setSavingVisit(true);
    setError(null);
    try {
      const res = await fetch("/api/emr/visits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId: id, ...visitForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setVisits((prev) => [data.visit, ...prev]);
      setVisitForm(EMPTY_VISIT);
      setVisitFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingVisit(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="mx-auto max-w-5xl px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-32 rounded-3xl bg-slate-200" />
            <div className="h-64 rounded-3xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white p-8 text-center shadow">
          <p className="text-sm text-slate-700">{error || "Patient not found."}</p>
          <Link
            href="/dashboard/doctor/emr"
            className="mt-3 inline-block text-sm font-semibold text-emerald-600 hover:underline"
          >
            ← Back to clinic records
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 py-10">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-200/40 via-cyan-200/40 to-indigo-200/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4">
        {/* Top nav */}
        <div className="mb-4 flex items-center justify-between text-sm">
          <Link
            href="/dashboard/doctor/emr"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
          >
            ← Clinic records
          </Link>
          <button
            onClick={deletePatient}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            Delete patient
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {/* Patient header card */}
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl shadow-emerald-500/5 backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-2xl font-bold text-white shadow-lg shadow-emerald-500/30">
                {(patient.firstName[0] || "?").toUpperCase()}
                {(patient.lastName[0] || "").toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {patient.firstName} {patient.lastName}
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  {patient.age && <>{patient.age} yrs · </>}
                  {patient.sex && <>{patient.sex} · </>}
                  {patient.phone}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {patient.bloodGroup && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      {patient.bloodGroup}
                    </span>
                  )}
                  {patient.allergies && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
                      ⚠ {patient.allergies}
                    </span>
                  )}
                  {patient.chronicConditions && (
                    <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100">
                      {patient.chronicConditions}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setEditingDemographics((v) => !v)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              {editingDemographics ? "Cancel" : "Edit details"}
            </button>
          </div>

          {editingDemographics && (
            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <Field label="First name" value={demoDraft.firstName || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, firstName: v }))} />
              <Field label="Last name" value={demoDraft.lastName || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, lastName: v }))} />
              <Field label="Age" value={demoDraft.age || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, age: v }))} />
              <Field label="Sex" value={demoDraft.sex || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, sex: v }))} />
              <Field label="Phone" value={demoDraft.phone || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, phone: v }))} />
              <Field label="Email" value={demoDraft.email || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, email: v }))} />
              <Field label="Address" wide value={demoDraft.address || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, address: v }))} />
              <Field label="Blood group" value={demoDraft.bloodGroup || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, bloodGroup: v }))} />
              <Field label="Allergies" value={demoDraft.allergies || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, allergies: v }))} />
              <Field label="Chronic conditions" wide value={demoDraft.chronicConditions || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, chronicConditions: v }))} />
              <FieldArea label="Notes" wide value={demoDraft.notes || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, notes: v }))} />
              <div className="sm:col-span-2 flex justify-end">
                <button
                  onClick={saveDemographics}
                  disabled={savingDemo}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                >
                  {savingDemo ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick info grid */}
        {!editingDemographics && (patient.address || patient.email || patient.notes) && (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {patient.email && (
              <InfoCard label="Email" value={patient.email} />
            )}
            {patient.address && (
              <InfoCard label="Address" value={patient.address} />
            )}
            {patient.notes && (
              <InfoCard label="Notes" value={patient.notes} wide />
            )}
          </div>
        )}

        {/* Visit timeline */}
        <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Visit history</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {visits.length}
              </span>
            </div>
            <button
              onClick={() => setVisitFormOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                visitFormOpen
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl"
              }`}
            >
              {visitFormOpen ? "Close" : "+ New visit"}
            </button>
          </div>

          {visitFormOpen && (
            <form onSubmit={saveVisit} className="border-b border-slate-100 bg-emerald-50/30 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Visit date"
                  type="date"
                  value={visitForm.visitDate}
                  onChange={(v) => setVisitForm((p) => ({ ...p, visitDate: v }))}
                />
                <Field
                  label="Vitals"
                  value={visitForm.vitals}
                  onChange={(v) => setVisitForm((p) => ({ ...p, vitals: v }))}
                  placeholder="BP 130/85, HR 88, Temp 37.2°C"
                />
                <Field
                  wide
                  required
                  label="Chief complaint"
                  value={visitForm.chiefComplaint}
                  onChange={(v) => setVisitForm((p) => ({ ...p, chiefComplaint: v }))}
                  placeholder="Why is the patient here today?"
                />
                <FieldArea
                  wide
                  label="Subjective (S)"
                  value={visitForm.subjective}
                  onChange={(v) => setVisitForm((p) => ({ ...p, subjective: v }))}
                  placeholder="History of present illness — patient's own words."
                />
                <FieldArea
                  wide
                  label="Objective (O)"
                  value={visitForm.objective}
                  onChange={(v) => setVisitForm((p) => ({ ...p, objective: v }))}
                  placeholder="Examination findings, lab results."
                />
                <FieldArea
                  wide
                  required
                  label="Assessment (A)"
                  value={visitForm.assessment}
                  onChange={(v) => setVisitForm((p) => ({ ...p, assessment: v }))}
                  placeholder="Working diagnosis / clinical impression."
                />
                <FieldArea
                  wide
                  required
                  label="Plan (P)"
                  value={visitForm.plan}
                  onChange={(v) => setVisitForm((p) => ({ ...p, plan: v }))}
                  placeholder="Investigations, medications, follow-up."
                />
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setVisitForm(EMPTY_VISIT);
                    setVisitFormOpen(false);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVisit}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                >
                  {savingVisit ? "Saving…" : "Save visit"}
                </button>
              </div>
            </form>
          )}

          {visits.length === 0 && !visitFormOpen ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">No visits logged yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Click <b>+ New visit</b> to record a SOAP note for today&apos;s
                consultation.
              </p>
            </div>
          ) : visits.length === 0 ? null : (
            <ol className="relative divide-y divide-slate-100">
              {visits.map((v) => (
                <li key={v.id} className="px-6 py-5">
                  <div className="flex items-start gap-4">
                    <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-cyan-100 text-emerald-700">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                          {v.visitDate}
                        </span>
                        {v.vitals && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {v.vitals}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {v.chiefComplaint}
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {v.subjective && (
                          <SoapBlock label="S" tone="cyan" text={v.subjective} />
                        )}
                        {v.objective && (
                          <SoapBlock label="O" tone="violet" text={v.objective} />
                        )}
                        <SoapBlock label="A" tone="amber" text={v.assessment} />
                        <SoapBlock label="P" tone="emerald" text={v.plan} />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Files */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Files</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {files.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as EmrFile["category"])}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
              >
                <option value="lab">Lab report</option>
                <option value="scan">Scan / X-ray</option>
                <option value="report">Report</option>
                <option value="other">Other</option>
              </select>
              <input
                value={uploadLabel}
                onChange={(e) => setUploadLabel(e.target.value)}
                placeholder="Label (e.g. CBC 04-29)"
                className="w-44 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
              />
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadEmrFile(f);
                }}
                className="hidden"
                id="emr-file-upload"
              />
              <label
                htmlFor="emr-file-upload"
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  uploading
                    ? "bg-slate-200 text-slate-500"
                    : "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-500/20 hover:shadow-lg"
                }`}
              >
                {uploading ? "Uploading…" : "+ Upload file"}
              </label>
            </div>
          </div>
          {files.length === 0 ? (
            <div className="px-6 py-10 text-center text-xs text-slate-500">
              No files yet — upload lab reports, scans, or other PDFs/images (max 10 MB).
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                    {f.category === "scan" ? "🩻" : f.category === "lab" ? "🧪" : f.category === "report" ? "📄" : "📎"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {f.label}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {f.originalName} · {Math.round(f.size / 1024)} KB · {f.createdAt.slice(0, 10)}
                    </p>
                  </div>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Open
                  </a>
                  <button
                    onClick={() => deleteEmrFile(f.id)}
                    className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Invoices */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Invoices</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {invoices.length}
              </span>
            </div>
            <button
              onClick={() => setInvoiceFormOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                invoiceFormOpen
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/20 hover:shadow-lg"
              }`}
            >
              {invoiceFormOpen ? "Close" : "+ New invoice"}
            </button>
          </div>

          {invoiceFormOpen && (
            <form onSubmit={saveInvoice} className="border-b border-slate-100 bg-amber-50/30 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field
                  label="Issue date"
                  type="date"
                  value={invoiceForm.issueDate}
                  onChange={(v) => setInvoiceForm((p) => ({ ...p, issueDate: v }))}
                />
                <Field
                  label="Due date"
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(v) => setInvoiceForm((p) => ({ ...p, dueDate: v }))}
                />
                <Field
                  label="Currency"
                  value={invoiceForm.currency}
                  onChange={(v) => setInvoiceForm((p) => ({ ...p, currency: v.toUpperCase() }))}
                />
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                  Line items
                </div>
                <div className="divide-y divide-slate-100">
                  {invoiceForm.lineItems.map((li, i) => (
                    <div key={i} className="grid grid-cols-12 items-center gap-2 p-3">
                      <input
                        value={li.description}
                        onChange={(e) => updateLine(i, "description", e.target.value)}
                        placeholder="Description"
                        className="col-span-6 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={li.quantity}
                        onChange={(e) => updateLine(i, "quantity", Number(e.target.value))}
                        className="col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
                        placeholder="Qty"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={li.unitPrice}
                        onChange={(e) => updateLine(i, "unitPrice", Number(e.target.value))}
                        className="col-span-3 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
                        placeholder="Unit price"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        className="col-span-1 rounded-lg text-xs text-rose-600 hover:bg-rose-50"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-xs font-semibold text-amber-700 hover:underline"
                  >
                    + Add line
                  </button>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Tax %</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={invoiceForm.taxRate}
                      onChange={(e) => setInvoiceForm((p) => ({ ...p, taxRate: e.target.value }))}
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1 outline-none focus:border-amber-500"
                    />
                    <span className="ml-2 text-slate-500">Total</span>
                    <span className="font-bold tabular-nums text-slate-900">
                      {invoiceForm.currency} {invoiceTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <FieldArea
                wide
                label="Notes"
                value={invoiceForm.notes}
                onChange={(v) => setInvoiceForm((p) => ({ ...p, notes: v }))}
                placeholder="Visible on the invoice."
              />
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceForm(EMPTY_INVOICE_FORM);
                    setInvoiceFormOpen(false);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingInvoice}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 disabled:opacity-50"
                >
                  {savingInvoice ? "Saving…" : "Save invoice"}
                </button>
              </div>
            </form>
          )}

          {invoices.length === 0 && !invoiceFormOpen ? (
            <div className="px-6 py-10 text-center text-xs text-slate-500">
              No invoices yet — log a consultation fee, lab work, or follow-up charge.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <li key={inv.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{inv.number}</p>
                        <InvoiceStatusBadge status={inv.status} />
                        <span className="text-[11px] text-slate-500">
                          {inv.issueDate}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">
                        {inv.lineItems.map((l) => l.description).join(" · ")}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {inv.currency} {inv.subtotal.toFixed(2)}
                        {inv.taxAmount ? ` + ${inv.taxAmount.toFixed(2)} tax` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums text-slate-900">
                        {inv.currency} {inv.total.toFixed(2)}
                      </p>
                      <div className="mt-1 flex flex-wrap justify-end gap-1">
                        {inv.status !== "paid" && inv.status !== "void" && (
                          <>
                            <button
                              onClick={() => copyPaymentLink(inv)}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                                copiedToken === inv.publicToken
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                              }`}
                              title={
                                inv.publicToken
                                  ? "Copy patient-facing payment link"
                                  : "Generate and copy a patient-facing payment link"
                              }
                            >
                              {copiedToken === inv.publicToken
                                ? "✓ Link copied"
                                : inv.publicToken
                                  ? "Copy pay link"
                                  : "Get pay link"}
                            </button>
                            {inv.publicToken && (
                              <button
                                onClick={() => rotatePaymentLink(inv)}
                                className="rounded-lg px-1.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
                                title="Rotate the payment link (invalidates the old URL)"
                              >
                                ↻
                              </button>
                            )}
                          </>
                        )}
                        {inv.status !== "paid" && (
                          <button
                            onClick={() => setInvoiceStatus(inv.id, "paid")}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                          >
                            Mark paid
                          </button>
                        )}
                        {inv.status === "draft" && (
                          <button
                            onClick={() => setInvoiceStatus(inv.id, "sent")}
                            className="rounded-lg bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-900"
                          >
                            Mark sent
                          </button>
                        )}
                        {inv.status !== "void" && inv.status !== "paid" && (
                          <button
                            onClick={() => setInvoiceStatus(inv.id, "void")}
                            className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
                          >
                            Void
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Interop / export */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-indigo-50/60 via-violet-50/60 to-fuchsia-50/60 p-5 shadow-sm backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Interoperability
              </p>
              <h2 className="mt-1 text-base font-bold text-slate-900">
                Export this patient&apos;s record
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Download a copy in either format for migration to another EMR
                or for the patient&apos;s personal records.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadHl7}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:border-indigo-400 hover:bg-indigo-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                Export HL7 v2
              </button>
              <button
                onClick={downloadFhir}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-600"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Export FHIR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: Invoice["status"] }) {
  const map: Record<Invoice["status"], { bg: string; text: string }> = {
    draft: { bg: "bg-slate-100", text: "text-slate-700" },
    sent: { bg: "bg-blue-50", text: "text-blue-700" },
    paid: { bg: "bg-emerald-50", text: "text-emerald-700" },
    void: { bg: "bg-rose-50", text: "text-rose-700" },
  };
  const m = map[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${m.bg} ${m.text}`}>
      {status}
    </span>
  );
}

function InfoCard({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-100 bg-white px-4 py-3 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-slate-800">{value}</p>
    </div>
  );
}

function SoapBlock({
  label,
  tone,
  text,
}: {
  label: string;
  tone: "cyan" | "violet" | "amber" | "emerald";
  text: string;
}) {
  const tones: Record<string, { bg: string; ring: string; text: string }> = {
    cyan: { bg: "bg-cyan-50", ring: "ring-cyan-100", text: "text-cyan-700" },
    violet: { bg: "bg-violet-50", ring: "ring-violet-100", text: "text-violet-700" },
    amber: { bg: "bg-amber-50", ring: "ring-amber-100", text: "text-amber-700" },
    emerald: { bg: "bg-emerald-50", ring: "ring-emerald-100", text: "text-emerald-700" },
  };
  const t = tones[tone];
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold ${t.bg} ${t.text} ring-1 ${t.ring}`}
        >
          {label}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
        {text}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  wide,
  required,
  placeholder,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-semibold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
      />
    </label>
  );
}
function FieldArea({
  label,
  value,
  onChange,
  wide,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-semibold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
      />
    </label>
  );
}
