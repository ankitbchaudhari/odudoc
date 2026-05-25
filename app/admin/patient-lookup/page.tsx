// Dedicated /admin/patient-lookup page — the full-page surface for
// the universal patient finder. Same widget that the header launcher
// opens, just sitting in its own page so it can be deep-linked and
// bookmarked. Available to every admin role; what each role can SEE
// in the results is governed by lib/patient-acl.

import PatientSearch from "@/components/admin/PatientSearch";

export const metadata = {
  title: "Find a patient — OduDoc admin",
};

export default function AdminPatientLookup() {
  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-gray-800 to-zinc-900 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z"
              />
            </svg>
            Patient lookup
          </div>
          <h1 className="text-2xl font-bold">Find a patient</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/90">
            Search the patients in your organisation by mobile number,
            name, OduDoc / MRN ID, insurance policy, or government ID.
            Your role determines which fields are visible in the
            result — e.g. pharmacists see prescription-related info but
            not demographics.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-slate-900 dark:ring-slate-800">
        <PatientSearch />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Tip
          title="Tip"
          body="Ctrl/Cmd + K from any admin page opens the same lookup in a modal."
        />
        <Tip
          title="Why is a field hidden?"
          body="Field visibility follows lib/patient-acl. Reception sees demographics; pharmacists see prescriptions; billing sees bills. Super-admin sees everything."
        />
        <Tip
          title="Org scope"
          body="Only patients on file with your active organisation are shown. Super-admins can pass ?orgId= to search any tenant."
        />
      </div>
    </div>
  );
}

function Tip({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <p className="font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-1 leading-relaxed">{body}</p>
    </div>
  );
}
