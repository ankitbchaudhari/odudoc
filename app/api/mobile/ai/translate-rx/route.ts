// POST /api/mobile/ai/translate-rx
//
// Mobile-Bearer-auth equivalent of /api/ai/translate-rx. Doctor fills
// the prescription in English, picks a language, taps Translate — the
// natural-language fields flip to the patient's language while drug
// names stay in Latin script.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { translatePrescription } from "@/lib/ai-translate-rx";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";
import type { MedicineRow } from "@/lib/ai-prescription";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "mobile-ai-translate-rx", 30, "10 m");
  if (blocked) return blocked;

  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "doctor" && auth.role !== "admin" && auth.role !== "nurse") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    language?: string;
    treatment?: string;
    investigations?: string[];
    medicines?: MedicineRow[];
    warning?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const language = (body.language || "").trim();
  if (!language) {
    return NextResponse.json({ error: "language is required" }, { status: 400 });
  }

  try {
    const result = await translatePrescription({
      language,
      treatment: body.treatment || "",
      investigations: Array.isArray(body.investigations) ? body.investigations : [],
      medicines: Array.isArray(body.medicines) ? body.medicines : [],
      warning: body.warning,
      callerEmail: auth.email,
    });
    return NextResponse.json({ result });
  } catch (err) {
    log.error("mobile_ai_translate_rx.failed", err);
    const msg = err instanceof Error ? err.message : "Translate failed";
    return NextResponse.json(
      {
        error: /GEMINI_API_KEY/.test(msg)
          ? "AI translator is not configured."
          : "Could not translate.",
      },
      { status: 502 },
    );
  }
}
