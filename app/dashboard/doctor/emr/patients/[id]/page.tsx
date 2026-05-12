"use client";

// EMR patient detail — demographics + SOAP visit timeline + inline
// new-visit form. The SOAP form below the timeline keeps the doctor in
// one place: typing a note shouldn't require navigating to another
// page and losing the patient's context.

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AiPatientSummaryCard from "@/components/AiPatientSummaryCard";
import Icd10Suggester from "@/components/Icd10Suggester";
import AmbientScribe from "@/components/AmbientScribe";
import DifferentialDxButton from "@/components/DifferentialDxButton";

// Helper used by the AmbientScribe onResult handler — preserve any text
// the doctor already typed by appending the AI output, rather than
// overwriting work in progress.
function appendOrSet(existing: string, incoming?: string): string {
  if (!incoming) return existing;
  if (!existing.trim()) return incoming;
  return `${existing.trim()}\n\n${incoming}`;
}

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

type CertificateType =
  | "sick-leave"
  | "fitness-to-work"
  | "fitness-to-travel"
  | "fitness-for-activity"
  | "vaccination"
  | "general";

interface Certificate {
  id: string;
  number: string;
  type: CertificateType;
  issueDate: string;
  fromDate?: string;
  toDate?: string;
  daysOfRest?: number;
  diagnosis: string;
  findings?: string;
  restrictions?: string;
  recommendations?: string;
  doctorName: string;
  doctorQualification?: string;
  doctorRegistration?: string;
  clinicName?: string;
  publicToken: string;
  status: "active" | "voided";
  notes?: string;
  createdAt: string;
}

const CERT_TYPE_LABEL: Record<CertificateType, string> = {
  "sick-leave": "Sick leave",
  "fitness-to-work": "Fitness to work",
  "fitness-to-travel": "Fitness to travel",
  "fitness-for-activity": "Fitness for activity",
  vaccination: "Vaccination",
  general: "General medical",
};

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

const EMPTY_CERT_FORM = {
  type: "sick-leave" as CertificateType,
  issueDate: new Date().toISOString().slice(0, 10),
  fromDate: new Date().toISOString().slice(0, 10),
  toDate: "",
  diagnosis: "",
  findings: "",
  restrictions: "",
  recommendations: "Adequate rest and follow-up if symptoms persist.",
  doctorName: "",
  doctorQualification: "",
  doctorRegistration: "",
  clinicName: "",
  notes: "",
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

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certForm, setCertForm] = useState(EMPTY_CERT_FORM);
  const [certFormOpen, setCertFormOpen] = useState(false);
  const [savingCert, setSavingCert] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, vRes, fRes, iRes, cRes] = await Promise.all([
        fetch(`/api/emr/patients/${id}`),
        fetch(`/api/emr/visits?patientId=${id}`),
        fetch(`/api/emr/files?patientId=${id}`),
        fetch(`/api/emr/invoices?patientId=${id}`),
        fetch(`/api/emr/certificates?patientId=${id}`),
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
      if (cRes.ok) {
        const cData = await cRes.json();
        setCertificates(cData.certificates || []);
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

  function downloadGdprExport() {
    if (
      !confirm(
        "Issue a full GDPR portability export for this patient? Verify the patient's identity in person before sharing the resulting file."
      )
    )
      return;
    window.open(`/api/emr/patients/${id}/export`, "_blank");
  }

  async function saveCertificate(e: React.FormEvent) {
    e.preventDefault();
    if (!certForm.diagnosis.trim()) {
      setError("Diagnosis is required to issue a certificate.");
      return;
    }
    if (!certForm.doctorName.trim()) {
      setError("Doctor name is required (this is snapshotted on the certificate).");
      return;
    }
    if (
      ["sick-leave", "fitness-to-travel", "fitness-for-activity"].includes(
        certForm.type
      ) &&
      (!certForm.fromDate || !certForm.toDate)
    ) {
      setError("From / to dates are required for this certificate type.");
      return;
    }
    setSavingCert(true);
    setError(null);
    try {
      const res = await fetch("/api/emr/certificates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId: id, ...certForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setCertificates((prev) => [data.certificate, ...prev]);
      // Keep doctor identity fields populated for the next certificate.
      setCertForm({
        ...EMPTY_CERT_FORM,
        doctorName: certForm.doctorName,
        doctorQualification: certForm.doctorQualification,
        doctorRegistration: certForm.doctorRegistration,
        clinicName: certForm.clinicName,
      });
      setCertFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingCert(false);
    }
  }

  async function setCertStatus(certId: string, status: "active" | "voided") {
    try {
      const res = await fetch(`/api/emr/certificates/${certId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setCertificates((prev) =>
        prev.map((c) => (c.id === certId ? data.certificate : c))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  function escape(s: string | undefined): string {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function printCertificate(cert: Certificate) {
    if (!patient) return;
    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow pop-ups to print certificates.");
      return;
    }
    const verifyUrl = `${window.location.origin}/verify/${cert.publicToken}`;
    const patientLine = `${patient.firstName} ${patient.lastName}`.trim();
    const ageSex = [
      patient.age && `${patient.age} yrs`,
      patient.sex,
    ]
      .filter(Boolean)
      .join(" · ");
    const typeLabel = CERT_TYPE_LABEL[cert.type];
    const dateRange =
      cert.fromDate && cert.toDate
        ? `${cert.fromDate} to ${cert.toDate}${
            cert.daysOfRest ? ` (${cert.daysOfRest} day${cert.daysOfRest === 1 ? "" : "s"})` : ""
          }`
        : "";
    const html = `<!DOCTYPE html><html><head>
<title>Certificate ${cert.number} — ${patientLine}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;padding:48px;max-width:780px;margin:0 auto;line-height:1.55}
  .frame{border:6px double #1e293b;padding:40px}
  h1{font-size:14px;letter-spacing:6px;text-align:center;font-weight:700;color:#475569;text-transform:uppercase}
  h2{font-size:24px;text-align:center;margin-top:8px;font-weight:800;color:#0f172a}
  .clinic{font-size:13px;color:#475569;text-align:center;margin-top:14px}
  .meta{display:flex;justify-content:space-between;font-size:12px;color:#475569;margin:24px 0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:10px 0}
  .meta b{color:#0f172a;font-weight:700}
  .body{font-size:15px;margin-top:24px;line-height:1.8}
  .body strong{color:#0f172a}
  .row{display:grid;grid-template-columns:170px 1fr;gap:8px;margin:6px 0;font-size:14px}
  .label{font-weight:600;color:#475569}
  .value{color:#0f172a}
  .restrictions{margin-top:18px;padding:12px 14px;background:#fff7ed;border-left:4px solid #f59e0b;font-size:13px}
  .recommendations{margin-top:14px;font-size:13px;color:#1e293b}
  .footer{margin-top:48px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;color:#475569}
  .sign{text-align:right}
  .sign .doctor{font-weight:700;color:#0f172a;font-size:15px}
  .sign .reg{font-family:monospace;font-size:11px}
  .verify{margin-top:32px;text-align:center;padding:14px;border:1px dashed #94a3b8;font-size:11px;color:#475569;background:#f8fafc}
  .verify b{color:#0f172a}
  .verify code{background:#fff;padding:2px 6px;border-radius:4px;border:1px solid #cbd5e1;font-size:11px}
  .voided{color:#b91c1c;font-weight:800;font-size:18px;text-align:center;margin-top:14px;letter-spacing:6px}
  @media print{
    body{padding:24px}
    .frame{border-color:#000}
  }
</style>
</head><body>
<div class="frame">
  <h1>Medical Certificate</h1>
  <h2>${typeLabel}</h2>
  ${cert.clinicName ? `<div class="clinic">${escape(cert.clinicName)}</div>` : ""}
  ${cert.status === "voided" ? `<div class="voided">— VOIDED —</div>` : ""}

  <div class="meta">
    <span>Certificate No: <b>${escape(cert.number)}</b></span>
    <span>Issued: <b>${escape(cert.issueDate)}</b></span>
  </div>

  <div class="body">
    This is to certify that <strong>${escape(patientLine)}</strong>${ageSex ? ` (${escape(ageSex)})` : ""},
    after examination, has been diagnosed with <strong>${escape(cert.diagnosis)}</strong>.
  </div>

  <div style="margin-top:18px">
    ${cert.findings ? `<div class="row"><div class="label">Findings</div><div class="value">${escape(cert.findings)}</div></div>` : ""}
    ${dateRange ? `<div class="row"><div class="label">Period</div><div class="value">${escape(dateRange)}</div></div>` : ""}
  </div>

  ${cert.restrictions ? `<div class="restrictions"><b>Restrictions:</b> ${escape(cert.restrictions)}</div>` : ""}
  ${cert.recommendations ? `<div class="recommendations"><b>Recommendations:</b> ${escape(cert.recommendations)}</div>` : ""}

  <div class="footer">
    <div>
      ${cert.doctorRegistration ? `Reg. No: <span style="font-family:monospace">${escape(cert.doctorRegistration)}</span><br/>` : ""}
      <span style="font-size:10px;color:#94a3b8">This certificate is valid only when verified at the URL below.</span>
    </div>
    <div class="sign">
      <div class="doctor">${escape(cert.doctorName)}</div>
      ${cert.doctorQualification ? `<div>${escape(cert.doctorQualification)}</div>` : ""}
    </div>
  </div>

  <div class="verify">
    <b>Verify this certificate online:</b><br/>
    <code>${verifyUrl}</code>
  </div>
</div>
<script>setTimeout(function(){window.print();}, 350);</script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  }

  async function copyVerifyLink(cert: Certificate) {
    const url = `${window.location.origin}/verify/${cert.publicToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(cert.publicToken);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      window.prompt("Copy this verification link:", url);
    }
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10">
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-8 text-center shadow">
          <p className="text-sm text-slate-700 dark:text-slate-300">{error || "Patient not found."}</p>
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
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 py-10">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-200/40 via-cyan-200/40 to-indigo-200/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4">
        {/* Top nav */}
        <div className="mb-4 flex items-center justify-between text-sm">
          <Link
            href="/dashboard/doctor/emr"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:border-emerald-300 hover:text-emerald-700"
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

        {/* AI chart summary — Phase 1 of the AI-powered EMR roadmap. Sits
             above the demographics card so the doctor reads it first. The
             staleKey ties the summary to visits.length + files.length +
             patient.updatedAt so it auto-refreshes when the chart changes. */}
        <AiPatientSummaryCard
          patientId={patient.id}
          staleKey={`${visits.length}|${(visits[0]?.id) || ""}|${patient.updatedAt}`}
        />

        {/* Patient header card */}
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl shadow-emerald-500/5 backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-2xl font-bold text-white shadow-lg shadow-emerald-500/30">
                {(patient.firstName[0] || "?").toUpperCase()}
                {(patient.lastName[0] || "").toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {patient.firstName} {patient.lastName}
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
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
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:border-emerald-300 hover:text-emerald-700"
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
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Visit history</h2>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {visits.length}
              </span>
            </div>
            <button
              onClick={() => setVisitFormOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                visitFormOpen
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
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
                <div className="sm:col-span-2 -mt-2 flex flex-wrap items-center gap-2">
                  <DifferentialDxButton
                    chiefComplaint={visitForm.chiefComplaint}
                    subjective={visitForm.subjective}
                    objective={visitForm.objective}
                    vitals={visitForm.vitals}
                    patientAge={patient.age}
                    patientSex={patient.sex}
                    patientAllergies={patient.allergies}
                    patientChronicConditions={patient.chronicConditions}
                    onAccept={(dx) => {
                      setVisitForm((p) => ({
                        ...p,
                        assessment: p.assessment.trim()
                          ? `${p.assessment.trim()}\n${dx}`
                          : dx,
                      }));
                    }}
                  />
                  <Icd10Suggester
                    chiefComplaint={visitForm.chiefComplaint}
                    subjective={visitForm.subjective}
                    objective={visitForm.objective}
                    assessment={visitForm.assessment}
                    plan={visitForm.plan}
                    vitals={visitForm.vitals}
                    patientAge={patient.age}
                    patientSex={patient.sex}
                    onAccept={(formatted) => {
                      // Append to assessment with a leading newline so
                      // multiple codes stack cleanly. Doctor can edit
                      // freely after.
                      setVisitForm((p) => ({
                        ...p,
                        assessment: p.assessment.trim()
                          ? `${p.assessment.trim()}\n${formatted}`
                          : formatted,
                      }));
                    }}
                  />
                  <AmbientScribe
                    patientId={patient.id}
                    onResult={(soap) => {
                      // Merge — we overwrite empty fields, append to non-
                      // empty ones so a doctor mid-typing doesn't lose work.
                      setVisitForm((p) => ({
                        ...p,
                        chiefComplaint: p.chiefComplaint.trim() || soap.chiefComplaint || p.chiefComplaint,
                        subjective: appendOrSet(p.subjective, soap.subjective),
                        objective: appendOrSet(p.objective, soap.objective),
                        assessment: appendOrSet(p.assessment, soap.assessment),
                        plan: appendOrSet(p.plan, soap.plan),
                        vitals: p.vitals.trim() || soap.vitals || p.vitals,
                      }));
                    }}
                  />
                </div>
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
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900"
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
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No visits logged yet</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Click <b>+ New visit</b> to record a SOAP note for today&apos;s
                consultation.
              </p>
            </div>
          ) : visits.length === 0 ? null : (
            <ol className="relative divide-y divide-slate-100 dark:divide-slate-800">
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
                          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            {v.vitals}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
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
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Files</h2>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {files.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as EmrFile["category"])}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
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
                className="w-44 rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-xs outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
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
                    ? "bg-slate-200 text-slate-500 dark:text-slate-400"
                    : "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-500/20 hover:shadow-lg"
                }`}
              >
                {uploading ? "Uploading…" : "+ Upload file"}
              </label>
            </div>
          </div>
          {files.length === 0 ? (
            <div className="px-6 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              No files yet — upload lab reports, scans, or other PDFs/images (max 10 MB).
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                    {f.category === "scan" ? "🩻" : f.category === "lab" ? "🧪" : f.category === "report" ? "📄" : "📎"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {f.label}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {f.originalName} · {Math.round(f.size / 1024)} KB · {f.createdAt.slice(0, 10)}
                    </p>
                  </div>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
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
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Invoices</h2>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {invoices.length}
              </span>
            </div>
            <button
              onClick={() => setInvoiceFormOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                invoiceFormOpen
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
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
              <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Line items
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoiceForm.lineItems.map((li, i) => (
                    <div key={i} className="grid grid-cols-12 items-center gap-2 p-3">
                      <input
                        value={li.description}
                        onChange={(e) => updateLine(i, "description", e.target.value)}
                        placeholder="Description"
                        className="col-span-6 rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={li.quantity}
                        onChange={(e) => updateLine(i, "quantity", Number(e.target.value))}
                        className="col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
                        placeholder="Qty"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={li.unitPrice}
                        onChange={(e) => updateLine(i, "unitPrice", Number(e.target.value))}
                        className="col-span-3 rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
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
                    <span className="text-slate-500 dark:text-slate-400">Tax %</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={invoiceForm.taxRate}
                      onChange={(e) => setInvoiceForm((p) => ({ ...p, taxRate: e.target.value }))}
                      className="w-16 rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1 outline-none focus:border-amber-500"
                    />
                    <span className="ml-2 text-slate-500 dark:text-slate-400">Total</span>
                    <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
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
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900"
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
            <div className="px-6 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              No invoices yet — log a consultation fee, lab work, or follow-up charge.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.map((inv) => (
                <li key={inv.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{inv.number}</p>
                        <InvoiceStatusBadge status={inv.status} />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {inv.issueDate}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                        {inv.lineItems.map((l) => l.description).join(" · ")}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {inv.currency} {inv.subtotal.toFixed(2)}
                        {inv.taxAmount ? ` + ${inv.taxAmount.toFixed(2)} tax` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
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
                                className="rounded-lg px-1.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800"
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
                            className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800"
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

        {/* Medical certificates */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Medical certificates</h2>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {certificates.length}
              </span>
            </div>
            <button
              onClick={() => setCertFormOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                certFormOpen
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  : "bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg"
              }`}
            >
              {certFormOpen ? "Close" : "+ Issue certificate"}
            </button>
          </div>

          {certFormOpen && (
            <form onSubmit={saveCertificate} className="border-b border-slate-100 bg-indigo-50/30 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Certificate type *
                  </span>
                  <select
                    value={certForm.type}
                    onChange={(e) =>
                      setCertForm((p) => ({ ...p, type: e.target.value as CertificateType }))
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  >
                    <option value="sick-leave">Sick leave</option>
                    <option value="fitness-to-work">Fitness to work / return to duty</option>
                    <option value="fitness-to-travel">Fitness to travel</option>
                    <option value="fitness-for-activity">Fitness for activity / sport</option>
                    <option value="vaccination">Vaccination certificate</option>
                    <option value="general">General medical certificate</option>
                  </select>
                </label>
                <Field
                  label="Issue date"
                  type="date"
                  value={certForm.issueDate}
                  onChange={(v) => setCertForm((p) => ({ ...p, issueDate: v }))}
                  required
                />
                <div />
                <Field
                  label="Valid from"
                  type="date"
                  value={certForm.fromDate}
                  onChange={(v) => setCertForm((p) => ({ ...p, fromDate: v }))}
                />
                <Field
                  label="Valid until"
                  type="date"
                  value={certForm.toDate}
                  onChange={(v) => setCertForm((p) => ({ ...p, toDate: v }))}
                />
                <FieldArea
                  wide
                  required
                  label="Diagnosis"
                  value={certForm.diagnosis}
                  onChange={(v) => setCertForm((p) => ({ ...p, diagnosis: v }))}
                  placeholder="e.g. Acute viral fever (URI)"
                />
                <FieldArea
                  wide
                  label="Findings (optional)"
                  value={certForm.findings}
                  onChange={(v) => setCertForm((p) => ({ ...p, findings: v }))}
                  placeholder="Brief examination findings — printed on the certificate."
                />
                <FieldArea
                  wide
                  label="Restrictions"
                  value={certForm.restrictions}
                  onChange={(v) => setCertForm((p) => ({ ...p, restrictions: v }))}
                  placeholder="No heavy lifting, no driving, etc."
                />
                <FieldArea
                  wide
                  label="Recommendations"
                  value={certForm.recommendations}
                  onChange={(v) => setCertForm((p) => ({ ...p, recommendations: v }))}
                />
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Issuing doctor — snapshotted onto the certificate
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label="Doctor name"
                    required
                    value={certForm.doctorName}
                    onChange={(v) => setCertForm((p) => ({ ...p, doctorName: v }))}
                    placeholder="Dr. Jane Doe"
                  />
                  <Field
                    label="Qualification"
                    value={certForm.doctorQualification}
                    onChange={(v) => setCertForm((p) => ({ ...p, doctorQualification: v }))}
                    placeholder="MBBS, MD"
                  />
                  <Field
                    label="Medical-council reg. no."
                    value={certForm.doctorRegistration}
                    onChange={(v) => setCertForm((p) => ({ ...p, doctorRegistration: v }))}
                    placeholder="e.g. MCI / NPI / GMC number"
                  />
                  <Field
                    label="Clinic name"
                    value={certForm.clinicName}
                    onChange={(v) => setCertForm((p) => ({ ...p, clinicName: v }))}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCertForm(EMPTY_CERT_FORM);
                    setCertFormOpen(false);
                  }}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCert}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:opacity-50"
                >
                  {savingCert ? "Issuing…" : "Issue certificate"}
                </button>
              </div>
            </form>
          )}

          {certificates.length === 0 && !certFormOpen ? (
            <div className="px-6 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              No certificates yet — click <b>+ Issue certificate</b> to create
              a sick leave, fitness, or vaccination certificate.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {certificates.map((cert) => (
                <li key={cert.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{cert.number}</p>
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-100">
                          {CERT_TYPE_LABEL[cert.type]}
                        </span>
                        {cert.status === "voided" && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 ring-1 ring-rose-100">
                            voided
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{cert.issueDate}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{cert.diagnosis}</p>
                      {cert.fromDate && cert.toDate && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          Period: {cert.fromDate} → {cert.toDate}
                          {cert.daysOfRest ? ` · ${cert.daysOfRest} day${cert.daysOfRest === 1 ? "" : "s"}` : ""}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Issued by <b>{cert.doctorName}</b>
                        {cert.doctorRegistration ? ` · Reg. ${cert.doctorRegistration}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      <button
                        onClick={() => printCertificate(cert)}
                        className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-600"
                      >
                        Print
                      </button>
                      <button
                        onClick={() => copyVerifyLink(cert)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                          copiedToken === cert.publicToken
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                        }`}
                        title="Copy public verification link"
                      >
                        {copiedToken === cert.publicToken ? "✓ Copied" : "Copy verify link"}
                      </button>
                      {cert.status === "active" ? (
                        <button
                          onClick={() => setCertStatus(cert.id, "voided")}
                          className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Void
                        </button>
                      ) : (
                        <button
                          onClick={() => setCertStatus(cert.id, "active")}
                          className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50"
                        >
                          Reactivate
                        </button>
                      )}
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
              <h2 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
                Export this patient&apos;s record
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Download a copy in either format for migration to another EMR
                or for the patient&apos;s personal records.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadHl7}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-sm hover:border-indigo-400 hover:bg-indigo-50"
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
              <button
                onClick={downloadGdprExport}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100"
                title="GDPR Article 20 portability — full patient record as JSON. Verify identity before sharing."
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 11l-3 3m0 0l-3-3m3 3V3" />
                </svg>
                GDPR export
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
    draft: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300" },
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
      className={`rounded-2xl border border-slate-100 bg-white dark:bg-slate-900 px-4 py-3 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{value}</p>
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
    <div className="rounded-xl border border-slate-100 bg-white dark:bg-slate-900 p-3">
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold ${t.bg} ${t.text} ring-1 ${t.ring}`}
        >
          {label}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
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
      <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
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
      <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
      />
    </label>
  );
}
