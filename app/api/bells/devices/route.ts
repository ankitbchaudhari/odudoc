// /api/bells/devices
//   GET — list devices for the calling tenant.
//   POST — register a new bell device.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listDevices, registerDevice, setDeviceActive } from "@/lib/bells-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const RegisterSchema = z.object({
  kind: z.enum(["opd_phone", "ipd_zigbee", "ot_console"]),
  label: nonEmptyString.max(120),
  identifier: nonEmptyString.max(120),
});

const PatchSchema = z.object({ deviceId: nonEmptyString.max(40), active: z.boolean() });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId;
  return NextResponse.json({ devices: listDevices(orgId) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId || "default";
  const parsed = await parseJson(request, RegisterSchema);
  if (parsed instanceof NextResponse) return parsed;
  const d = registerDevice({ ...parsed, organizationId: orgId });
  return NextResponse.json({ device: d }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = await parseJson(request, PatchSchema);
  if (parsed instanceof NextResponse) return parsed;
  const d = setDeviceActive(parsed.deviceId, parsed.active);
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ device: d });
}
