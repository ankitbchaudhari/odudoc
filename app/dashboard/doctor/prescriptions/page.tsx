"use client";

import { useState, useRef, useEffect } from "react";
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
import {
  COMMON_SYMPTOMS,
  COMMON_DIAGNOSES,
  COMMON_MEDICINES,
  COMMON_DOSES,
  COMMON_FREQUENCIES,
  COMMON_DURATIONS,
  COMMON_INSTRUCTIONS,
  COMMON_TESTS,
} from "@/lib/medical-suggestions";

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
  initialData,
}: {
  templateId: string;
  onClose: () => void;
  /** When the doctor reaches this modal via AI assistant or voice
   *  prescription, those flows hand off a pre-filled draft via
   *  sessionStorage. We merge it over the empty defaults so the
   *  doctor can review + tweak instead of re-typing everything. */
  initialData?: Partial<PrescriptionData>;
}) {
  const { data: session } = useSession();
  const printRef = useRef<HTMLDivElement>(null);
  const template = getTemplateById(templateId) || PRESCRIPTION_TEMPLATES[0];

  // Locked identity block — pulled from the doctor's profile on
  // mount. Doctors enter these once during registration; allowing
  // ad-hoc edits per prescription would let stale or fake data
  // leak onto official Rx documents. To change them they must
  // contact support, who updates the source profile.
  const [form, setForm] = useState<PrescriptionData>(() => {
    const base: PrescriptionData = {
      doctorName: session?.user?.name || "Dr. ",
      doctorQualification: "",
      doctorRegistration: "",
      doctorSpecialty: "",
      clinicName: "OduDoc E Medical Center",
      clinicAddress: "8 The Green, Suite A, Dover, DE 19901, United States",
      clinicPhone: "+1 (302) 899-2625",
      clinicEmail: session?.user?.email || "support@odudoc.com",
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
    };
    if (!initialData) return base;
    // Only overlay non-empty values so the AI/voice draft can't blank
    // out doctor identity defaults.
    const merged = { ...base };
    (Object.keys(initialData) as Array<keyof PrescriptionData>).forEach((k) => {
      const v = initialData[k];
      if (v === undefined || v === null) return;
      if (Array.isArray(v) && v.length === 0) return;
      if (typeof v === "string" && v.trim() === "") return;
      // @ts-expect-error -- generic key/value assignment
      merged[k] = v;
    });
    // Medications: only override if the draft actually has at least one
    // named drug; otherwise keep the empty starter row.
    if (Array.isArray(initialData.medications)) {
      const real = initialData.medications.filter((m) => m && m.name && m.name.trim());
      if (real.length > 0) merged.medications = real;
    }
    return merged;
  });

  const [testInput, setTestInput] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Pull verified identity + clinic details from the doctor's profile
  // and lock the corresponding form fields. Authoritative source of
  // truth — anything missing here is something they need to add to
  // their profile (or ask support to add for them) before issuing
  // prescriptions, not something they should type freehand on each Rx.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/doctors/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.doctor) return;
        const d = j.doctor as {
          name?: string;
          email?: string;
          specialty?: string;
          qualifications?: string;
          licenseNumber?: string;
          location?: string;
          city?: string;
          phone?: string;
        };
        setForm((prev) => ({
          ...prev,
          doctorName: d.name || prev.doctorName,
          doctorQualification: d.qualifications || prev.doctorQualification,
          doctorRegistration: d.licenseNumber || prev.doctorRegistration,
          doctorSpecialty: d.specialty || prev.doctorSpecialty,
          clinicAddress:
            [d.location, d.city].filter(Boolean).join(", ") ||
            prev.clinicAddress,
          clinicPhone: d.phone || prev.clinicPhone,
          clinicEmail: d.email || prev.clinicEmail,
          signature: d.name || prev.signature,
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  const openPrintWindow = () => {
    if (!printRef.current) return;
    // Use a hidden iframe instead of window.open. Reasons:
    //   1. Pop-up blockers kill window.open after an `await` because
    //      it's no longer in the user-gesture stack (PDF / Save & Print
    //      both await the save first).
    //   2. The previous code closed the new window 400ms after print
    //      was called, which often dismissed the print dialog before
    //      the doctor could pick "Save as PDF".
    //   3. An iframe inherits the parent's tab so we can inject the
    //      app's actual stylesheets, ensuring the printed Rx looks
    //      like the on-screen preview.
    const html = printRef.current.innerHTML;

    // Carry over stylesheets from the host document so Tailwind /
    // app fonts apply inside the iframe. <link rel=stylesheet> is
    // honoured; `<style>` tags get copied verbatim.
    const styleNodes = Array.from(
      document.querySelectorAll<HTMLElement>('link[rel="stylesheet"], style'),
    )
      .map((n) => n.outerHTML)
      .join("\n");

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      return;
    }
    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><title>Prescription - ${form.patientName || "Patient"}</title>${styleNodes}<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact}@media print{body{margin:0}}</style></head><body>${html}</body></html>`,
    );
    doc.close();

    const cleanup = () => {
      try {
        iframe.remove();
      } catch {
        /* already removed */
      }
    };

    const triggerPrint = () => {
      // Give linked stylesheets a beat to finish loading. 350ms is
      // enough on every modern browser without making the wait feel
      // perceptible.
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[Rx] print() failed", err);
        }
        // Some browsers (Chrome) fire afterprint as soon as the
        // dialog closes; others (Safari) don't. Fall back to a
        // generous 60s remove so we don't leak iframes.
        const w = iframe.contentWindow;
        const removeOnDone = () => cleanup();
        try {
          w?.addEventListener("afterprint", removeOnDone, { once: true });
        } catch {
          /* cross-origin paranoia, never hits same-origin iframe */
        }
        setTimeout(cleanup, 60_000);
      }, 350);
    };

    if (iframe.contentDocument?.readyState === "complete") {
      triggerPrint();
    } else {
      iframe.addEventListener("load", triggerPrint, { once: true });
    }
  };

  // Save first (so the record exists for the patient / admin audit) and only
  // take the follow-up action after a successful persist. If save fails we
  // surface the error — avoids the "printed but nothing stored" trap.
  const saveRx = async (notifyPatient = false): Promise<boolean> => {
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientEmail: patientEmail.trim(),
          templateId,
          data: form,
          notifyPatient,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Save failed (${res.status})`);
      }
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndPrint = async () => {
    if (await saveRx(false)) openPrintWindow();
  };

  // "Save as PDF" uses the same print window — browser's print dialog exposes
  // a "Save as PDF" destination on every major platform (Chrome, Safari, Edge,
  // Firefox). This just labels the button so doctors know they can pick PDF.
  const handleSaveAsPdf = async () => {
    if (await saveRx(false)) openPrintWindow();
  };

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSendToPatient = async () => {
    if (await saveRx(true)) {
      showToast(`Prescription emailed to ${patientEmail.trim()}`);
    }
  };

  const handleShare = async () => {
    const saved = await saveRx(false);
    if (!saved) return;
    const url = `${window.location.origin}/dashboard/prescriptions`;
    const shareText = `Prescription from ${form.doctorName || "OduDoc"} for ${
      form.patientName
    } — view it in your OduDoc dashboard.`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title: "OduDoc Prescription",
          text: shareText,
          url,
        });
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      showToast("Shareable link copied to clipboard");
    } catch {
      showToast("Saved — open the dashboard to share the link");
    }
  };

  const isValid =
    form.patientName &&
    form.diagnosis &&
    form.medications[0]?.name &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-2xl">
          {toast}
        </div>
      )}
      <div
        className="flex h-full w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Form */}
        <div className="w-full overflow-y-auto bg-white dark:bg-slate-900 p-6 lg:w-1/2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
              Write Prescription
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 dark:text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:text-slate-300"
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

          {/* Shared datalists — HTML5 native autocomplete for every matching input */}
          <datalist id="dl-medicines">
            {COMMON_MEDICINES.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <datalist id="dl-doses">
            {COMMON_DOSES.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <datalist id="dl-frequencies">
            {COMMON_FREQUENCIES.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <datalist id="dl-durations">
            {COMMON_DURATIONS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <datalist id="dl-instructions">
            {COMMON_INSTRUCTIONS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <datalist id="dl-tests">
            {COMMON_TESTS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>

          <div className="space-y-5">
            {/* Doctor Info — locked. Authoritative source is the
                doctor's profile (set at registration / verification).
                Editing on a per-Rx basis would let stale or
                falsified credentials onto the printed document. */}
            <fieldset className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 p-4">
              <legend className="flex items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                <span aria-hidden="true">🔒</span> Doctor Details · pre-filled
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <ReadOnlyField label="Name" value={form.doctorName} />
                <ReadOnlyField
                  label="Qualification"
                  value={form.doctorQualification}
                  empty="Add via your profile"
                />
                <ReadOnlyField
                  label="Registration No."
                  value={form.doctorRegistration}
                  empty="Pending verification"
                />
                <ReadOnlyField
                  label="Specialty"
                  value={form.doctorSpecialty}
                />
                <ReadOnlyField label="Clinic Name" value={form.clinicName} />
                <ReadOnlyField
                  label="Phone"
                  value={form.clinicPhone}
                  empty="Add via your profile"
                />
                <div className="col-span-2">
                  <ReadOnlyField
                    label="Clinic Address"
                    value={form.clinicAddress}
                    empty="Add via your profile"
                  />
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-emerald-800">
                These details come from your verified profile and can&apos;t be
                edited per-prescription. To change them,{" "}
                <a
                  href="mailto:support@odudoc.com?subject=Update%20my%20prescription%20identity%20details"
                  className="font-semibold underline hover:text-emerald-900"
                >
                  contact support
                </a>
                {" "}or update fields like address &amp; phone on{" "}
                <Link
                  href="/dashboard/doctor/profile"
                  className="font-semibold underline hover:text-emerald-900"
                >
                  your profile
                </Link>
                .
              </p>
            </fieldset>

            {/* Patient Info */}
            <fieldset className="rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
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
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300">
                    Gender
                  </label>
                  <select
                    value={form.patientGender}
                    onChange={(e) => set("patientGender", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
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
                <div className="col-span-2">
                  <Input
                    label="Patient Email *"
                    value={patientEmail}
                    onChange={setPatientEmail}
                    placeholder="patient@example.com"
                    required
                  />
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
                    Must match the email they use to sign in — this is how the
                    patient&apos;s dashboard finds this prescription.
                  </p>
                </div>
              </div>
            </fieldset>

            {/* Clinical */}
            <fieldset className="rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Clinical Information
              </legend>
              <div className="space-y-4">
                <div>
                  <TextArea
                    label="Symptoms"
                    value={form.symptoms || ""}
                    onChange={(v) => set("symptoms", v)}
                    rows={2}
                  />
                  <ChipPicker
                    options={COMMON_SYMPTOMS}
                    current={form.symptoms || ""}
                    onPick={(v) => set("symptoms", appendToField(form.symptoms || "", v))}
                  />
                </div>
                <div>
                  <TextArea
                    label="Diagnosis *"
                    value={form.diagnosis}
                    onChange={(v) => set("diagnosis", v)}
                    rows={2}
                    required
                  />
                  <ChipPicker
                    options={COMMON_DIAGNOSES}
                    current={form.diagnosis}
                    onPick={(v) => set("diagnosis", appendToField(form.diagnosis, v))}
                  />
                </div>
              </div>
            </fieldset>

            {/* Medications */}
            <fieldset className="rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Medications
              </legend>
              <div className="space-y-3">
                {form.medications.map((med, i) => (
                  <div
                    key={i}
                    className="relative rounded-lg border border-gray-100 bg-gray-50 dark:bg-slate-900 p-3"
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
                          listId="dl-medicines"
                        />
                      </div>
                      <Input
                        label="Dose"
                        value={med.dose}
                        onChange={(v) => setMed(i, "dose", v)}
                        placeholder="1 tablet"
                        listId="dl-doses"
                      />
                      <Input
                        label="Frequency"
                        value={med.frequency}
                        onChange={(v) => setMed(i, "frequency", v)}
                        placeholder="3 times daily"
                        listId="dl-frequencies"
                      />
                      <Input
                        label="Duration"
                        value={med.duration}
                        onChange={(v) => setMed(i, "duration", v)}
                        placeholder="7 days"
                        listId="dl-durations"
                      />
                      <Input
                        label="Instructions"
                        value={med.instructions || ""}
                        onChange={(v) => setMed(i, "instructions", v)}
                        placeholder="After meals"
                        listId="dl-instructions"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addMed}
                  className="w-full rounded-lg border border-dashed border-gray-300 dark:border-slate-700 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50"
                >
                  + Add Medication
                </button>
              </div>
            </fieldset>

            {/* Tests */}
            <fieldset className="rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
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
                  list="dl-tests"
                  className="flex-1 rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
                <button
                  type="button"
                  onClick={addTest}
                  className="rounded-lg bg-gray-100 dark:bg-slate-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
            </fieldset>

            {/* Advice & Follow-up */}
            <fieldset className="rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
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
        <div className="hidden border-l border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-slate-800 lg:flex lg:w-1/2 lg:flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                Live Preview
              </h3>
              {saveError && (
                <p className="mt-0.5 text-[11px] text-red-600">{saveError}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSaveAsPdf}
                disabled={!isValid || saving}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-300 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40"
                title="Save as PDF (choose 'Save as PDF' as the destination in the print dialog)"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF
              </button>
              <button
                onClick={handleShare}
                disabled={!isValid || saving}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-300 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40"
                title="Share a link to this prescription"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
              <button
                onClick={handleSendToPatient}
                disabled={!isValid || saving}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
                title="Save and email the prescription to the patient"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </button>
              <button
                onClick={handleSaveAndPrint}
                disabled={!isValid || saving}
                className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save & Print"}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div
              ref={printRef}
              className="mx-auto w-full max-w-[210mm] bg-white dark:bg-slate-900 shadow-lg"
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
  listId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  listId?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300">
        {label}
      </label>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        className="w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
      />
    </div>
  );
}

/**
 * Read-only display field for the locked Doctor Details fieldset.
 * Shows the value (or a hint when empty) in a non-editable styled
 * box with a subtle lock indicator. Doctors can't tab into it.
 */
function ReadOnlyField({
  label,
  value,
  empty,
}: {
  label: string;
  value: string;
  empty?: string;
}) {
  const hasValue = !!value && value.trim().length > 0;
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-xs font-medium text-emerald-800">
        <span aria-hidden="true" className="text-[10px]">🔒</span>
        {label}
      </label>
      <div
        aria-readonly="true"
        className={`flex min-h-[38px] items-center rounded-lg border border-emerald-200 bg-white/80 px-3 py-2 text-sm ${
          hasValue ? "text-slate-800 dark:text-slate-200" : "text-slate-400 italic"
        }`}
      >
        {hasValue ? value : empty || "—"}
      </div>
    </div>
  );
}

/**
 * Clickable suggestion chips rendered below a free-text field. Tapping a chip
 * appends that term to the field (comma-separated), so doctors can build up a
 * symptom/diagnosis list without typing each one. Chips already present in
 * the field are hidden to avoid duplicate adds.
 */
function ChipPicker({
  options,
  current,
  onPick,
  limit = 12,
}: {
  options: string[];
  current: string;
  onPick: (v: string) => void;
  limit?: number;
}) {
  const picked = current
    .toLowerCase()
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const available = options
    .filter((o) => !picked.includes(o.toLowerCase()))
    .slice(0, limit);
  if (available.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {available.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onPick(opt)}
          className="rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-0.5 text-[11px] text-gray-600 dark:text-slate-300 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
        >
          + {opt}
        </button>
      ))}
    </div>
  );
}

function appendToField(current: string, value: string): string {
  const trimmed = current.trim();
  if (!trimmed) return value;
  // Separate with a comma + space; if the current text already ends with a
  // newline or comma, just append.
  if (/[,\n]\s*$/.test(current)) return current + value;
  return `${trimmed}, ${value}`;
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
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300">
        {label}
      </label>
      <textarea
        required={required}
        rows={rows || 3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
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
  const [draft, setDraft] = useState<Partial<PrescriptionData> | null>(null);
  const [draftSource, setDraftSource] = useState<"ai" | "voice" | null>(null);

  // On mount, pick up any draft handed off from /ai-prescription or
  // /voice-prescription. Both flows write to sessionStorage and
  // navigate here with a marker query param. Auto-open the editor so
  // the doctor's next click is "Finish", not "now where do I go?".
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromAi = params.get("ai") === "1";
    const fromVoice = params.get("voice") === "1";
    if (!fromAi && !fromVoice) return;
    const key = fromAi ? "ai-rx-draft" : "voice-rx-draft";
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PrescriptionData>;
      setDraft(parsed);
      setDraftSource(fromAi ? "ai" : "voice");
      sessionStorage.removeItem(key); // single-use
    } catch {
      // ignore — corrupted draft just means we render the empty form
    }
  }, []);

  const filtered =
    filterStyle === "all"
      ? PRESCRIPTION_TEMPLATES
      : PRESCRIPTION_TEMPLATES.filter((t) => t.style === filterStyle);

  const previewTpl = previewId
    ? PRESCRIPTION_TEMPLATES.find((t) => t.id === previewId)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-fuchsia-300/20 blur-2xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/doctor"
                className="rounded-lg bg-white/15 p-2 text-white backdrop-blur-sm hover:bg-white/25"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <p className="text-sm font-medium text-white/80">Prescription Designs ✨</p>
                <h1 className="mt-1 text-3xl font-bold md:text-4xl">Choose a Template</h1>
                <p className="mt-1 max-w-lg text-sm text-white/80">
                  Pick a design you love — your prescriptions will use it
                  automatically with a live preview as you type.
                </p>
              </div>
            </div>
            <button
              onClick={() => setWriting(true)}
              className="flex items-center gap-2 self-start rounded-xl bg-white dark:bg-slate-900 px-5 py-3 text-sm font-semibold text-primary-700 shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg sm:self-auto"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Write Prescription
            </button>
          </div>
        </div>

        {/* Draft handoff banner — only shows when the doctor arrived
            here via AI assistant or voice prescription. Acts as a
            visual confirmation that their work carried over. */}
        {draft && draftSource && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-md">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h6" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    {draftSource === "ai" ? "AI assistant draft ready" : "Voice dictation ready"}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-700 dark:text-slate-300">
                    Pick a template below, then click <b>Finish &amp; Open Editor</b> to review and send.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWriting(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40"
              >
                Finish &amp; Open Editor
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* Active template banner */}
        {(() => {
          const active = PRESCRIPTION_TEMPLATES.find((t) => t.id === selectedId) || PRESCRIPTION_TEMPLATES[0];
          return (
            <div
              className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 bg-white dark:bg-slate-900 p-4 shadow-sm"
              style={{ borderColor: active.accentColor }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md"
                  style={{ background: active.accentColor }}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Active template</p>
                  <p className="text-base font-bold text-gray-900 dark:text-slate-100">{active.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-block">
                  {PRESCRIPTION_TEMPLATES.length} designs available
                </span>
                <button
                  onClick={() => setWriting(true)}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: active.accentColor }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Finish &amp; Open Editor
                  <span>→</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* Style Filters */}
        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-sm ring-1 ring-gray-100">
          {["all", "classic", "modern", "minimal", "colorful", "professional"].map(
            (s) => {
              const count =
                s === "all"
                  ? PRESCRIPTION_TEMPLATES.length
                  : PRESCRIPTION_TEMPLATES.filter((t) => t.style === s).length;
              const active = filterStyle === s;
              return (
                <button
                  key={s}
                  onClick={() => setFilterStyle(s)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold capitalize transition-all ${
                    active
                      ? "bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md"
                      : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {s === "all" ? "All Styles" : STYLE_LABELS[s] || s}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      active ? "bg-white/25" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            }
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
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-sm text-gray-400 dark:text-slate-500 dark:text-slate-400">
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
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                  {previewTpl.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">{previewTpl.description}</p>
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
                  className="rounded-lg p-2 text-gray-400 dark:text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
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
            <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-slate-800 p-6">
              <div
                className="mx-auto w-full max-w-[210mm] bg-white dark:bg-slate-900 shadow-lg"
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
          onClose={() => {
            setWriting(false);
            // Drop the draft once the modal closes so re-opening
            // /prescriptions later starts clean.
            setDraft(null);
            setDraftSource(null);
          }}
          initialData={draft || undefined}
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
      className={`group relative overflow-hidden rounded-2xl border-2 bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        isActive
          ? "scale-[1.01] shadow-lg"
          : "border-gray-100"
      }`}
      style={
        isActive
          ? {
              borderColor: tpl.accentColor,
              boxShadow: `0 10px 25px -5px ${tpl.accentColor}33, 0 8px 10px -6px ${tpl.accentColor}22`,
            }
          : undefined
      }
    >
      {/* Active check badge */}
      {isActive && (
        <div
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-lg ring-2 ring-white"
          style={{ backgroundColor: tpl.accentColor }}
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
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}

      {/* Accent top bar */}
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${tpl.accentColor}, ${tpl.accentColor}80)`,
        }}
      />

      {/* Mini Preview */}
      <div
        className="relative h-48 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${tpl.previewBg} 0%, ${tpl.accentColor}15 100%)`,
        }}
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
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 transition-all duration-300 group-hover:opacity-100">
          <button
            onClick={onPreview}
            className="rounded-lg bg-white/95 px-4 py-2 text-xs font-semibold text-gray-900 dark:text-slate-100 shadow-lg backdrop-blur hover:bg-white dark:hover:bg-slate-800"
          >
            👁 Preview
          </button>
          {!isActive && (
            <button
              onClick={onSelect}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-lg transition-transform hover:scale-105"
              style={{ backgroundColor: tpl.accentColor }}
            >
              ✓ Use This
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="mb-1.5 flex items-center gap-2">
          <div
            className="h-3 w-3 flex-shrink-0 rounded-full ring-2 ring-offset-1"
            style={{
              backgroundColor: tpl.accentColor,
              boxShadow: `0 0 0 2px ${tpl.accentColor}22`,
            }}
          />
          <h3 className="truncate text-sm font-bold text-gray-900 dark:text-slate-100">{tpl.name}</h3>
          <span
            className="ml-auto flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
            style={{
              backgroundColor: `${tpl.accentColor}15`,
              color: tpl.accentColor,
            }}
          >
            {tpl.style}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-gray-500 dark:text-slate-400 line-clamp-2">
          {tpl.description}
        </p>
      </div>
    </div>
  );
}
