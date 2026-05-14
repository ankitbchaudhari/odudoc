import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getWithdrawal,
  updateWithdrawalStatus,
  type WithdrawalStatus,
} from "@/lib/withdrawals-store";
import { sendWithdrawalStatusEmail } from "@/lib/email";
import { notify } from "@/lib/notifications/notify";
import { findUserByEmail } from "@/lib/users-store";
import { sendWithdrawalProcessedViaSentDm } from "@/lib/sent-dm";

import { log } from "@/lib/log";
export const runtime = "nodejs";

// PATCH /api/withdrawals/:id
// Admin only. Moves a request between statuses:
//   pending → approved / rejected
//   approved → paid (after the transfer actually goes out)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = getWithdrawal(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { status?: WithdrawalStatus; adminNote?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status = body.status;
  const allowed: WithdrawalStatus[] = ["pending", "approved", "rejected", "paid"];
  if (!status || !allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = updateWithdrawalStatus(id, status, body.adminNote);

  // Notify the doctor whenever the status moves to a meaningful terminal-ish
  // state. "pending" transitions (e.g. an admin reopening a request) don't
  // warrant an email.
  if (
    updated &&
    (status === "approved" || status === "rejected" || status === "paid")
  ) {
    sendWithdrawalStatusEmail({
      to: updated.doctorEmail,
      doctorName: updated.doctorName,
      amount: updated.amount,
      status,
      adminNote: updated.adminNote,
    }).catch((err) =>
      log.error("[withdrawals] status email failed:", err)
    );
    // Also SMS the doctor — withdrawals are money decisions; doctors
    // routinely check phones faster than email.
    const doctor = findUserByEmail(updated.doctorEmail);
    if (doctor?.phone) {
      const verb =
        status === "approved"
          ? "approved"
          : status === "rejected"
            ? "rejected"
            : "paid out";
      const smsBody = `OduDoc: your withdrawal of ${updated.amount} has been ${verb}.${
        updated.adminNote ? " Note: " + updated.adminNote : ""
      }`;
      notify({
        channel: "sms",
        to: doctor.phone,
        body: smsBody,
        category: "billing",
      }).catch((err) => log.error("[withdrawals] status sms failed:", err));
      // Best-effort WhatsApp template when the payout actually goes
      // out ("paid" — our equivalent of processed). Extract last 4
      // digits of the account number from the free-text accountDetails.
      if (status === "paid") {
        (async () => {
          try {
            const digits = (updated.accountDetails || "").replace(/\D/g, "");
            const last4 = digits.slice(-4) || "----";
            const r = await sendWithdrawalProcessedViaSentDm(doctor.phone!, {
              doctorName: updated.doctorName || "Doctor",
              amount: String(updated.amount),
              accountLast4: last4,
              reference: updated.id,
            });
            if (!r.ok) log.warn("withdrawals.processed_wa_template_failed", { error: r.error || "unknown" });
          } catch (err) {
            log.warn("withdrawals.processed_wa_template_threw", { error: err instanceof Error ? err.message : "send threw" });
          }
        })();
      }
    }
  }

  return NextResponse.json({ withdrawal: updated });
}
