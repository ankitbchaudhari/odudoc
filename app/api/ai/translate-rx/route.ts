// POST /api/ai/translate-rx
//
// Doctor-only. Takes a filled prescription draft (treatment,
// investigations, medicines, warning) and a target language, returns
// the same shape with natural-language fields translated.
//
// Drug names are guaranteed to come from the source by index — Gemini
// can't accidentally rename the medicine and break the pharmacy.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { translatePrescription } from "@/lib/ai-translate-rx";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";
import type { MedicineRow } from "@/lib/ai-prescription";

export const runtime = "nodejs";

function isClinician(role: string | undefined): boolean {
  return role === "doctor" || role === "admin" || role === "nurse";
}

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "ai-translate-rx", 30, "10 m");
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!isClinician(user?.role)) {
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
      callerEmail: user?.email,
    });
    return NextResponse.json({ result });
  } catch (err) {
    log.error("ai_translate_rx.failed", err);
    const msg = err instanceof Error ? err.message : "Translate failed";
    return NextResponse.json(
      {
        error: /GEMINI_API_KEY/.test(msg)
          ? "AI translator is not configured."
          : "Could not translate. Try again in a moment.",
      },
      { status: 502 }
    );
  }
}
