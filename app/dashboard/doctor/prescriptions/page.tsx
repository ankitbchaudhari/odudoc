"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  PRESCRIPTION_TEMPLATES,
  SAMPLE_PRESCRIPTION,
  PrescriptionData,
  PrescriptionTemplate,
  DEFAULT_TEMPLATE_ID,
  getTemplateById,
} from "@/lib/prescription-templates";
import PrescriptionRenderer from "@/components/PrescriptionRenderer";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function useSelectedTemplate() {
  const [id, setId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("odudoc_rx_template") || DEFAULT_TEMPLATE_ID;
    }
    return DEFAULT_TEMPLATE_ID;
  });

  const select = (newId: string) => {
    setId(newId);
    localStorage.setItem("odudoc_rx_template", newId);
  };

  return [id, select] as const;
}

const STYLE_LABELS: Record<string, string> = {
  classic: "Classic",
  modern: "Modern",
  minimal: "Minimal",
  colorful: "Colorful",
  professional: "Professional",
};

/* ------------------------------------------------------------------ */
/*  Write Prescription Modal                                          */
/* ------------------------------------------------------------------ */

function WritePrescriptionModal({
  templateId,
  onClose,
}: {
  templateId: string;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const printRef = useRef<HTMLDivElement>(null);
  const template = getTemplateById(templateId) || PRESCRIPTION_TEMPLATES[0];

  const [form, setForm] = useState<PrescriptionData>({
    doctorName: session?.user?.name || "Dr. ",
    doctorQualification: "",
    doctorRegistration: "",
    doctorSpecialty: "",
    clinicName: "OduDoc Medical Center",
    clinicAddress: "",
    clinicPhone: "",
    clinicEmail: session?.user?.email || "",
    patientName: "",
    patientAge: "",
    patientGender: "Male",
    patientId: "",
    patientPhone: "",
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    diagnosis: "",
    symptoms: "",
    medications: [
      { name: "", dose: "", frequency: "", duration: "", instructions: "" },
    ],
    tests: [],
    advice: "",
    followUp: "",
    signature: session?.user?.name || "",
  });

  const [testInput, setTestInput] = useState("");

  const set = (key: keyof PrescriptionData, val: string) =>
    setForm((p) => ({ ...p, [key]: val }));

  const setMed = (
    idx: number,
    key: keyof PrescriptionData["medications"][0],
    val: string
  ) => {
    const meds = [...form.medications];
    meds[idx] = { ...meds[idx], [key]: val };
    setForm((p) => ({ ...p, medications: meds }));
  };

  const addMed = () =>
    setForm((p) => ({
      ...p,
      medications: [
        ...p.medications,
        { name: "", dose: "", frequency: "", duration: "", instructions: "" },
      ],
    }));

  const removeMed = (idx: number) =>
    setForm((p) => ({
      ...p,
      medications: p.medications.filter((_, i) => i !== idx),
    }));

  const addTest = () => {
    if (!testInput.trim()) return;
    setForm((p) => ({ ...p, tests: [...(p.tests || []), testInput.trim()] }));
    setTestInput("");
  };

  const removeTest = (idx: number) =>
    setForm((p) => ({
      ...p,
      tests: (p.tests || []).filter((_, i) => i !== idx),
    }));

  const handlePrint = () => {
    if (!printRef.current) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Prescription - ${form.patientName || "Patient"}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;print-color-adjust:exact;-webkit-print-color-adjust:exact}@media print{body{margin:0}}</style>
      </head><body>${printRef.current.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  const isValid =
    form.patientName && form.diagnosis && form.medications[0]?.name;

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Form */}
        <div className="w-full overflow-y-auto bg-white p-6 lg:w-1/2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Write Prescription
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-5">
            {/* Doctor Info */}
            <fieldset className="rounded-xl border border-gray-200 p-4">
              <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Doctor Details
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Name"
                  value={form.doctorName}
                  onChange={(v) => set("doctorName", v)}
                />
                <Input
                  label="Qualification"
                  value={form.doctorQualification}
                  onChange={(v) => set("doctorQualification", v)}
                  placeholder="MD, MBBS"
                />
                <Input
                  label="Registration No."
                  value={form.doctorRegistration}
                  onChange={(v) => set("doctorRegistration", v)}
                />
                <Input
                  label="Specialty"
                  value={form.doctorSpecialty}
                  onChange={(v) => set("doctorSpecialty", v)}
                />
                <Input
                  label="Clinic Name"
                  value={form.clinicName}
                  onChange={(v) => set("clinicName", v)}
                />
                <Input
                  label="Phone"
                  value={form.clinicPhone}
                  onChange={(v) => set("clinicPhone", v)}
                />
                <div className="col-span-2">
                  <Input
                    label="Clinic Address"
                    value={form.clinicAddress}
                    onChange={(v) => set("clinicAddress", v)}
                  />
                </div>
              </div>
            </fieldset>

            {/* Patient Info */}
            <fieldset className="rounded-xl border border-gray-200 p-4">
              <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Patient Details
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Patient Name *"
                  value={form.patientName}
                  onChange={(v) => set("patientName", v)}
                  required
                />
                <Input
                  label="Age"
                  value={form.patientAge}
                  onChange={(v) => set("patientAge", v)}
                  placeholder="34 years"
                />
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Gender
                  </label>
                  <select
                    value={form.patientGender}
                    onChange={(e) => set("patientGender", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <Input
                  label="Patient ID"
                  value={form.patientId || ""}
                  onChange={(v) => set("patientId", v)}
                />
              </div>
            </fieldset>

            {/* Clinical */}
            <fieldset className="rounded-xl border border-gray-200 p-4">
              <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Clinical Information
              </legend>
              <div className="space-y-3">
                <TextArea
                  label="Symptoms"
                  value={form.symptoms || ""}
                  onChange={(v) => set("symptoms", v)}
                  rows={2}
                />
                <TextArea
                  label="Diagnosis *"
                  value={form.diagnosis}
                  onChange={(v) => set("diagnosis", v)}
                  rows={2}
                  required
                />
              </div>
            </fieldset>

            {/* Medications */}
            <fieldset className="rounded-xl border border-gray-200 p-4">
              <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Medications
              </legend>
              <div className="space-y-3">
                {form.medications.map((med, i) => (
                  <div
                    key={i}
                    className="relative rounded-lg border border-gray-100 bg-gray-50 p-3"
                  >
                    {form.medications.length > 1 && (
                      <button
                        onClick={() => removeMed(i)}
                        className="absolute right-2 top-2 text-red-400 hover:text-red-600"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Input
                          label={`Medicine ${i + 1} *`}
                          value={med.name}
                          onChange={(v) => setMed(i, "name", v)}
                          placeholder="Amoxicillin 500mg"
                        />
                      </div>
                      <Input
                        label="Dose"
                        value={med.dose}
                        onChange={(v) => setMed(i, "dose", v)}
                        placeholder="1 tablet"
                      />
                      <Input
                        label="Frequency"
                        value={med.frequency}
                        onChange={(v) => setMed(i, "frequency", v)}
                        placeholder="3 times daily"
                      />
                      <Input
                        label="Duration"
                        value={med.duration}
                        onChange={(v) => setMed(i, "duration", v)}
                        placeholder="7 days"
                      />
                      <Input
                        label="Instructions"
                        value={med.instructions || ""}
                        onChange={(v) => setMed(i, "instructions", v)}
                        placeholder="After meals"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addMed}
                  className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50"
                >
                  + Add Medication
                </button>
              </div>
            </fieldset>

            {/* Tests */}
            <fieldset className="rounded-xl border border-gray-200 p-4">
              <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Tests Recommended
              </legend>
              <div className="flex flex-wrap gap-2">
                {(form.tests || []).map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                  >
                    {t}
                    <button onClick={() => removeTest(i)} className="ml-1 hover:text-red-500">
                      x
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTest())}
                  placeholder="CBC, X-Ray..."
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
                <button
                  type="button"
                  onClick={addTest}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
            </fieldset>

            {/* Advice & Follow-up */}
            <fieldset className="rounded-xl border border-gray-200 p-4">
              <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Advice & Follow-up
              </legend>
              <div className="space-y-3">
                <TextArea
                  label="Advice"
                  value={form.advice || ""}
                  onChange={(v) => set("advice", v)}
                  rows={2}
                />
                <Input
                  label="Follow-up"
                  value={form.followUp || ""}
                  onChange={(v) => set("followUp", v)}
                  placeholder="Review after 7 days"
                />
              </div>
            </fieldset>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="hidden border-l border-gray-200 bg-gray-100 lg:flex lg:w-1/2 lg:flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Live Preview
            </h3>
            <button
              onClick={handlePrint}
              disabled={!isValid}
              className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-40"
            >
              Print / Save PDF
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div
              ref={printRef}
              className="mx-auto w-full max-w-[210mm] bg-white shadow-lg"
              style={{ minHeight: "297mm" }}
            >
              <PrescriptionRenderer template={template} data={form} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small form helpers                                                */
/* ------------------------------------------------------------------ */

function Input({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </label>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </label>
      <textarea
        required={required}
        rows={rows || 3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function DoctorPrescriptionsPage() {
  const [selectedId, select] = useSelectedTemplate();
  const [filterStyle, setFilterStyle] = useState<string>("all");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);

  const filtered =
    filterStyle === "all"
      ? PRESCRIPTION_TEMPLATES
      : PRESCRIPTION_TEMPLATES.filter((t) => t.style === filterStyle);

  const previewTpl = previewId
    ? PRESCRIPTION_TEMPLATES.find((t) => t.id === previewId)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/doctor"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Prescription Templates
                </h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  Choose a design, then write prescriptions with live preview
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setWriting(true)}
            className="btn-primary !py-2.5 !text-sm flex items-center gap-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Write Prescription
          </button>
        </div>

        {/* Active template banner */}
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-5 py-3">
          <div
            className="h-4 w-4 rounded-full"
            style={{
              backgroundColor:
                PRESCRIPTION_TEMPLATES.find((t) => t.id === selectedId)
                  ?.accentColor || "#0E7490",
            }}
          />
          <p className="text-sm text-primary-800">
            <span className="font-semibold">Active template:</span>{" "}
            {PRESCRIPTION_TEMPLATES.find((t) => t.id === selectedId)?.name ||
              "Classic Blue"}
          </p>
        </div>

        {/* Style Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {["all", "classic", "modern", "minimal", "colorful", "professional"].map(
            (s) => (
              <button
                key={s}
                onClick={() => setFilterStyle(s)}
                className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  filterStyle === s
                    ? "bg-primary-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {s === "all" ? "All Styles" : STYLE_LABELS[s] || s}
              </button>
            )
          )}
        </div>

        {/* Template Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              tpl={tpl}
              isActive={tpl.id === selectedId}
              onSelect={() => select(tpl.id)}
              onPreview={() => setPreviewId(tpl.id)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
            No templates match this filter.
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTpl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setPreviewId(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {previewTpl.name}
                </h3>
                <p className="text-xs text-gray-500">{previewTpl.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    select(previewTpl.id);
                    setPreviewId(null);
                  }}
                  className={`btn-primary !py-2 !px-5 !text-sm ${
                    previewTpl.id === selectedId ? "opacity-50" : ""
                  }`}
                >
                  {previewTpl.id === selectedId
                    ? "Currently Active"
                    : "Use This Template"}
                </button>
                <button
                  onClick={() => setPreviewId(null)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
              <div
                className="mx-auto w-full max-w-[210mm] bg-white shadow-lg"
                style={{ minHeight: "297mm" }}
              >
                <PrescriptionRenderer
                  template={previewTpl}
                  data={SAMPLE_PRESCRIPTION}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Write Prescription Modal */}
      {writing && (
        <WritePrescriptionModal
          templateId={selectedId}
          onClose={() => setWriting(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Template Card                                                     */
/* ------------------------------------------------------------------ */

function TemplateCard({
  tpl,
  isActive,
  onSelect,
  onPreview,
}: {
  tpl: PrescriptionTemplate;
  isActive: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all hover:shadow-md ${
        isActive ? "border-primary-500 ring-2 ring-primary-500/20" : "border-gray-100"
      }`}
    >
      {isActive && (
        <div className="absolute right-3 top-3 z-10 rounded-full bg-primary-600 p-1">
          <svg
            className="h-3.5 w-3.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}

      {/* Mini Preview */}
      <div
        className="relative h-48 overflow-hidden"
        style={{ backgroundColor: tpl.previewBg }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: "scale(0.25)", transformOrigin: "top center" }}
        >
          <div style={{ width: "210mm", minHeight: "297mm" }}>
            <PrescriptionRenderer
              template={tpl}
              data={SAMPLE_PRESCRIPTION}
            />
          </div>
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
          <button
            onClick={onPreview}
            className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-900 shadow-lg hover:bg-gray-50"
          >
            Preview
          </button>
          {!isActive && (
            <button
              onClick={onSelect}
              className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-primary-700"
            >
              Use This
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="mb-1 flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: tpl.accentColor }}
          />
          <h3 className="text-sm font-bold text-gray-900">{tpl.name}</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium capitalize text-gray-500">
            {tpl.style}
          </span>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2">{tpl.description}</p>
      </div>
    </div>
  );
}
