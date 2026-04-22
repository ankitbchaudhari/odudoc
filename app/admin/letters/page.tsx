"use client";

// Admin HR letters — generate appointment or experience letters for any
// doctor on file. The form collects the variable fields and posts to
// /api/admin/letters; the server persists the record and the UI opens the
// print-ready view in a new tab where the admin can hit Ctrl+P / "Save as
// PDF" to hand the letter to the doctor.

import { useEffect, useMemo, useState } from "react";

interface DoctorRow {
  id: string;
  name: string;
  email: string;
  specialty: string;
  phone?: string;
}

interface LetterRow {
  id: string;
  type: "appointment" | "experience";
  doctorId: string;
  doctorName: string;
  designation: string;
  referenceNo: string;
  createdAt: string;
  issuedOn: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function AdminLettersPage() {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [letters, setLetters] = useState<LetterRow[]>([]);
  const [type, setType] = useState<"appointment" | "experience">("appointment");
  const [doctorId, setDoctorId] = useState("");
  const [designation, setDesignation] = useState("Consultant Physician");
  const [department, setDepartment] = useState("");
  const [signedBy, setSignedBy] = useState("HR Manager");
  const [signedByTitle, setSignedByTitle] = useState("Head of People, OduDoc");
  const [notes, setNotes] = useState("");

  // Appointment fields
  const [joiningDate, setJoiningDate] = useState(todayIso());
  const [ctcAnnual, setCtcAnnual] = useState("");
  const [probationMonths, setProbationMonths] = useState("3");
  const [noticePeriodDays, setNoticePeriodDays] = useState("30");
  const [workLocation, setWorkLocation] = useState("Remote / OduDoc Virtual Clinic");

  // Experience fields
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(todayIso());
  const [conductRemarks, setConductRemarks] = useState(
    "Throughout this tenure the doctor discharged all duties with integrity, diligence, and professionalism.",
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/doctors")
      .then((r) => r.json())
      .then((d) => setDoctors(Array.isArray(d.doctors) ? d.doctors : []))
      .catch(() => setDoctors([]));
    fetch("/api/admin/letters")
      .then((r) => r.json())
      .then((d) => setLetters(Array.isArray(d.letters) ? d.letters : []))
      .catch(() => setLetters([]));
  }, []);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === doctorId),
    [doctors, doctorId],
  );

  // Prefill department from the selected doctor's specialty.
  useEffect(() => {
    if (selectedDoctor && !department) setDepartment(selectedDoctor.specialty);
  }, [selectedDoctor, department]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);

    if (!doctorId) return setError("Select a doctor.");
    if (type === "appointment" && !joiningDate) return setError("Joining date is required.");
    if (type === "experience") {
      if (!startDate || !endDate) return setError("Start and end dates are required.");
      if (new Date(endDate) < new Date(startDate)) return setError("End date must be after start date.");
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        type, doctorId, designation, department, signedBy, signedByTitle,
        notes: notes || undefined,
      };
      if (type === "appointment") {
        payload.joiningDate = joiningDate;
        if (ctcAnnual) payload.ctcAnnual = Number(ctcAnnual);
        if (probationMonths) payload.probationMonths = Number(probationMonths);
        if (noticePeriodDays) payload.noticePeriodDays = Number(noticePeriodDays);
        payload.workLocation = workLocation;
      } else {
        payload.startDate = startDate;
        payload.endDate = endDate;
        payload.conductRemarks = conductRemarks;
      }

      const res = await fetch("/api/admin/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not generate letter.");
        return;
      }
      setOkMsg(`Letter ${data.letter.referenceNo} generated. Opening in a new tab…`);
      setLetters((prev) => [data.letter, ...prev]);
      window.open(`/admin/letters/${data.letter.id}`, "_blank", "noopener");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Doctor Letters</h1>
      <p className="mt-1 text-sm text-gray-500">
        Generate appointment or experience letters. The signed PDF is produced
        from your browser&apos;s print dialog (Ctrl+P → &ldquo;Save as PDF&rdquo;).
      </p>

      <form onSubmit={submit} className="mt-8 space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Type switch */}
        <div className="flex gap-2">
          {(["appointment", "experience"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                type === t
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-gray-200 text-gray-600 hover:border-primary-300"
              }`}
            >
              {t === "appointment" ? "Appointment Letter" : "Experience Letter"}
            </button>
          ))}
        </div>

        {/* Common fields */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Doctor *</label>
            <select
              value={doctorId}
              onChange={(e) => { setDoctorId(e.target.value); setDepartment(""); }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select a doctor…</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.specialty} · {d.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Designation</label>
            <input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Consultant Physician"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Department</label>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="General Medicine"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Signed by (name)</label>
            <input
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">Signatory title</label>
            <input
              value={signedByTitle}
              onChange={(e) => setSignedByTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Type-specific */}
        {type === "appointment" ? (
          <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Joining date *</label>
              <input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)}
                     className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Annual CTC (USD)</label>
              <input type="number" value={ctcAnnual} onChange={(e) => setCtcAnnual(e.target.value)}
                     placeholder="e.g. 90000"
                     className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Probation (months)</label>
              <input type="number" value={probationMonths} onChange={(e) => setProbationMonths(e.target.value)}
                     className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Notice period (days)</label>
              <input type="number" value={noticePeriodDays} onChange={(e) => setNoticePeriodDays(e.target.value)}
                     className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Work location</label>
              <input value={workLocation} onChange={(e) => setWorkLocation(e.target.value)}
                     className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Start date *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                     className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">End date *</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                     className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Conduct remarks</label>
              <textarea rows={3} value={conductRemarks} onChange={(e) => setConductRemarks(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Additional notes (optional)</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any extra clauses, e.g. confidentiality reminder."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {okMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{okMsg}</div>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
                  className="btn-primary disabled:opacity-60">
            {loading ? "Generating…" : `Generate ${type === "appointment" ? "Appointment" : "Experience"} Letter`}
          </button>
        </div>
      </form>

      {/* History */}
      <h2 className="mt-12 text-lg font-bold text-gray-900">Recently generated</h2>
      {letters.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">No letters yet.</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {letters.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{l.referenceNo}</td>
                  <td className="px-4 py-3 capitalize">{l.type}</td>
                  <td className="px-4 py-3">{l.doctorName}</td>
                  <td className="px-4 py-3">{l.designation}</td>
                  <td className="px-4 py-3 text-gray-500">{l.issuedOn}</td>
                  <td className="px-4 py-3 text-right">
                    <a href={`/admin/letters/${l.id}`} target="_blank" rel="noopener noreferrer"
                       className="text-primary-600 hover:underline">Open / Print</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
