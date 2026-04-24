import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  banUser,
  unbanUser,
  findUserById,
  reloadUsers,
  changeUserRole,
  deleteUser,
  type User,
} from "@/lib/users-store";
import { awaitAllFlushes } from "@/lib/persistent-array";
import {
  sendAccountBannedEmail,
  sendAccountRestoredEmail,
  sendEmail,
} from "@/lib/email";
import { createDoctor, findDoctorByEmail } from "@/lib/doctors-store";
import { addAdminNotification } from "@/lib/admin-notifications-store";

import { log } from "@/lib/log";
export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  let body: { action?: string; reason?: string; role?: User["role"] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await reloadUsers();
  const existing = findUserById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.action === "ban") {
    const reason = (body.reason || "").trim();
    if (!reason) {
      return NextResponse.json(
        { error: "reason is required to ban a user" },
        { status: 400 }
      );
    }
    const u = banUser(id, reason);
    if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
    try {
      await sendAccountBannedEmail({ to: u.email, name: u.name, reason });
    } catch (err) {
      log.error("console.error", undefined, { args: ["[admin/users] ban email failed:", err] });
    }
    await awaitAllFlushes();
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unban") {
    const u = unbanUser(id);
    if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
    try {
      await sendAccountRestoredEmail({ to: u.email, name: u.name });
    } catch (err) {
      log.error("console.error", undefined, { args: ["[admin/users] unban email failed:", err] });
    }
    await awaitAllFlushes();
    return NextResponse.json({ ok: true });
  }

  if (body.action === "change-role") {
    const newRole = body.role;
    const allowed: User["role"][] = [
      "patient",
      "doctor",
      "admin",
      "staff",
      "vendor",
      "hr",
      "support",
      "pharmacist",
    ];
    if (!newRole || !allowed.includes(newRole)) {
      return NextResponse.json(
        { error: `role must be one of ${allowed.join(", ")}` },
        { status: 400 }
      );
    }
    const prevRole = existing.role;
    if (prevRole === newRole) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    const u = changeUserRole(id, newRole);
    if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // When promoting to doctor, ensure a Doctor record exists so they show up
    // in /admin/doctors and on the public /doctors page. Admin can then fill
    // in specialty / department / fee from the doctor editor.
    let createdDoctorId: string | null = null;
    if (newRole === "doctor") {
      const existingDoctor = findDoctorByEmail(u.email);
      if (!existingDoctor) {
        const created = createDoctor({
          name: u.name.startsWith("Dr.") ? u.name : `Dr. ${u.name}`,
          specialty: "General Physician",
          email: u.email,
          phone: u.phone || "",
          status: "Active",
        });
        createdDoctorId = created.id;
      }
    }

    addAdminNotification({
      type: "role_changed",
      title: "User role changed",
      body: `${u.name} role changed: ${prevRole} → ${newRole}`,
      link: newRole === "doctor" ? "/admin/doctors" : "/admin/users",
    });

    // Notify the user by email so they know their account was upgraded /
    // changed by an admin.
    try {
      const heading =
        newRole === "doctor"
          ? "You're now a doctor on OduDoc"
          : newRole === "staff"
            ? "You're now a staff member on OduDoc"
            : newRole === "admin"
              ? "You're now an admin on OduDoc"
              : "Your role has been updated";
      const bodyLines =
        newRole === "doctor"
          ? `Welcome to the OduDoc doctor team! You now have access to the doctor dashboard where you can manage appointments, prescriptions, and earnings. Our admin team may reach out with onboarding details like your department and specialty.`
          : newRole === "staff"
            ? `Your OduDoc account now has staff access. You can manage products, orders, and shop operations from the admin console.`
            : newRole === "admin"
              ? `Your OduDoc account has been granted admin access.`
              : `Your OduDoc account role has been updated to ${newRole}.`;
      await sendEmail({
        from: "admin",
        to: u.email,
        subject: heading,
        html: `<p>Hi ${u.name},</p><p>${bodyLines}</p><p>Sign in to see your new dashboard.</p>`,
      });
    } catch (err) {
      log.error("console.error", undefined, { args: ["[admin/users] role-change email failed:", err] });
    }

    await awaitAllFlushes();
    return NextResponse.json({ ok: true, createdDoctorId });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// Permanently remove a user. Guarded so admins can't accidentally delete
// themselves or the last remaining admin (that would lock everyone out of
// the admin console).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as
    | { id?: string; email?: string; role?: string }
    | undefined;
  if (!isAdmin(sessionUser?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  await reloadUsers();
  const target = findUserById(id);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Self-deletion guard — deleting yourself would invalidate your session
  // and leave you stranded.
  if (
    sessionUser?.email &&
    target.email.toLowerCase() === sessionUser.email.toLowerCase()
  ) {
    return NextResponse.json(
      { error: "You can't delete your own admin account." },
      { status: 400 }
    );
  }

  // Last-admin guard — we never want zero admins.
  if (target.role === "admin") {
    const { listUsersAdmin } = await import("@/lib/users-store");
    const remainingAdmins = listUsersAdmin().filter(
      (u) => u.role === "admin" && u.id !== target.id
    );
    if (remainingAdmins.length === 0) {
      return NextResponse.json(
        { error: "Can't delete the last admin account." },
        { status: 400 }
      );
    }
  }

  const removed = deleteUser(id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  addAdminNotification({
    type: "user_deleted",
    title: "User deleted",
    body: `${removed.name} (${removed.email}) was removed by an admin.`,
    link: "/admin/users",
  });

  // CRITICAL: wait for the delete to actually hit Postgres before we
  // return. Vercel freezes Lambdas the moment the response flushes, so a
  // fire-and-forget flush() loses the DB write and the row resurrects
  // on the next GET (a sibling Lambda re-hydrates from Postgres and
  // sees the "deleted" user again).
  await awaitAllFlushes();

  return NextResponse.json({ ok: true });
}
