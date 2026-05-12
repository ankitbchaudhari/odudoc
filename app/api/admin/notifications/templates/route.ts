// Lists WhatsApp Content Templates from Twilio with their Meta approval
// status. Replaces "go to Twilio Console → Senders → Templates and
// refresh" — admins see everything in one place.
//
// GET → { templates: Array<{ sid, friendlyName, language, contentType,
//          dateCreated, approvalStatuses: Record<channel, status> }> }

import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TwilioContent {
  sid: string;
  friendly_name: string;
  language: string;
  date_created: string;
  date_updated: string;
  types: Record<string, unknown>;
  variables: Record<string, string> | null;
}

interface TwilioApprovalRequest {
  status:
    | "received"
    | "pending"
    | "approved"
    | "rejected"
    | "paused"
    | "unsubmitted";
  rejection_reason?: string;
  category?: string;
  content_type?: string;
}

interface TemplateSummary {
  sid: string;
  friendlyName: string;
  language: string;
  contentType: string;
  dateCreated: string;
  whatsapp: {
    status: string;
    category?: string;
    rejectionReason?: string;
  } | null;
}

export async function GET() {
  const ctx = await getTenantContext();
  const allowed =
    ctx.isSuperAdmin || ctx.role === "admin" || ctx.role === "owner";
  if (!ctx.email || !allowed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) {
    return NextResponse.json({
      configured: false,
      templates: [],
      error: "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured",
    });
  }

  const auth = "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");

  try {
    const listRes = await fetch(
      "https://content.twilio.com/v2/Content?PageSize=50",
      {
        headers: { Authorization: auth },
        cache: "no-store",
      }
    );
    if (!listRes.ok) {
      const text = await listRes.text();
      return NextResponse.json(
        {
          configured: true,
          templates: [],
          error: `twilio_${listRes.status}`,
          detail: text.slice(0, 500),
        },
        { status: 502 }
      );
    }
    const listData = (await listRes.json()) as { contents?: TwilioContent[] };
    const contents = listData.contents ?? [];

    // For each Content, fetch the approval status. Twilio's API returns a
    // map keyed by channel; we only care about "whatsapp" here.
    const summaries: TemplateSummary[] = await Promise.all(
      contents.map(async (c): Promise<TemplateSummary> => {
        const contentType =
          (Object.keys(c.types || {})[0] || "unknown").replace("twilio/", "");
        let whatsapp: TemplateSummary["whatsapp"] = null;
        try {
          const r = await fetch(
            `https://content.twilio.com/v1/Content/${c.sid}/ApprovalRequests`,
            { headers: { Authorization: auth }, cache: "no-store" }
          );
          if (r.ok) {
            const data = (await r.json()) as {
              whatsapp?: TwilioApprovalRequest;
            };
            if (data.whatsapp) {
              whatsapp = {
                status: data.whatsapp.status,
                category: data.whatsapp.category,
                rejectionReason: data.whatsapp.rejection_reason,
              };
            }
          }
        } catch {
          // best-effort per template
        }
        return {
          sid: c.sid,
          friendlyName: c.friendly_name,
          language: c.language,
          contentType,
          dateCreated: c.date_created,
          whatsapp,
        };
      })
    );

    summaries.sort((a, b) => b.dateCreated.localeCompare(a.dateCreated));
    return NextResponse.json({ configured: true, templates: summaries });
  } catch (e) {
    return NextResponse.json(
      { configured: true, templates: [], error: (e as Error).message },
      { status: 500 }
    );
  }
}
