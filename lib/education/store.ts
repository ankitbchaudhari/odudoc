// Education partners.
//
// Universities, training institutes, and online-course operators
// register here. Two surfaces:
//   1. Course catalogue — students browse + enroll
//   2. Placement requests — partner asks platform to surface their
//      students against open vacancies
//
// 1:1 online training for private clinics (the user's spec) is a
// course with mode="online_one_on_one"; the same store handles it.

import { bindPersistentArray } from "../persistent-array";

export type CourseMode =
  | "in_person"
  | "online_self_paced"
  | "online_live"
  | "online_one_on_one"
  | "hybrid";

export type CourseLevel =
  | "certificate"
  | "diploma"
  | "undergrad"
  | "postgrad"
  | "fellowship"
  | "cme"        // continuing medical education
  | "workshop";

export interface EducationCourse {
  id: string;
  organizationId: string;       // education partner's orgId
  title: string;
  /** Specialty / focus — "Physiotherapy", "Pediatric nursing", etc. */
  specialty?: string;
  level: CourseLevel;
  mode: CourseMode;
  /** Duration string ("3 months", "6 weekends"). */
  duration?: string;
  /** Tuition fee in INR rupees. */
  feeRupees?: number;
  /** Free-text intake schedule ("rolling", "Jan + Jul"). */
  intakeSchedule?: string;
  /** Where it physically happens — required for in_person. */
  city?: string;
  countryIso2?: string;
  description: string;
  syllabus?: string[];
  prerequisites?: string[];
  /** Public-facing course URL (partner website). */
  websiteUrl?: string;
  /** Whether OduDoc lets students enroll directly through the
   *  platform — partner may opt out, in which case enrollment is
   *  redirected to websiteUrl. */
  enrollOnPlatform: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlacementRequest {
  id: string;
  organizationId: string;       // education partner
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  qualifications: string;
  /** Specialty the student is seeking placement in. */
  specialtySought?: string;
  /** City preferences — comma-separated free text. */
  preferredCities?: string;
  /** Course id this placement is the outcome of. */
  courseId?: string;
  /** Free-text career objective. */
  objective?: string;
  status: "submitted" | "in_review" | "matched" | "placed" | "withdrawn";
  matchedVacancyId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const courses: EducationCourse[] = [];
const placements: PlacementRequest[] = [];
const { hydrate: hydrateCourses, flush: flushCourses, tombstone: tombstoneCourse } =
  bindPersistentArray<EducationCourse>("education_courses", courses, () => []);
const { hydrate: hydratePlacements, flush: flushPlacements, tombstone: tombstonePlacement } =
  bindPersistentArray<PlacementRequest>("education_placements", placements, () => []);
await hydrateCourses();
await hydratePlacements();

export interface CreateCourseInput {
  organizationId: string;
  title: string;
  specialty?: string;
  level: CourseLevel;
  mode: CourseMode;
  duration?: string;
  feeRupees?: number;
  intakeSchedule?: string;
  city?: string;
  countryIso2?: string;
  description: string;
  syllabus?: string[];
  prerequisites?: string[];
  websiteUrl?: string;
  enrollOnPlatform?: boolean;
}

export function createCourse(input: CreateCourseInput): EducationCourse {
  const at = new Date().toISOString();
  const c: EducationCourse = {
    id: `crs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    title: input.title.trim(),
    specialty: input.specialty?.trim() || undefined,
    level: input.level,
    mode: input.mode,
    duration: input.duration?.trim() || undefined,
    feeRupees: input.feeRupees,
    intakeSchedule: input.intakeSchedule?.trim() || undefined,
    city: input.city?.trim() || undefined,
    countryIso2: input.countryIso2?.toUpperCase(),
    description: input.description.trim(),
    syllabus: (input.syllabus || []).map((s) => s.trim()).filter(Boolean),
    prerequisites: (input.prerequisites || []).map((s) => s.trim()).filter(Boolean),
    websiteUrl: input.websiteUrl?.trim() || undefined,
    enrollOnPlatform: input.enrollOnPlatform ?? true,
    active: true,
    createdAt: at, updatedAt: at,
  };
  courses.unshift(c);
  flushCourses();
  return c;
}

export function listCourses(opts: { organizationId?: string; specialty?: string; level?: CourseLevel; mode?: CourseMode; openOnly?: boolean; query?: string } = {}): EducationCourse[] {
  let list = [...courses];
  if (opts.organizationId) list = list.filter((c) => c.organizationId === opts.organizationId);
  if (opts.specialty) list = list.filter((c) => c.specialty?.toLowerCase() === opts.specialty!.toLowerCase());
  if (opts.level) list = list.filter((c) => c.level === opts.level);
  if (opts.mode) list = list.filter((c) => c.mode === opts.mode);
  if (opts.openOnly) list = list.filter((c) => c.active);
  if (opts.query) {
    const q = opts.query.toLowerCase();
    list = list.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getCourse(id: string): EducationCourse | null {
  return courses.find((c) => c.id === id) || null;
}

export function updateCourse(id: string, organizationId: string, patch: Partial<EducationCourse>): EducationCourse | null {
  const c = courses.find((x) => x.id === id && x.organizationId === organizationId);
  if (!c) return null;
  Object.assign(c, patch);
  c.updatedAt = new Date().toISOString();
  flushCourses();
  return c;
}

export function deleteCourse(id: string, organizationId: string): boolean {
  const i = courses.findIndex((c) => c.id === id && c.organizationId === organizationId);
  if (i < 0) return false;
  tombstoneCourse(courses[i].id);
  courses.splice(i, 1);
  flushCourses();
  return true;
}

export interface CreatePlacementInput {
  organizationId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  qualifications: string;
  specialtySought?: string;
  preferredCities?: string;
  courseId?: string;
  objective?: string;
}

export function createPlacement(input: CreatePlacementInput): PlacementRequest {
  const at = new Date().toISOString();
  const p: PlacementRequest = {
    id: `plc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    studentName: input.studentName.trim(),
    studentEmail: input.studentEmail.trim().toLowerCase(),
    studentPhone: input.studentPhone?.trim() || undefined,
    qualifications: input.qualifications.trim(),
    specialtySought: input.specialtySought?.trim() || undefined,
    preferredCities: input.preferredCities?.trim() || undefined,
    courseId: input.courseId,
    objective: input.objective?.trim() || undefined,
    status: "submitted",
    createdAt: at, updatedAt: at,
  };
  placements.unshift(p);
  flushPlacements();
  return p;
}

export function listPlacements(opts: { organizationId?: string; status?: PlacementRequest["status"] } = {}): PlacementRequest[] {
  let list = [...placements];
  if (opts.organizationId) list = list.filter((p) => p.organizationId === opts.organizationId);
  if (opts.status) list = list.filter((p) => p.status === opts.status);
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function updatePlacement(id: string, organizationId: string, patch: Partial<PlacementRequest>): PlacementRequest | null {
  const p = placements.find((x) => x.id === id && x.organizationId === organizationId);
  if (!p) return null;
  Object.assign(p, patch);
  p.updatedAt = new Date().toISOString();
  flushPlacements();
  return p;
}

export function deletePlacement(id: string, organizationId: string): boolean {
  const i = placements.findIndex((p) => p.id === id && p.organizationId === organizationId);
  if (i < 0) return false;
  tombstonePlacement(placements[i].id);
  placements.splice(i, 1);
  flushPlacements();
  return true;
}

export function deleteEducationForOrg(organizationId: string): number {
  let n = 0;
  for (let i = courses.length - 1; i >= 0; i--) {
    if (courses[i].organizationId === organizationId) {
      tombstoneCourse(courses[i].id);
      courses.splice(i, 1);
      n++;
    }
  }
  for (let i = placements.length - 1; i >= 0; i--) {
    if (placements[i].organizationId === organizationId) {
      tombstonePlacement(placements[i].id);
      placements.splice(i, 1);
      n++;
    }
  }
  if (n) { flushCourses(); flushPlacements(); }
  return n;
}
