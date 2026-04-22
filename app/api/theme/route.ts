import { NextResponse } from "next/server";
import { getPublicTheme } from "@/lib/theme-store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ theme: getPublicTheme() });
}
