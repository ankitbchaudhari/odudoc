// Realtime provider tracking for home-care visits.
//
// Provider device POSTs its current lat/lng every 30 s. Patient
// SSE subscriber gets each update for their assigned visit only.
// Channel layout: home-care:visit:<visitId>
//
// Backed by lib/pubsub so when REDIS_URL is set the fanout spans
// Lambdas; in-memory otherwise.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publish, subscribe } from "@/lib/pubsub";
import { listVisits, updateVisitStatus } from "@/lib/home-healthcare-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const PingSchema = z.object({
  visitId: nonEmptyString.max(40),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  status: z.enum(["en_route", "in_progress", "completed"]).optional(),
});

// POST — provider ping
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = await parseJson(request, PingSchema);
  if (parsed instanceof NextResponse) return parsed;
  // Update visit status if the provider signalled a transition.
  if (parsed.status) {
    updateVisitStatus(parsed.visitId, parsed.status);
  }
  await publish(`home-care:visit:${parsed.visitId}`, {
    lat: parsed.lat,
    lng: parsed.lng,
    status: parsed.status,
    providerEmail: session.user.email,
    at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}

// GET (SSE) — patient subscribes to their visit's stream
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const visitId = request.nextUrl.searchParams.get("visitId");
  if (!visitId) return new Response("visitId required", { status: 400 });

  // Verify the patient owns this visit.
  const visits = listVisits({ patientEmail: session.user.email });
  if (!visits.find((v) => v.id === visitId)) {
    return new Response("Not your visit", { status: 403 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      send({ type: "hello", visitId });
      const unsubscribe = await subscribe(`home-care:visit:${visitId}`, (msg) => {
        send(msg.payload);
      });
      const heartbeat = setInterval(() => {
        controller.enqueue(enc.encode(":keepalive\n\n"));
      }, 25_000);
      // Cleanup when the client disconnects.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (controller as any)._cleanup = async () => {
        await unsubscribe();
        clearInterval(heartbeat);
      };
    },
    async cancel() {
      // ReadableStream calls cancel() on disconnect.
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
