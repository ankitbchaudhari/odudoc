// GET /api/live-config — SSE stream for tenant config changes.
//
// Client opens an EventSource pointing here; every published
// config change for the calling tenant fans out as an SSE message.
// Disconnect on tab close; the listener is garbage-collected from
// the in-process pub/sub by the cleanup callback registered in
// the stream-cancel handler.
//
// Each message is one ConfigChangeEvent JSON encoded as the SSE
// `data:` payload. Clients should ignore events whose version is
// ≤ the last seen version for that tenant.

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { currentVersion, subscribe, type ConfigChangeEvent } from "@/lib/live-config-channel";

export const runtime = "nodejs";

export async function GET(_request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId;
  if (!orgId) return new Response("No tenant context", { status: 400 });

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (ev: ConfigChangeEvent | { type: "hello"; version: number }) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
      };

      // Initial hello so the client knows the version baseline.
      send({ type: "hello", version: currentVersion(orgId) });

      const unsubscribe = subscribe(orgId, (ev) => send(ev));

      // Heartbeat every 25 s so the connection doesn't time out on
      // intermediate proxies (Vercel caps idle SSE at ~60 s).
      const heartbeat = setInterval(() => {
        controller.enqueue(enc.encode(":keepalive\n\n"));
      }, 25_000);

      // Cancel cleanup wires through here on tab close.
      const onCancel = () => {
        unsubscribe();
        clearInterval(heartbeat);
      };
      // Stash on controller for cancel() to call. Next.js's
      // ReadableStream wrapper invokes cancel() automatically when
      // the client disconnects.
      (controller as unknown as { _onCancel?: typeof onCancel })._onCancel = onCancel;
    },
    cancel(reason) {
      void reason;
      // Cleanup handler stashed in start().
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
