import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listUsersAdmin,
  reloadUsers,
  findUserByEmail,
  createUser,
  markEmailVerified,
} from "@/lib/users-store";
import { awaitAllFlushes } from "@/lib/persistent-array";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await reloadUsers();
  return NextResponse.json({ users: listUsersAdmin() });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    role?: "patient" | "doctor" | "admin" | "staff";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const phone = (body.phone || "").trim();
  const password = body.password || "";
  const userRole = body.role || "patient";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "name, email, and password are required" },
      { status: 400 }
    );
  }

  await reloadUsers();
  if (findUserByEmail(email)) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const u = createUser({ name, email, phone, password, role: userRole });
  // Admin-provisioned account: the admin is vouching for this email by
  // putting it in the system and will be handing over the password
  // out-of-band. Pre-verify so the user isn't blocked by a verify-link
  // step they never triggered.
  markEmailVerified(email);
  // Drain the two pending writes (user insert + verification flag) so the
  // Lambda doesn't freeze mid-flight and lose them.
  await awaitAllFlushes();
  return NextResponse.json({ ok: true, id: u.id });
}
