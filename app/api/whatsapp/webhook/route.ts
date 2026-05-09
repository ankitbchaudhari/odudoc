// Twilio WhatsApp inbound webhook.
//
// Twilio POSTs every inbound WhatsApp message here as
// application/x-www-form-urlencoded with fields including:
//   From: "whatsapp:+919876543210"
//   To:   "whatsapp:+14155238886"
//   Body: "<message text>"
//   MessageSid, ProfileName, etc.
//
// We classify the body, route by intent, append both the inbound and
// our auto-reply to the conversation thread, and send the auto-reply
// back through the dispatcher. Twilio expects a 200 response with an
// optional TwiML body — we send empty TwiML and trigger the actual
// reply through the API instead, which keeps the webhook hot path
// short and lets staff also respond manually from the inbox.

import { NextRequest, NextResponse } from "next/server";
import { findConversationByPhone, appendMessage, setOptIn } from "@/lib/whatsapp/conversations-store";
import { classify, HELP_MENU } from "@/lib/whatsapp/intent";
import { sendFreeform } from "@/lib/whatsapp/dispatcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Standard auto-replies per intent. Surfaced inline so a reviewer can
// audit what the bot will say without grepping multiple files.
const AUTO_REPLIES: Record<string, string> = {
  confirm: "✓ Got it — your appointment is confirmed.",
  cancel: "Your appointment has been cancelled. Reply CONFIRM if you'd like to rebook.",
  reschedule: "We'll reach out shortly to find a new time. You can also pick a slot at https://odudoc.com/dashboard/consultations",
  refill: "Refill request received. We'll forward this to your pharmacy and send a confirmation when it's ready.",
  skip: "No problem — reminder dismissed.",
  deliver: "Delivery requested. The pharmacy will confirm dispatch shortly.",
  pharmacies: "Find pharmacies near you: https://odudoc.com/shop",
  results: "Your results summary will be sent shortly. For details ask your doctor — reply DOCTOR.",
  doctor: "We've notified your physician — they'll follow up within 24 hours.",
  better: "Glad to hear you're feeling better! Reply WORSE any time if things change.",
  same: "Thanks for the update — we'll let your doctor know.",
  worse: "We're sorry to hear that. Your doctor has been notified and will reach out urgently. If symptoms are severe, please go to an ER.",
  start: "✓ You're opted in. Reply STOP any time to opt out.",
  stop: "Got it — you've been opted out of marketing messages. Important transactional notices (lab results, appointment changes) will still be sent. Reply START to opt back in.",
  help: HELP_MENU,
};

export async function POST(req: NextRequest) {
  let from = "";
  let body = "";
  let providerSid: string | undefined;
  // Twilio sends form-encoded; fall back to JSON for testing.
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    from = params.get("From") || "";
    body = params.get("Body") || "";
    providerSid = params.get("MessageSid") || undefined;
  } else {
    const j = await req.json().catch(() => ({} as Record<string, unknown>));
    from = String(j.From || j.from || "");
    body = String(j.Body || j.body || "");
    providerSid = (j.MessageSid as string) || (j.providerSid as string) || undefined;
  }

  if (!from || !body) {
    return new NextResponse("<Response/>", { status: 200, headers: { "content-type": "text/xml" } });
  }

  const conv = findConversationByPhone(from);
  if (!conv) {
    // Unknown number. We log the message into a sentinel conversation
    // bucket so staff can review unsolicited inbound (often new
    // patients). For now we just no-op — a future improvement is to
    // auto-create a conversation tied to a "platform" sentinel org.
    return new NextResponse("<Response/>", { status: 200, headers: { "content-type": "text/xml" } });
  }

  const classified = classify(body);
  appendMessage(conv.id, {
    direction: "inbound",
    channel: "whatsapp",
    body,
    intent: classified?.intent,
    providerSid,
    status: "delivered",
  });

  // Lifecycle commands directly mutate opt-in state.
  if (classified?.intent === "stop") setOptIn(conv.id, "opted_out");
  if (classified?.intent === "start") setOptIn(conv.id, "opted_in");

  // Auto-reply. We send through the dispatcher so the outbound row
  // shows up in the same conversation thread.
  if (classified) {
    const reply = AUTO_REPLIES[classified.intent];
    if (reply) {
      // Fire-and-forget; webhook returns immediately.
      sendFreeform({
        conversationId: conv.id,
        patientPhone: conv.patientPhone,
        body: reply,
      }).catch(() => { /* logged inside dispatcher */ });
    }
  }

  return new NextResponse("<Response/>", { status: 200, headers: { "content-type": "text/xml" } });
}
