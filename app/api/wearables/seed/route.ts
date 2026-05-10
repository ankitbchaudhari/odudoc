// Synthetic seed endpoint — drops 30d of plausible readings for a
// chosen persona so demos render with content. Idempotent in the
// sense that re-running just appends; the demo UI provides a
// "clear my data" path via DELETE /api/wearables/devices?id=...

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { linkDevice, ingestReadings, listDevices } from "@/lib/wearables/store";
import {
  generateSyntheticReadings,
  type SyntheticPersona,
} from "@/lib/wearables/synthetic";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERSONAS: SyntheticPersona[] = ["diabetic_hypertensive", "athlete", "post_op"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const persona = (body.persona || "diabetic_hypertensive") as SyntheticPersona;
  if (!PERSONAS.includes(persona)) {
    return NextResponse.json({ error: "invalid_persona" }, { status: 400 });
  }
  // Re-use an existing manual demo device when present so the patient
  // doesn't accumulate clones across re-seeds.
  let device = listDevices(userId).find((d) => d.provider === "manual" && d.displayName.startsWith("Demo wearable"));
  if (!device) {
    device = linkDevice({
      userId,
      provider: "manual",
      displayName: `Demo wearable (${persona.replace("_", " ")})`,
    });
  }
  const synth = generateSyntheticReadings({
    userId,
    deviceId: device.id,
    persona,
    days: typeof body.days === "number" ? body.days : 30,
  });
  ingestReadings(synth);
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ device, inserted: synth.length, persona });
}
