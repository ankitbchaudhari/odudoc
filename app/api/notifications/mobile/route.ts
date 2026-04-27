// GET /api/notifications/mobile
//
// In-app notification feed for the patient app. There's no per-user
// notification store yet, so we synthesize a feed from the user's
// bookings: an "appointment confirmed" entry for each one, plus a
// "reminder" entry for any upcoming booking happening today/tomorrow.
// When a real notifications table lands, this can be swapped for a
// straight read from that table without changing the response shape.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { getBookingsForUser } from "@/lib/bookings-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: "appointment" | "result" | "promo";
  date: string; // YYYY-MM-DD
  read: boolean;
};

function dayDiff(target: string, now: Date): number {
  const t = new Date(target + "T00:00:00").getTime();
  const n = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  return Math.round((t - n) / (24 * 60 * 60 * 1000));
}

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const bookings = getBookingsForUser(auth.userId, auth.email);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const items: NotificationItem[] = [];

    for (const b of bookings) {
      const date = (b as any).date as string | undefined;
      if (!date) continue;

      // Reminder for upcoming bookings within 2 days
      const diff = dayDiff(date, now);
      if (diff >= 0 && diff <= 2 && (b.status ?? "scheduled") !== "cancelled") {
        items.push({
          id: `reminder-${b.id}`,
          title: diff === 0 ? "Appointment today" : `Appointment in ${diff} day${diff === 1 ? "" : "s"}`,
          message: `${b.doctorName} on ${date} at ${b.timeSlot}`,
          type: "appointment",
          date: today,
          read: false,
        });
      }

      // Confirmation for every booking
      items.push({
        id: `booked-${b.id}`,
        title:
          (b.status ?? "scheduled") === "cancelled"
            ? "Appointment cancelled"
            : "Appointment confirmed",
        message: `${b.doctorName} on ${date} at ${b.timeSlot}`,
        type: "appointment",
        date: date,
        read: (b.status ?? "scheduled") !== "scheduled",
      });
    }

    // Sort newest first
    items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    return NextResponse.json({ notifications: items });
  } catch (err) {
    log.error("mobile notifications list error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
