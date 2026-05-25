import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureHydrated, getSettings, updateSettings, type SiteSettings } from "@/lib/settings-store";
import { awaitAllFlushes } from "@/lib/persistent-array";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

const SECTIONS: (keyof SiteSettings)[] = [
  "common",
  "captcha",
  "paymentGateways",
  "manualPayments",
  "smtp",
  "page",
  "currency",
  "enabledCurrencies",
  "languages",
  "translations",
  "invoice",
  "socialProviders",
  "emergencyNumbers",
  "regionalPricing",
  "fx",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // Make sure the cold-start Lambda has read the persisted copy from
  // Postgres before we hand it to the admin UI; otherwise the very
  // first GET after a deploy could leak in-memory defaults.
  await ensureHydrated();
  return NextResponse.json({ settings: getSettings() });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const patch: Partial<SiteSettings> = {};
  for (const key of SECTIONS) {
    if (body[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (patch as any)[key] = body[key];
    }
  }
  await ensureHydrated();
  const settings = updateSettings(patch);
  // Drain the fire-and-forget Postgres write before responding so the
  // admin's "Saved" toast can't ever lie — without this, the Lambda
  // could freeze before saveJson() resolves on a cold serverless host.
  await awaitAllFlushes();
  return NextResponse.json({ settings });
}
