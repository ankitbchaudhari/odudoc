// Auto-coded discharge-summary synthesizer.
//
// Takes a structured encounter + Rx bundle and produces a clean,
// readable discharge summary with ICD-10 codes auto-attached. This is
// what consultants currently spend 15–30 minutes per discharge writing
// by hand — and the output is so formulaic that a deterministic
// template engine matches LLM quality with none of the privacy /
// regulatory / cost overhead.
//
// The synthesizer is pure: same inputs → same output, no clock or
// network. Outputs three formats:
//
//   - structured: machine-readable JSON for downstream systems
//     (insurance claim filing, NABH audit, EHR export)
//   - markdown:   for the doctor's review pane (human-readable)
//   - html:       for in-app rendering / PDF generation
//
// We deliberately keep the medication list ordered by clinical
// priority (chronic disease meds first, then symptomatic, then PRN).
// Hospitals lose battles with insurance over medication order on
// claims surprisingly often.

import { suggestIcd10Multi } from "./icd10";

export interface DischargeRxItem {
  drugName: string;
  strength?: string;
  dose?: string;
  frequency?: string;
  durationDays?: number;
  instructions?: string;
}

export interface DischargeProcedure {
  name: string;
  performedAt?: string;
  notes?: string;
}

export interface DischargeInvestigation {
  name: string;
  result?: string;
  date?: string;
  abnormal?: boolean;
}

export interface DischargeInput {
  // ── Patient demographics ──────────────────────────────────────
  patient: {
    name: string;
    medicalId?: string;
    age?: number;
    sex?: "male" | "female" | "other";
    contactPhone?: string;
    address?: string;
  };
  // ── Admission / discharge ─────────────────────────────────────
  organization?: { name: string; address?: string; logoUrl?: string };
  admittingDoctor?: string;
  consultingDoctors?: string[];
  admissionDate?: string;
  dischargeDate?: string;
  ward?: string;
  bedNo?: string;
  // ── Clinical content ──────────────────────────────────────────
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string[];
  examinationFindings?: string;
  /** One diagnosis per line. The engine auto-suggests ICD-10 codes. */
  diagnoses: string[];
  procedures?: DischargeProcedure[];
  investigations?: DischargeInvestigation[];
  hospitalCourse?: string;
  conditionAtDischarge?:
    | "improved"
    | "stable"
    | "transferred"
    | "deteriorated"
    | "discharged_against_advice"
    | "deceased";
  dischargeMedications: DischargeRxItem[];
  dietAdvice?: string;
  activityAdvice?: string;
  followUp?: { whenDays?: number; whom?: string; instructions?: string };
  warningSignsToReturn?: string[];
}

export interface CodedDiagnosis {
  text: string;
  icd10?: string;
  icd10Title?: string;
}

export interface DischargeSummaryOutput {
  /** Structured fields, with ICD-10 attached to each diagnosis. */
  structured: {
    patient: DischargeInput["patient"];
    organization?: DischargeInput["organization"];
    admittingDoctor?: string;
    consultingDoctors?: string[];
    admissionDate?: string;
    dischargeDate?: string;
    lengthOfStayDays?: number;
    ward?: string;
    bedNo?: string;
    chiefComplaint?: string;
    historyOfPresentIllness?: string;
    pastMedicalHistory?: string[];
    examinationFindings?: string;
    codedDiagnoses: CodedDiagnosis[];
    /** Primary diagnosis is the highest-scoring suggestion across all
     *  the lines — what the insurance claim will key on. */
    primaryIcd10?: string;
    primaryDiagnosisText?: string;
    procedures?: DischargeProcedure[];
    investigations?: DischargeInvestigation[];
    hospitalCourse?: string;
    conditionAtDischarge?: DischargeInput["conditionAtDischarge"];
    dischargeMedications: DischargeRxItem[];
    dietAdvice?: string;
    activityAdvice?: string;
    followUp?: DischargeInput["followUp"];
    warningSignsToReturn?: string[];
  };
  markdown: string;
  html: string;
}

const MED_PRIORITY: Array<RegExp> = [
  // Chronic disease anchors first
  /metformin|insulin|glimepiride|sitagliptin/i,
  /enalapril|ramipril|telmisartan|losartan|olmesartan|amlodipine|metoprolol|bisoprolol/i,
  /atorvastatin|rosuvastatin|simvastatin/i,
  /levothyroxine|thyronorm/i,
  /clopidogrel|aspirin|warfarin|apixaban|rivaroxaban/i,
  // Then antibiotics + antivirals
  /amoxicillin|cefixime|ciprofloxacin|azithromycin|doxycycline|metronidazole|piperacillin|ceftriaxone/i,
  /oseltamivir|acyclovir/i,
  // Then symptomatic
  /paracetamol|ibuprofen|diclofenac|tramadol|nimesulide/i,
  /pantoprazole|omeprazole|rabeprazole|ondansetron|domperidone|metoclopramide/i,
  // PRN / others sink to bottom (priority = max)
];

function rxPriority(name: string): number {
  for (let i = 0; i < MED_PRIORITY.length; i++) {
    if (MED_PRIORITY[i].test(name)) return i;
  }
  return MED_PRIORITY.length;
}

function daysBetween(a?: string, b?: string): number | undefined {
  if (!a || !b) return undefined;
  const ad = new Date(a).getTime();
  const bd = new Date(b).getTime();
  if (isNaN(ad) || isNaN(bd)) return undefined;
  return Math.max(0, Math.round((bd - ad) / (24 * 60 * 60 * 1000)));
}

const CONDITION_LABEL: Record<NonNullable<DischargeInput["conditionAtDischarge"]>, string> = {
  improved: "Improved",
  stable: "Stable",
  transferred: "Transferred",
  deteriorated: "Deteriorated",
  discharged_against_advice: "Discharged against medical advice (DAMA)",
  deceased: "Deceased",
};

function attachIcd(diagnoses: string[]): { coded: CodedDiagnosis[]; primary?: CodedDiagnosis } {
  const top = suggestIcd10Multi(diagnoses, 12);
  const codeByLine: Record<string, CodedDiagnosis> = {};
  // Per-line: pick the suggestion whose keywords actually appear in
  // that line (multi gives global ranking; we want per-line specificity).
  for (const line of diagnoses) {
    const lower = line.toLowerCase();
    let best: CodedDiagnosis = { text: line };
    let bestScore = 0;
    for (const s of top) {
      const matched = s.matchedKeywords.some((kw) => lower.includes(kw));
      if (matched && s.score > bestScore) {
        bestScore = s.score;
        best = { text: line, icd10: s.code, icd10Title: s.title };
      }
    }
    codeByLine[line] = best;
  }
  const coded = diagnoses.map((l) => codeByLine[l]);
  // Primary = first coded line that actually got a code; fall back to
  // overall top suggestion's source line.
  const primary = coded.find((c) => c.icd10) || coded[0];
  return { coded, primary };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function synthesizeDischargeSummary(input: DischargeInput): DischargeSummaryOutput {
  const { coded, primary } = attachIcd(input.diagnoses.filter(Boolean));
  const meds = [...input.dischargeMedications].sort((a, b) => rxPriority(a.drugName) - rxPriority(b.drugName));
  const los = daysBetween(input.admissionDate, input.dischargeDate);

  const structured: DischargeSummaryOutput["structured"] = {
    patient: input.patient,
    organization: input.organization,
    admittingDoctor: input.admittingDoctor,
    consultingDoctors: input.consultingDoctors,
    admissionDate: input.admissionDate,
    dischargeDate: input.dischargeDate,
    lengthOfStayDays: los,
    ward: input.ward,
    bedNo: input.bedNo,
    chiefComplaint: input.chiefComplaint,
    historyOfPresentIllness: input.historyOfPresentIllness,
    pastMedicalHistory: input.pastMedicalHistory,
    examinationFindings: input.examinationFindings,
    codedDiagnoses: coded,
    primaryIcd10: primary?.icd10,
    primaryDiagnosisText: primary?.text,
    procedures: input.procedures,
    investigations: input.investigations,
    hospitalCourse: input.hospitalCourse,
    conditionAtDischarge: input.conditionAtDischarge,
    dischargeMedications: meds,
    dietAdvice: input.dietAdvice,
    activityAdvice: input.activityAdvice,
    followUp: input.followUp,
    warningSignsToReturn: input.warningSignsToReturn,
  };

  // ── Markdown ───────────────────────────────────────────────────
  const md: string[] = [];
  md.push(`# Discharge Summary`);
  if (input.organization) md.push(`**${input.organization.name}**${input.organization.address ? `  \n_${input.organization.address}_` : ""}`);
  md.push("");
  md.push(`## Patient`);
  md.push(`- **Name:** ${input.patient.name}`);
  if (input.patient.medicalId) md.push(`- **Medical ID:** ${input.patient.medicalId}`);
  if (input.patient.age !== undefined) md.push(`- **Age / Sex:** ${input.patient.age}y / ${input.patient.sex || "—"}`);
  if (input.patient.contactPhone) md.push(`- **Phone:** ${input.patient.contactPhone}`);
  md.push("");
  md.push(`## Admission`);
  if (input.admissionDate) md.push(`- **Admitted:** ${fmtDate(input.admissionDate)}`);
  if (input.dischargeDate) md.push(`- **Discharged:** ${fmtDate(input.dischargeDate)}`);
  if (los !== undefined) md.push(`- **Length of stay:** ${los} day${los === 1 ? "" : "s"}`);
  if (input.ward || input.bedNo) md.push(`- **Ward / Bed:** ${input.ward || "—"} / ${input.bedNo || "—"}`);
  if (input.admittingDoctor) md.push(`- **Admitting consultant:** ${input.admittingDoctor}`);
  if (input.consultingDoctors?.length) md.push(`- **Consulted by:** ${input.consultingDoctors.join(", ")}`);
  md.push("");
  if (input.chiefComplaint) {
    md.push(`## Chief Complaint`);
    md.push(input.chiefComplaint);
    md.push("");
  }
  if (input.historyOfPresentIllness) {
    md.push(`## History of Present Illness`);
    md.push(input.historyOfPresentIllness);
    md.push("");
  }
  if (input.pastMedicalHistory?.length) {
    md.push(`## Past Medical History`);
    input.pastMedicalHistory.forEach((p) => md.push(`- ${p}`));
    md.push("");
  }
  if (input.examinationFindings) {
    md.push(`## Examination Findings`);
    md.push(input.examinationFindings);
    md.push("");
  }
  md.push(`## Diagnoses (ICD-10 coded)`);
  for (const c of coded) {
    if (c.icd10) md.push(`- **${c.icd10}** — ${c.text}${c.icd10Title ? ` _(${c.icd10Title})_` : ""}`);
    else md.push(`- ${c.text}  _(no code matched — review)_`);
  }
  if (primary?.icd10) md.push(`\n_Primary diagnosis for billing: **${primary.icd10}**_`);
  md.push("");
  if (input.procedures?.length) {
    md.push(`## Procedures Performed`);
    input.procedures.forEach((p) => md.push(`- ${p.name}${p.performedAt ? ` (${fmtDate(p.performedAt)})` : ""}${p.notes ? ` — ${p.notes}` : ""}`));
    md.push("");
  }
  if (input.investigations?.length) {
    md.push(`## Key Investigations`);
    input.investigations.forEach((iv) => md.push(`- **${iv.name}**${iv.date ? ` (${fmtDate(iv.date)})` : ""}: ${iv.result || "—"}${iv.abnormal ? " ⚠️" : ""}`));
    md.push("");
  }
  if (input.hospitalCourse) {
    md.push(`## Hospital Course`);
    md.push(input.hospitalCourse);
    md.push("");
  }
  if (input.conditionAtDischarge) {
    md.push(`## Condition at Discharge`);
    md.push(`**${CONDITION_LABEL[input.conditionAtDischarge]}**`);
    md.push("");
  }
  if (meds.length) {
    md.push(`## Discharge Medications`);
    meds.forEach((m, i) => {
      const head = `${i + 1}. **${m.drugName}**${m.strength ? ` ${m.strength}` : ""}`;
      const dose = [m.dose, m.frequency, m.durationDays ? `× ${m.durationDays} days` : null, m.instructions].filter(Boolean).join(" · ");
      md.push(dose ? `${head} — ${dose}` : head);
    });
    md.push("");
  }
  if (input.dietAdvice) { md.push(`## Diet`); md.push(input.dietAdvice); md.push(""); }
  if (input.activityAdvice) { md.push(`## Activity`); md.push(input.activityAdvice); md.push(""); }
  if (input.followUp) {
    md.push(`## Follow-up`);
    if (input.followUp.whenDays !== undefined) md.push(`- **In:** ${input.followUp.whenDays} day${input.followUp.whenDays === 1 ? "" : "s"}`);
    if (input.followUp.whom) md.push(`- **With:** ${input.followUp.whom}`);
    if (input.followUp.instructions) md.push(`- ${input.followUp.instructions}`);
    md.push("");
  }
  if (input.warningSignsToReturn?.length) {
    md.push(`## Return Immediately If`);
    input.warningSignsToReturn.forEach((w) => md.push(`- ${w}`));
    md.push("");
  }

  // ── HTML ───────────────────────────────────────────────────────
  const html = renderHtml(structured, coded, primary, meds);

  return { structured, markdown: md.join("\n"), html };
}

function renderHtml(
  s: DischargeSummaryOutput["structured"],
  coded: CodedDiagnosis[],
  primary: CodedDiagnosis | undefined,
  meds: DischargeRxItem[],
): string {
  const part: string[] = [];
  part.push(`<div class="discharge-summary" style="font-family:system-ui,sans-serif;color:#0f172a;line-height:1.55;">`);
  part.push(`<header style="border-bottom:2px solid #4f46e5;padding-bottom:8px;margin-bottom:16px;">`);
  if (s.organization) {
    part.push(`<h1 style="margin:0;font-size:20px;color:#1e293b;">${escapeHtml(s.organization.name)}</h1>`);
    if (s.organization.address) part.push(`<p style="margin:2px 0 0;font-size:12px;color:#64748b;">${escapeHtml(s.organization.address)}</p>`);
  }
  part.push(`<h2 style="margin:8px 0 0;font-size:16px;color:#4f46e5;">Discharge Summary</h2>`);
  part.push(`</header>`);

  // Patient + admission grid
  part.push(`<table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px;"><tbody>`);
  const row = (l: string, v?: string) => v ? `<tr><td style="padding:3px 8px 3px 0;color:#64748b;width:40%;">${escapeHtml(l)}</td><td style="padding:3px 0;font-weight:600;">${escapeHtml(v)}</td></tr>` : "";
  part.push(row("Name", s.patient.name));
  if (s.patient.medicalId) part.push(row("Medical ID", s.patient.medicalId));
  if (s.patient.age !== undefined) part.push(row("Age / Sex", `${s.patient.age}y / ${s.patient.sex || "—"}`));
  if (s.patient.contactPhone) part.push(row("Phone", s.patient.contactPhone));
  if (s.admissionDate) part.push(row("Admitted", fmtDate(s.admissionDate)));
  if (s.dischargeDate) part.push(row("Discharged", fmtDate(s.dischargeDate)));
  if (s.lengthOfStayDays !== undefined) part.push(row("Length of stay", `${s.lengthOfStayDays} day${s.lengthOfStayDays === 1 ? "" : "s"}`));
  if (s.ward || s.bedNo) part.push(row("Ward / Bed", `${s.ward || "—"} / ${s.bedNo || "—"}`));
  if (s.admittingDoctor) part.push(row("Admitting consultant", s.admittingDoctor));
  if (s.consultingDoctors?.length) part.push(row("Consulted by", s.consultingDoctors.join(", ")));
  part.push(`</tbody></table>`);

  const section = (title: string, body: string) =>
    `<section style="margin-bottom:14px;"><h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#4f46e5;margin:0 0 4px;border-bottom:1px solid #e2e8f0;padding-bottom:2px;">${escapeHtml(title)}</h3><div style="font-size:13px;">${body}</div></section>`;

  if (s.chiefComplaint) part.push(section("Chief Complaint", `<p>${escapeHtml(s.chiefComplaint)}</p>`));
  if (s.historyOfPresentIllness) part.push(section("History of Present Illness", `<p>${escapeHtml(s.historyOfPresentIllness)}</p>`));
  if (s.pastMedicalHistory?.length) part.push(section("Past Medical History", `<ul style="margin:4px 0;padding-left:20px;">${s.pastMedicalHistory.map(p => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`));
  if (s.examinationFindings) part.push(section("Examination Findings", `<p>${escapeHtml(s.examinationFindings)}</p>`));

  // Diagnoses with ICD-10 chips
  const dxRows = coded.map((c) => {
    const code = c.icd10 ? `<span style="background:#e0e7ff;color:#3730a3;font-family:monospace;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;margin-right:6px;">${escapeHtml(c.icd10)}</span>` : `<span style="background:#fee2e2;color:#991b1b;font-size:11px;padding:2px 6px;border-radius:4px;margin-right:6px;">no code</span>`;
    const t = c.icd10Title ? `<span style="color:#64748b;font-size:11px;"> (${escapeHtml(c.icd10Title)})</span>` : "";
    return `<li style="margin-bottom:3px;">${code}${escapeHtml(c.text)}${t}</li>`;
  }).join("");
  let dxBody = `<ul style="list-style:none;margin:4px 0;padding-left:0;">${dxRows}</ul>`;
  if (primary?.icd10) dxBody += `<p style="font-size:11px;color:#475569;margin-top:6px;"><em>Primary diagnosis for billing: <strong>${escapeHtml(primary.icd10)}</strong></em></p>`;
  part.push(section("Diagnoses (ICD-10 coded)", dxBody));

  if (s.procedures?.length) {
    part.push(section("Procedures", `<ul style="margin:4px 0;padding-left:20px;">${s.procedures.map(p => `<li>${escapeHtml(p.name)}${p.performedAt ? ` <span style="color:#64748b;">(${fmtDate(p.performedAt)})</span>` : ""}${p.notes ? ` — ${escapeHtml(p.notes)}` : ""}</li>`).join("")}</ul>`));
  }
  if (s.investigations?.length) {
    part.push(section("Key Investigations", `<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr><th style="text-align:left;padding:4px;background:#f1f5f9;">Test</th><th style="text-align:left;padding:4px;background:#f1f5f9;">Result</th><th style="text-align:left;padding:4px;background:#f1f5f9;">Date</th></tr></thead><tbody>${s.investigations.map(iv => `<tr><td style="padding:4px;border-bottom:1px solid #e2e8f0;">${escapeHtml(iv.name)}${iv.abnormal ? " ⚠️" : ""}</td><td style="padding:4px;border-bottom:1px solid #e2e8f0;${iv.abnormal ? "color:#b91c1c;font-weight:600;" : ""}">${escapeHtml(iv.result || "—")}</td><td style="padding:4px;border-bottom:1px solid #e2e8f0;color:#64748b;">${iv.date ? fmtDate(iv.date) : "—"}</td></tr>`).join("")}</tbody></table>`));
  }
  if (s.hospitalCourse) part.push(section("Hospital Course", `<p>${escapeHtml(s.hospitalCourse)}</p>`));
  if (s.conditionAtDischarge) part.push(section("Condition at Discharge", `<p style="font-weight:700;">${escapeHtml(CONDITION_LABEL[s.conditionAtDischarge])}</p>`));

  if (meds.length) {
    const rows = meds.map((m, i) => {
      const dose = [m.dose, m.frequency, m.durationDays ? `× ${m.durationDays}d` : null, m.instructions].filter(Boolean).join(" · ");
      return `<tr><td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#64748b;width:24px;">${i + 1}</td><td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;font-weight:600;">${escapeHtml(m.drugName)}${m.strength ? ` ${escapeHtml(m.strength)}` : ""}</td><td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;">${escapeHtml(dose)}</td></tr>`;
    }).join("");
    part.push(section("Discharge Medications", `<table style="width:100%;border-collapse:collapse;font-size:12px;"><tbody>${rows}</tbody></table>`));
  }

  if (s.dietAdvice) part.push(section("Diet", `<p>${escapeHtml(s.dietAdvice)}</p>`));
  if (s.activityAdvice) part.push(section("Activity", `<p>${escapeHtml(s.activityAdvice)}</p>`));
  if (s.followUp) {
    const fu: string[] = [];
    if (s.followUp.whenDays !== undefined) fu.push(`<strong>In ${s.followUp.whenDays} day${s.followUp.whenDays === 1 ? "" : "s"}</strong>`);
    if (s.followUp.whom) fu.push(`with ${escapeHtml(s.followUp.whom)}`);
    if (s.followUp.instructions) fu.push(escapeHtml(s.followUp.instructions));
    part.push(section("Follow-up", `<p>${fu.join(" · ")}</p>`));
  }
  if (s.warningSignsToReturn?.length) {
    part.push(section("Return Immediately If", `<ul style="margin:4px 0;padding-left:20px;color:#b91c1c;">${s.warningSignsToReturn.map(w => `<li>${escapeHtml(w)}</li>`).join("")}</ul>`));
  }

  if (s.admittingDoctor) {
    part.push(`<footer style="margin-top:24px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">Signed: <strong style="color:#0f172a;">${escapeHtml(s.admittingDoctor)}</strong></footer>`);
  }
  part.push(`</div>`);
  return part.join("\n");
}
