// Doctor analytics — earnings + booking conversion + ratings.
//
// Pulls from existing consultation/booking stores. Read-only; no
// mutating operations.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findDoctorByEmail } from "@/lib/doctors-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ConsultationLike {
  doctorId?: string; doctorEmail?: string; doctorName?: string;
  status?: string; createdAt?: string; consultationFee?: number;
  fee?: number; rating?: number; reviewedAt?: string;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const doctor = findDoctorByEmail(email);
  if (!doctor) return NextResponse.json({ error: "not_a_doctor" }, { status: 403 });

  const url = new URL(req.url);
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get("days") || "30", 10)));
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;

  // Pull consultations dynamically so the route survives whether the
  // store layer is in-memory or DB-backed.
  let consultations: ConsultationLike[] = [];
  try {
    const mod = await import("@/lib/consultations-store");
    if (typeof (mod as { listConsultations?: unknown }).listConsultations === "function") {
      consultations = ((mod as unknown as { listConsultations: () => ConsultationLike[] }).listConsultations() || [])
        .filter((c) => (c.doctorEmail && c.doctorEmail.toLowerCase() === email.toLowerCase()) || (c.doctorId && c.doctorId === doctor.id));
    }
  } catch { /* fall through with empty list */ }

  const inWindow = consultations.filter((c) => new Date(c.createdAt || 0).getTime() >= sinceMs);
  const completed = inWindow.filter((c) => c.status === "completed");
  const cancelled = inWindow.filter((c) => c.status === "cancelled" || c.status === "rejected");
  const upcoming = consultations.filter((c) => ["awaiting_doctor", "approved", "in_progress", "rescheduled"].includes(c.status || ""));

  // Daily timeline for the sparkline.
  const byDay = new Map<string, { date: string; bookings: number; completed: number; revenue: number }>();
  for (let d = 0; d < days; d++) {
    const ts = new Date(sinceMs + d * 24 * 60 * 60 * 1000);
    const key = ts.toISOString().slice(0, 10);
    byDay.set(key, { date: key, bookings: 0, completed: 0, revenue: 0 });
  }
  for (const c of inWindow) {
    const key = (c.createdAt || "").slice(0, 10);
    const row = byDay.get(key);
    if (!row) continue;
    row.bookings++;
    if (c.status === "completed") {
      row.completed++;
      row.revenue += Number(c.consultationFee || c.fee || 0);
    }
  }

  // Rating average.
  const rated = consultations.filter((c) => typeof c.rating === "number");
  const ratingAvg = rated.length > 0
    ? rated.reduce((a, c) => a + Number(c.rating), 0) / rated.length
    : null;

  // Earnings: doctor keeps 70% of the consultation fee (the platform
  // takes 30% per the calculateCommission helper). Reflect that here
  // so the dashboard matches what they'll actually receive.
  const grossRupees = completed.reduce((a, c) => a + Number(c.consultationFee || c.fee || 0), 0);
  const platformCutRupees = Math.round(grossRupees * 0.30 * 100) / 100;
  const doctorEarningsRupees = Math.round((grossRupees - platformCutRupees) * 100) / 100;

  // Conversion = completed / (completed + cancelled).
  const decided = completed.length + cancelled.length;
  const conversionPct = decided === 0 ? 0 : Math.round((completed.length / decided) * 100);

  // Rolling 7-day comparison vs the prior 7 days.
  const prior7 = consultations.filter((c) => {
    const t = new Date(c.createdAt || 0).getTime();
    return t >= sinceMs - 7 * 24 * 60 * 60 * 1000 && t < sinceMs;
  });
  const last7 = inWindow.filter((c) => new Date(c.createdAt || 0).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000);
  const wowDelta = prior7.length === 0 ? 0 : Math.round(((last7.length - prior7.length) / prior7.length) * 100);

  // Top complaint buckets — what kinds of patients are booking.
  const complaintHits = new Map<string, number>();
  for (const c of inWindow) {
    const text = ((c as ConsultationLike & { medicalHistory?: { chiefComplaint?: string } }).medicalHistory?.chiefComplaint || "").toLowerCase();
    if (!text) continue;
    if (text.includes("chest")) complaintHits.set("chest pain", (complaintHits.get("chest pain") || 0) + 1);
    if (text.includes("head")) complaintHits.set("headache", (complaintHits.get("headache") || 0) + 1);
    if (text.includes("fever") || text.includes("temperature")) complaintHits.set("fever", (complaintHits.get("fever") || 0) + 1);
    if (text.includes("cough")) complaintHits.set("cough", (complaintHits.get("cough") || 0) + 1);
    if (text.includes("breath")) complaintHits.set("breathing", (complaintHits.get("breathing") || 0) + 1);
    if (text.includes("abdomen") || text.includes("stomach")) complaintHits.set("abdominal", (complaintHits.get("abdominal") || 0) + 1);
  }
  const topComplaints = Array.from(complaintHits.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })).slice(0, 6);

  return NextResponse.json({
    doctor: {
      id: doctor.id, name: doctor.name, specialty: doctor.specialty,
      rating: doctor.rating, consultationCount: doctor.consultationCount,
    },
    windowDays: days,
    kpis: {
      bookingsTotal: inWindow.length,
      completed: completed.length,
      cancelled: cancelled.length,
      upcoming: upcoming.length,
      conversionPct,
      ratingAvg,
      ratingCount: rated.length,
      grossRupees,
      platformCutRupees,
      doctorEarningsRupees,
      wowDelta,
    },
    timeline: Array.from(byDay.values()),
    topComplaints,
  });
}
