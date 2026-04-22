import { NextResponse } from "next/server";
import { getPublicDoctorByIdFresh } from "@/lib/public-doctors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const doc = await getPublicDoctorByIdFresh(params.id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ doctor: doc });
}
