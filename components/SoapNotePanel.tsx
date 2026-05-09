"use client";

// Renders the structured SOAP note returned by /api/clinical/soap-note.
//
// Pure display: takes the note shape, renders four colour-coded
// sections plus extracted vitals / meds / surfaced symptoms strips.
// The parent owns the transcript → debounce → fetch loop.

interface ExtractedVital { kind: string; value: string; unit?: string }
interface ExtractedMed { drugName: string; strength?: string }
export interface SOAPNote {
  subjective: string[]; objective: string[]; assessment: string[]; plan: string[];
  vitals: ExtractedVital[]; medications: ExtractedMed[]; surfacedSymptoms: string[];
  stats: { totalWords: number; doctorWords: number; patientWords: number };
}

export default function SoapNotePanel({ note }: { note: SOAPNote }) {
  const sections: Array<[string, string[], string]> = [
    ["S — Subjective", note.subjective, "border-sky-200 bg-sky-50"],
    ["O — Objective", note.objective, "border-emerald-200 bg-emerald-50"],
    ["A — Assessment", note.assessment, "border-amber-200 bg-amber-50"],
    ["P — Plan", note.plan, "border-violet-200 bg-violet-50"],
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 text-xs">
        <Stat label="Total words" v={note.stats.totalWords} />
        <Stat label="Doctor" v={note.stats.doctorWords} />
        <Stat label="Patient" v={note.stats.patientWords} />
        <Stat label="Symptoms" v={note.surfacedSymptoms.length} accent="indigo" />
        <Stat label="Vitals" v={note.vitals.length} accent="emerald" />
        <Stat label="Meds" v={note.medications.length} accent="rose" />
      </div>

      {note.vitals.length > 0 && (
        <Strip title="Extracted vitals" tone="emerald">
          {note.vitals.map((v, i) => (
            <Chip key={i} tone="emerald">
              {v.kind.toUpperCase()} <span className="font-mono">{v.value}{v.unit || ""}</span>
            </Chip>
          ))}
        </Strip>
      )}

      {note.medications.length > 0 && (
        <Strip title="Medications mentioned" tone="rose">
          {note.medications.map((m, i) => (
            <Chip key={i} tone="rose">
              {m.drugName}{m.strength ? <span className="ml-1 font-mono text-rose-700">{m.strength}</span> : null}
            </Chip>
          ))}
        </Strip>
      )}

      {note.surfacedSymptoms.length > 0 && (
        <Strip title="Symptoms surfaced (feeds DDx copilot)" tone="indigo">
          {note.surfacedSymptoms.map((s, i) => (
            <Chip key={i} tone="indigo" rounded>{s}</Chip>
          ))}
        </Strip>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map(([title, lines, cls]) => (
          <div key={title} className={`rounded-lg border p-3 ${cls}`}>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-700">{title}</p>
            {lines.length === 0 ? (
              <p className="text-xs text-slate-400">— nothing yet —</p>
            ) : (
              <ul className="list-disc pl-5 text-xs text-slate-800 space-y-1">
                {lines.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, v, accent }: { label: string; v: number; accent?: "indigo" | "emerald" | "rose" }) {
  const cls = accent === "indigo" ? "bg-indigo-100 text-indigo-800" : accent === "emerald" ? "bg-emerald-100 text-emerald-800" : accent === "rose" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700";
  return <span className={`rounded-md px-2 py-0.5 font-semibold ${cls}`}>{label}: <strong>{v}</strong></span>;
}

function Strip({ title, tone, children }: { title: string; tone: "emerald" | "rose" | "indigo"; children: React.ReactNode }) {
  const wrap = tone === "emerald" ? "border-emerald-200 bg-emerald-50" : tone === "rose" ? "border-rose-200 bg-rose-50" : "border-indigo-200 bg-indigo-50";
  const titleCls = tone === "emerald" ? "text-emerald-800" : tone === "rose" ? "text-rose-800" : "text-indigo-800";
  return (
    <div className={`rounded-lg border p-3 ${wrap}`}>
      <p className={`mb-1 text-[11px] font-bold uppercase tracking-wider ${titleCls}`}>{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ children, tone, rounded }: { children: React.ReactNode; tone: "emerald" | "rose" | "indigo"; rounded?: boolean }) {
  const cls = tone === "emerald" ? "text-emerald-900 ring-emerald-200" : tone === "rose" ? "text-rose-900 ring-rose-200" : "text-indigo-900 ring-indigo-200";
  return <span className={`bg-white px-2 py-0.5 text-xs font-semibold ring-1 ${cls} ${rounded ? "rounded-full" : "rounded-md"}`}>{children}</span>;
}
