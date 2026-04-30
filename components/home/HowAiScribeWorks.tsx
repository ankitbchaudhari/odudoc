// 5-step illustrated walkthrough of the ambient scribe flow.
// Removes the "is this magic or BS?" question by showing the doctor
// exactly what happens between "I clicked record" and "the SOAP note
// is filled in". Each step uses an inline SVG mock of the relevant UI
// state so it reads as concrete even without screenshot assets.

interface Step {
  num: number;
  title: string;
  body: string;
  /** Tailwind classes for the step's accent gradient. */
  accent: string;
  /** Inline SVG mock — kept lightweight, no image deps. */
  mock: React.ReactNode;
}

const STEPS: Step[] = [
  {
    num: 1,
    title: "Get patient consent",
    body: "Click 'Ambient note'. A consent modal opens — explain to the patient that you're recording for note-taking, get their verbal yes, then continue. Consent is stamped to the audit log.",
    accent: "from-violet-500 to-indigo-500",
    mock: (
      <div className="rounded-xl border border-violet-200 bg-white p-3 text-xs">
        <p className="font-bold text-slate-800">Patient consent required</p>
        <p className="mt-1 text-slate-500">The ambient scribe will record audio and transcribe it.</p>
        <ul className="mt-2 space-y-0.5 text-slate-600">
          <li>✓ Tell the patient the visit is being recorded</li>
          <li>✓ Confirm they consent</li>
          <li>✓ Stop before discussing anything off-topic</li>
        </ul>
        <div className="mt-2 flex gap-1.5">
          <button className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-500">Cancel</button>
          <button className="flex-1 rounded-md bg-violet-600 px-2 py-1 text-[10px] text-white">I have consent — start</button>
        </div>
      </div>
    ),
  },
  {
    num: 2,
    title: "Record the consultation",
    body: "Speak naturally. The scribe captures everything in the background while you focus on the patient. Recording rotates every 4 minutes — no memory issues, no Lambda timeouts.",
    accent: "from-rose-500 to-pink-500",
    mock: (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600" />
          </span>
          <span className="font-bold text-rose-800">Stop &amp; transcribe · 4:32</span>
        </div>
        <p className="mt-2 text-[10px] text-rose-700">
          [doctor]: How long has the cough been going on? <br />
          [patient]: Almost two weeks now, doctor. Worse at night...
        </p>
      </div>
    ),
  },
  {
    num: 3,
    title: "AI transcribes + structures",
    body: "Click stop. Audio is sent to Gemini Flash with a clinical system prompt. For long recordings, the chunks are transcribed in parallel then joined. ~10-30 seconds.",
    accent: "from-amber-500 to-orange-500",
    mock: (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 animate-spin text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="font-semibold text-amber-800">Transcribing 3/4 segments…</span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1">
          <div className="h-1 rounded bg-amber-500" />
          <div className="h-1 rounded bg-amber-500" />
          <div className="h-1 rounded bg-amber-500" />
          <div className="h-1 rounded bg-amber-200" />
        </div>
      </div>
    ),
  },
  {
    num: 4,
    title: "SOAP fields auto-fill",
    body: "Chief complaint, S, O, A, P — all filled from the transcript. Vitals if mentioned. The doctor's existing typing is preserved (appended, never overwritten).",
    accent: "from-emerald-500 to-teal-500",
    mock: (
      <div className="rounded-xl border border-emerald-200 bg-white p-3 text-xs">
        <p className="font-bold text-slate-700">Assessment (A)</p>
        <p className="mt-1 rounded bg-emerald-50 p-2 text-[10px] text-slate-700">
          Acute bronchitis, viral aetiology likely. No red flags for pneumonia on history or exam. Mild reactive airway component.
        </p>
        <p className="mt-2 text-[10px] text-emerald-700">✓ Auto-filled from audio · 2s ago</p>
      </div>
    ),
  },
  {
    num: 5,
    title: "Review · code · save",
    body: "Doctor reads the draft (5-10 sec), clicks 'Suggest ICD-10', accepts a code, the drug-interaction check runs in the background, and saves. Total time: under 30 seconds.",
    accent: "from-cyan-500 to-sky-500",
    mock: (
      <div className="rounded-xl border border-cyan-200 bg-white p-3 text-xs">
        <button className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">Suggest ICD-10 codes</button>
        <div className="mt-2 rounded border border-slate-200 p-1.5">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] font-bold text-indigo-700">J20.9</span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-800">92%</span>
          </div>
          <p className="text-[10px] text-slate-700">Acute bronchitis, unspecified</p>
        </div>
        <button className="mt-2 w-full rounded bg-emerald-600 py-1 text-[10px] font-bold text-white">Save visit</button>
      </div>
    ),
  },
];

export default function HowAiScribeWorks() {
  return (
    <section className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
            How it works
          </span>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 md:text-5xl">
            From audio to SOAP note in{" "}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              under a minute
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600">
            Five steps. No keyboard shortcuts to memorise. Doctors are productive on day one.
          </p>
        </div>

        <ol className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s) => (
            <li key={s.num} className="relative">
              <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${s.accent} text-sm font-bold text-white shadow-md`}>
                  {s.num}
                </div>
                <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{s.body}</p>
                <div className="mt-4">{s.mock}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
