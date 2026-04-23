// Display helpers for admin-managed medical departments.
//
// The Department model in `departments-store.ts` stores an SVG path
// (for admin/internal UIs) plus name/description/status. The
// patient-facing surfaces (/doctors "Browse by Specialty" grid and
// the /consult "Book appointment with experts" strip) historically
// used emoji icons and a starting fee + wait time. Rather than
// migrate every admin department to carry display metadata, we
// derive those fields from the department name here.
//
// Matching is loose (substring on the normalised name) so "Gynecology
// & Obstetrics" still maps to the 👩‍⚕️ / gynecology bucket. Unknown
// departments fall back to a generic icon and the default fee.

import type { Department } from "./departments-store";

interface DisplayEntry {
  emoji: string;
  consultFee: number;
  waitMinutes: number;
  // First match wins; keywords are lowercased and matched as
  // substrings against the department name.
  keywords: string[];
}

// Ordered from most specific to most generic. "General ..." entries
// appear last so a name like "General Surgery" won't eat "Surgery".
const DISPLAY_TABLE: DisplayEntry[] = [
  { emoji: "🩺", consultFee: 25, waitMinutes: 5, keywords: ["general physician", "general medicine", "internal medicine", "family medicine", "primary care"] },
  { emoji: "👶", consultFee: 30, waitMinutes: 15, keywords: ["pediatric", "paediatric", "child"] },
  { emoji: "👩‍⚕️", consultFee: 40, waitMinutes: 10, keywords: ["gyn", "obstetric", "women"] },
  { emoji: "✨", consultFee: 35, waitMinutes: 10, keywords: ["derma", "skin"] },
  { emoji: "🦷", consultFee: 30, waitMinutes: 20, keywords: ["dent", "oral"] },
  { emoji: "❤️", consultFee: 50, waitMinutes: 30, keywords: ["cardio", "heart"] },
  { emoji: "🧠", consultFee: 45, waitMinutes: 20, keywords: ["psychi", "mental", "psycho"] },
  { emoji: "⚡", consultFee: 45, waitMinutes: 25, keywords: ["neuro", "nerve"] },
  { emoji: "🦴", consultFee: 40, waitMinutes: 20, keywords: ["ortho", "bone", "joint", "physio", "rehab"] },
  { emoji: "👂", consultFee: 35, waitMinutes: 15, keywords: ["ent", "ear", "nose", "throat"] },
  { emoji: "👁️", consultFee: 40, waitMinutes: 15, keywords: ["ophthal", "eye", "vision"] },
  { emoji: "💧", consultFee: 40, waitMinutes: 20, keywords: ["urol", "kidney", "nephro"] },
  { emoji: "🫁", consultFee: 40, waitMinutes: 20, keywords: ["pulmo", "lung", "respir"] },
  { emoji: "🍽️", consultFee: 40, waitMinutes: 20, keywords: ["gastro", "digest", "stomach"] },
  { emoji: "🧬", consultFee: 45, waitMinutes: 25, keywords: ["endocrin", "thyroid", "diabetes", "hormone"] },
  { emoji: "🎗️", consultFee: 60, waitMinutes: 30, keywords: ["oncol", "cancer"] },
  { emoji: "🩸", consultFee: 45, waitMinutes: 20, keywords: ["rheumat", "arthriti", "immunol"] },
  { emoji: "🔬", consultFee: 30, waitMinutes: 20, keywords: ["path", "lab"] },
  { emoji: "📡", consultFee: 35, waitMinutes: 15, keywords: ["radiol", "imaging"] },
  { emoji: "🔪", consultFee: 55, waitMinutes: 30, keywords: ["surg"] },
  { emoji: "🌿", consultFee: 35, waitMinutes: 20, keywords: ["integrat", "holistic", "ayurved", "homeo"] },
  { emoji: "💪", consultFee: 40, waitMinutes: 20, keywords: ["sexol", "androl"] },
  { emoji: "💊", consultFee: 30, waitMinutes: 15, keywords: ["pharmac"] },
];

const FALLBACK: Omit<DisplayEntry, "keywords"> = {
  emoji: "🏥",
  consultFee: 35,
  waitMinutes: 20,
};

function matchDisplay(name: string): Omit<DisplayEntry, "keywords"> {
  const n = name.toLowerCase();
  for (const entry of DISPLAY_TABLE) {
    if (entry.keywords.some((k) => n.includes(k))) {
      return {
        emoji: entry.emoji,
        consultFee: entry.consultFee,
        waitMinutes: entry.waitMinutes,
      };
    }
  }
  return FALLBACK;
}

export interface DisplayDepartment {
  id: string;
  name: string;
  emoji: string;
  consultFee: number;
  waitLabel: string;
  doctorCount: number;
  description: string;
}

function waitLabel(minutes: number): string {
  if (minutes < 60) return `< ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `< ${hours} hr`;
}

/** Enrich a single department with patient-facing display metadata. */
export function toDisplayDepartment(d: Department): DisplayDepartment {
  const match = matchDisplay(d.name);
  return {
    id: d.id,
    name: d.name,
    emoji: match.emoji,
    consultFee: match.consultFee,
    waitLabel: waitLabel(match.waitMinutes),
    doctorCount: d.doctorCount,
    description: d.description,
  };
}

/** Filter-then-enrich. Only Active departments, ordered by doctor count desc. */
export function toDisplayDepartments(all: Department[]): DisplayDepartment[] {
  return all
    .filter((d) => d.status === "Active")
    .slice()
    .sort((a, b) => (b.doctorCount || 0) - (a.doctorCount || 0))
    .map(toDisplayDepartment);
}
