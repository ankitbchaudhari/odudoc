import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendorById, updateVendor } from "@/lib/vendors-store";

export const runtime = "nodejs";

// GET — admin fetch of a single vendor (full record, including masked bank).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const v = getVendorById(id);
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ vendor: v });
}

// PATCH — admin edits editable vendor fields (primarily commissionPercent).
// Per-vendor commission overrides the default 10%. The change takes effect
// for future payout ledger entries; historical entries keep their snapshot.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (body.commissionPercent !== undefined) {
    const n = Number(body.commissionPercent);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json(
        { error: "commissionPercent must be between 0 and 100" },
        { status: 400 }
      );
    }
    patch.commissionPercent = Math.round(n * 100) / 100;
  }
  if (typeof body.name === "string" && body.name.trim().length >= 2) patch.name = body.name.trim();
  if (typeof body.phone === "string") patch.phone = body.phone.trim();
  if (typeof body.addressLine === "string") patch.addressLine = body.addressLine.trim();
  if (typeof body.city === "string") patch.city = body.city.trim();
  if (typeof body.country === "string") patch.country = body.country.trim();

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const updated = updateVendor(id, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ vendor: updated });
}
