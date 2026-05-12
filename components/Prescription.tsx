"use client";

interface PrescriptionProps {
  doctorName: string;
  doctorSpecialty: string;
  patientName: string;
  date: string;
}

const mockMedications = [
  { name: "Amoxicillin 500mg", dosage: "1 tablet", frequency: "3 times daily", duration: "7 days", instructions: "Take after meals" },
  { name: "Ibuprofen 400mg", dosage: "1 tablet", frequency: "As needed", duration: "5 days", instructions: "Take with food, max 3 per day" },
  { name: "Vitamin D3 1000IU", dosage: "1 capsule", frequency: "Once daily", duration: "30 days", instructions: "Take in the morning" },
];

export default function Prescription({ doctorName, doctorSpecialty, patientName, date }: PrescriptionProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Prescription document */}
      <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm print:border-0 print:shadow-none">
        {/* Header */}
        <div className="border-b-2 border-primary-600 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary-600">OduDoc</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Digital Health Platform</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Rx</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Prescription #{Date.now().toString(36).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Doctor & Patient Info */}
        <div className="mt-4 grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
          <div>
            <p className="text-xs font-medium uppercase text-gray-400 dark:text-slate-500">Prescribing Doctor</p>
            <p className="font-semibold text-gray-900 dark:text-slate-100">{doctorName}</p>
            <p className="text-sm text-gray-600 dark:text-slate-300">{doctorSpecialty}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">Reg. No: ODUDOC-{Math.random().toString(36).slice(2, 8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase text-gray-400 dark:text-slate-500">Patient</p>
            <p className="font-semibold text-gray-900 dark:text-slate-100">{patientName}</p>
            <p className="text-sm text-gray-600 dark:text-slate-300">Date: {date}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">Via: Video Consultation</p>
          </div>
        </div>

        {/* Medications */}
        <div className="mt-6">
          <h3 className="mb-4 font-semibold text-gray-900 dark:text-slate-100">Medications</h3>
          <div className="space-y-4">
            {mockMedications.map((med, i) => (
              <div key={i} className="rounded-lg bg-gray-50 dark:bg-slate-900 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {i + 1}. {med.name}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-600 dark:text-slate-300">
                      <span>Dosage: {med.dosage}</span>
                      <span>Frequency: {med.frequency}</span>
                      <span>Duration: {med.duration}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Note: {med.instructions}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h3 className="text-sm font-semibold text-blue-900">General Instructions</h3>
          <ul className="mt-2 space-y-1 text-sm text-blue-800">
            <li>- Complete the full course of antibiotics even if symptoms improve</li>
            <li>- Drink plenty of fluids and get adequate rest</li>
            <li>- Schedule a follow-up if symptoms persist after 5 days</li>
            <li>- Contact emergency services if condition worsens</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-gray-100 pt-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-500">This is a digitally generated prescription from a teleconsultation.</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">Valid for 30 days from the date of issue.</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-900 dark:text-slate-100">{doctorName}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Digital Signature</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons (hidden in print) */}
      <div className="mt-6 flex justify-center gap-4 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>
        <button
          onClick={() => alert("PDF download will be available with backend integration.")}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF
        </button>
      </div>
    </div>
  );
}
