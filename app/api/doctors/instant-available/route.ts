// GET /api/doctors/instant-available?specialty=cardiologist
//
// Public — returns the set of doctors whose instantAvailableUntil
// flag is in the future. Used by the homepage "Consult now" button
// to route the patient to the first available doctor in the chosen
// specialty (or any specialty if none specified).
//
// Sorted by rating desc so the patient lands on the best-rated
// doctor that's currently online.

import { NextRequest, NextResponse } from "next/server";
import { isInstantlyAvailable, listDoctors, reloadDoctors } from "@/lib/doctors-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await reloadDoctors();
  const url = new URL(req.url);
  const specialty = url.searchParams.get("specialty")?.toLowerCase().trim();

  const all = listDoctors({}).filter((d) => isInstantlyAvailable(d));
  const filtered = specialty
    ? all.filter((d) => (d.specialty || "").toLowerCase().includes(specialty))
    : all;
  const sorted = filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  return NextResponse.json({
    available: sorted.map((d) => ({
      id: d.id,
      name: d.name,
      specialty: d.specialty,
      rating: d.rating,
      fee: d.fee,
      city: d.city,
      imageUrl: d.imageUrl,
      instantAvailableUntil: d.instantAvailableUntil,
    })),
    total: sorted.length,
  });
}
