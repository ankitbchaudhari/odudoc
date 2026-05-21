// V8 §1 — Student marketplace, online courses surface.
//
// Courses are sold by Education Organisation entities to students /
// professionals via the public /courses page. On enrolment the
// platform takes a commission, the rest settles to the education
// org's wallet on completion.
//
// This commit ships the courses surface only. The other three V8 §1
// categories (study abroad, jobs, internships) reuse the same
// pattern — separate stores would just duplicate this scaffold.

import { bindPersistentArray } from "@/lib/persistent-array";
import { ensureWallet, transfer } from "@/lib/wallet-store";
import { recordEvent } from "@/lib/accountability-store";

export type CourseTier = "free" | "paid" | "premium";
export type CourseLevel = "intro" | "intermediate" | "advanced" | "post_graduate";

export interface Course {
  id: string;
  /** Slug for /courses/[slug] route. */
  slug: string;
  title: string;
  /** Owner education organisation entity id. */
  providerId: string;
  providerName: string;
  /** Short hook for the card. */
  tagline: string;
  /** Long-form description shown on the detail page. */
  description: string;
  /** Hero image URL (uploaded via V9 §2 photo endpoint with
   *  subject="entity-hero"). */
  imageUrl?: string;
  tier: CourseTier;
  level: CourseLevel;
  /** Price for paid/premium tiers. Free courses set 0. */
  priceCents: number;
  currency: string;
  /** Approximate effort in hours. */
  effortHours: number;
  /** Whether enrolment is currently open. */
  status: "draft" | "published" | "archived";
  /** Tags — surface filters on /courses by these. */
  tags: string[];
  /** Optional CME credit hours awarded on completion. */
  cmeCredits?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  courseId: string;
  studentEmail: string;
  studentName: string;
  /** When the student paid (or enrolled if free). */
  enrolledAt: string;
  /** When the course was marked complete. */
  completedAt?: string;
  /** Was the enrolment fee actually charged (or skipped for free)? */
  feeCharged: boolean;
  paidCents: number;
  currency: string;
  /** Education org's wallet settlement happens on completion;
   *  null until then. */
  settledTxId?: string;
}

const courses: Course[] = [];
const enrollments: Enrollment[] = [];

const coursesHandle = bindPersistentArray<Course>("courses", courses, () => SEED_COURSES);
const enrollHandle  = bindPersistentArray<Enrollment>("course_enrollments", enrollments);

let hydrated = false;
async function ensureHydrated() {
  if (hydrated) return;
  await Promise.all([coursesHandle.hydrate(), enrollHandle.hydrate()]);
  hydrated = true;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const PLATFORM_COMMISSION_PCT = 20; // V8 §1.7 default; per-org override later

// ── Read ──────────────────────────────────────────────────────────

export async function listCourses(filter: { tier?: CourseTier; level?: CourseLevel; tag?: string; status?: Course["status"] } = {}): Promise<Course[]> {
  await ensureHydrated();
  let rows = courses.filter((c) => c.status === (filter.status || "published"));
  if (filter.tier)  rows = rows.filter((c) => c.tier === filter.tier);
  if (filter.level) rows = rows.filter((c) => c.level === filter.level);
  if (filter.tag)   rows = rows.filter((c) => c.tags.includes(filter.tag!));
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  await ensureHydrated();
  return courses.find((c) => c.slug === slug) || null;
}

export async function listMyEnrollments(studentEmail: string): Promise<Enrollment[]> {
  await ensureHydrated();
  return enrollments.filter((e) => e.studentEmail === studentEmail).sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt));
}

// ── Enrol ─────────────────────────────────────────────────────────

export async function enrol(courseId: string, student: { email: string; name: string }): Promise<{ ok: boolean; error?: string; enrolment?: Enrollment }> {
  await ensureHydrated();
  const course = courses.find((c) => c.id === courseId);
  if (!course) return { ok: false, error: "course_not_found" };
  if (course.status !== "published") return { ok: false, error: "course_not_published" };

  const existing = enrollments.find((e) => e.courseId === courseId && e.studentEmail === student.email);
  if (existing) return { ok: true, enrolment: existing };

  // Free courses skip the wallet leg entirely.
  if (course.tier === "free" || course.priceCents === 0) {
    const e: Enrollment = {
      id: uid("enr"),
      courseId,
      studentEmail: student.email,
      studentName: student.name,
      enrolledAt: new Date().toISOString(),
      feeCharged: false,
      paidCents: 0,
      currency: course.currency,
    };
    enrollments.push(e);
    enrollHandle.flush();
    await recordEvent({
      category: "financial",
      action: "course.enrolled.free",
      actorEmail: student.email,
      subjectKind: "course",
      subjectId: courseId,
      summary: `${student.name} enrolled in free course "${course.title}".`,
    }).catch(() => {/* ignore */});
    return { ok: true, enrolment: e };
  }

  // Paid courses charge the student wallet first; education-org
  // settlement happens on completion to discourage drop-off-and-
  // ghost from the provider.
  try {
    const studentWallet = await ensureWallet("patient", student.email, course.currency);
    const platformWallet = await ensureWallet("platform", "platform-singleton", course.currency);

    if (studentWallet.balanceCents < course.priceCents) {
      return { ok: false, error: "insufficient_balance" };
    }
    await transfer({
      kind: "course_purchase",
      fromWalletId: studentWallet.id,
      toWalletId: platformWallet.id,
      amountCents: course.priceCents,
      currency: course.currency,
      refKind: "course",
      refId: courseId,
      note: `Course enrolment: ${course.title}`,
      actorEmail: student.email,
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const e: Enrollment = {
    id: uid("enr"),
    courseId,
    studentEmail: student.email,
    studentName: student.name,
    enrolledAt: new Date().toISOString(),
    feeCharged: true,
    paidCents: course.priceCents,
    currency: course.currency,
  };
  enrollments.push(e);
  enrollHandle.flush();
  return { ok: true, enrolment: e };
}

/** Mark a course complete and settle the provider wallet. */
export async function markComplete(enrolmentId: string): Promise<Enrollment | null> {
  await ensureHydrated();
  const e = enrollments.find((x) => x.id === enrolmentId);
  if (!e || e.completedAt) return e || null;
  const course = courses.find((c) => c.id === e.courseId);
  if (!course) return null;
  e.completedAt = new Date().toISOString();

  if (e.feeCharged && e.paidCents > 0) {
    try {
      const platformWallet = await ensureWallet("platform", "platform-singleton", e.currency);
      const providerWallet = await ensureWallet("education", course.providerId, e.currency);
      const commission = Math.round((e.paidCents * PLATFORM_COMMISSION_PCT) / 100);
      const providerCut = e.paidCents - commission;
      const tx = await transfer({
        kind: "settlement",
        fromWalletId: platformWallet.id,
        toWalletId: providerWallet.id,
        amountCents: providerCut,
        currency: e.currency,
        refKind: "course",
        refId: course.id,
        note: `Course completion settlement (${100 - PLATFORM_COMMISSION_PCT}% of fee)`,
      });
      e.settledTxId = tx.id;
    } catch {/* settlement best-effort */}
  }

  enrollHandle.flush();
  return e;
}

// ── Seed (for demo) ──────────────────────────────────────────────

const SEED_COURSES: Course[] = [
  {
    id: "course_acls",
    slug: "advanced-cardiac-life-support",
    title: "Advanced Cardiac Life Support (ACLS)",
    providerId: "demo-edu-org",
    providerName: "OduDoc Academy",
    tagline: "AHA-aligned ACLS certification, fully online.",
    description: "Six modules covering rhythm recognition, pharmacology, defibrillation, post-cardiac-arrest care, and team dynamics. Includes interactive simulations and a final assessment.",
    tier: "paid",
    level: "intermediate",
    priceCents: 750_000, // ₹7,500
    currency: "INR",
    effortHours: 16,
    status: "published",
    tags: ["emergency", "cardiology", "certification"],
    cmeCredits: 16,
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  },
  {
    id: "course_telemed_intro",
    slug: "telemedicine-fundamentals",
    title: "Telemedicine Fundamentals",
    providerId: "demo-edu-org",
    providerName: "OduDoc Academy",
    tagline: "Build your first remote consult workflow in 4 hours.",
    description: "Aimed at clinicians new to remote care. Covers IMC Telemedicine Guidelines, consent capture, prescription regulations, and OduDoc Pro app walkthrough.",
    tier: "free",
    level: "intro",
    priceCents: 0,
    currency: "INR",
    effortHours: 4,
    status: "published",
    tags: ["telemedicine", "compliance"],
    cmeCredits: 4,
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  },
  {
    id: "course_pg_obg",
    slug: "obstetrics-postgrad-prep",
    title: "Obstetrics — Post-Graduate Prep Course",
    providerId: "demo-edu-org",
    providerName: "OduDoc Academy",
    tagline: "Curated content + mock exams for the OB/GYN PG entrance.",
    description: "Twelve weeks of curated lectures, weekly mock exams, and one-on-one mentor sessions covering the OB/GYN PG entrance syllabus.",
    tier: "premium",
    level: "post_graduate",
    priceCents: 1_800_000, // ₹18,000
    currency: "INR",
    effortHours: 120,
    status: "published",
    tags: ["pg-prep", "obstetrics"],
    cmeCredits: undefined,
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  },
];
