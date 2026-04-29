// Admin-only ABDM credential management.
// GET  — current config (with masked secret)
// POST — patch config (only super-admin can set client_secret)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAbdmConfig,
  publicShape,
  saveAbdmConfig,
  type AbdmEnvironment,
} from "@/lib/abdm-config-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const cfg = await getAbdmConfig();
  return NextResponse.json({ config: publicShape(cfg) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const adminEmail = (session?.user as { email?: string; role?: string } | undefined)?.email || "";
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: {
    enabled?: boolean;
    environment?: AbdmEnvironment;
    baseUrl?: string;
    clientId?: string;
    clientSecret?: string;
    hiuId?: string;
    hipId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Parameters<typeof saveAbdmConfig>[0] = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.environment === "sandbox" || body.environment === "production") {
    patch.environment = body.environment;
  }
  if (typeof body.baseUrl === "string") patch.baseUrl = body.baseUrl.trim();
  if (typeof body.clientId === "string") patch.clientId = body.clientId.trim();
  // clientSecret can be intentionally cleared by sending empty string;
  // omit the field to leave it unchanged.
  if (typeof body.clientSecret === "string") patch.clientSecret = body.clientSecret;
  if (typeof body.hiuId === "string") patch.hiuId = body.hiuId.trim();
  if (typeof body.hipId === "string") patch.hipId = body.hipId.trim();

  const next = await saveAbdmConfig(patch, adminEmail || "admin");
  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("admin.abdm.config_persist_failed", err);
    return NextResponse.json(
      { error: "ABDM config service is temporarily unavailable. Please retry." },
      { status: 503 }
    );
  }
  return NextResponse.json({ config: publicShape(next) });
}
