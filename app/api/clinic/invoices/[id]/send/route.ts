// POST /api/clinic/invoices/:id/send?channel=email|sms|whatsapp|all
//
// Pushes the invoice to the patient via the requested channel. The
// message body is short — just confirms the amount and links to the
// public /ci/[id] viewer where the patient can see the full
// breakdown. Defaults to "all" so reception can send everything in
// one click.

import { NextRequest, NextResponse } from "next/server";
import { getClinicSession } from "@/lib/clinic-session";
import { getInvoiceById, reloadInvoices } from "@/lib/clinic-invoices-store";
import { sendNotification } from "@/lib/notifications";
import { sentDmSend } from "@/lib/sent-dm";
import { log } from "@/lib/log";

export const runtime = "nodejs";

type Channel = "email" | "sms" | "whatsapp" | "all";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  await reloadInvoices();
  const inv = getInvoiceById(params.id);
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (inv.clinicId !== session.clinicId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const channel = (new URL(req.url).searchParams.get("channel") || "all") as Channel;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://odudoc.com";
  const link = `${baseUrl}/ci/${inv.id}`;
  const symbol = currencySymbol(inv.currency);
  const amount = `${symbol}${inv.tax.grandTotalRupees.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const issuer = inv.issuer.legalBusinessName || "OduDoc clinic";
  const subject = `Invoice ${inv.number} from ${issuer}`;
  const emailBody = `Dear ${inv.patientName},\n\nYour invoice ${inv.number} for ${amount} is ready.\n\nView and download: ${link}\n\nIssued by: ${issuer}${inv.issuer.taxId ? `\n${inv.issuer.taxIdType || "Tax ID"}: ${inv.issuer.taxId}` : ""}\n\nThis is an automated message from OduDoc. Reply STOP to opt out.`;
  const smsBody = `OduDoc: Invoice ${inv.number} from ${issuer} for ${amount}. View: ${link}`;

  const results: Record<string, { ok: boolean; error?: string }> = {};

  // Email
  if ((channel === "email" || channel === "all") && inv.patientEmail) {
    try {
      const ok = await sendNotification({
        to: inv.patientEmail,
        type: "email",
        subject,
        message: emailBody,
      });
      results.email = { ok };
    } catch (err) {
      results.email = { ok: false, error: err instanceof Error ? err.message : "send_failed" };
    }
  }

  // SMS
  if ((channel === "sms" || channel === "all") && inv.patientPhone) {
    try {
      const ok = await sendNotification({
        to: inv.patientPhone,
        type: "sms",
        message: smsBody,
      });
      results.sms = { ok };
    } catch (err) {
      results.sms = { ok: false, error: err instanceof Error ? err.message : "send_failed" };
    }
  }

  // WhatsApp — uses sent.dm directly via a Utility-category template
  // when configured. The template is paid-rate but transactional
  // (invoice delivery is explicitly Utility per Meta's classification).
  if ((channel === "whatsapp" || channel === "all") && inv.patientPhone) {
    const template = process.env.SENTDM_TEMPLATE_INVOICE;
    if (template) {
      try {
        const r = await sentDmSend({
          to: inv.patientPhone,
          channel: "whatsapp",
          template,
          variables: {
            "1": inv.patientName,
            "2": inv.number,
            "3": amount,
            "4": link,
            patient_name: inv.patientName,
            patientName: inv.patientName,
            invoice_number: inv.number,
            invoiceNumber: inv.number,
            amount,
            link,
            url: link,
          },
        });
        results.whatsapp = { ok: r.ok, error: r.error };
      } catch (err) {
        results.whatsapp = { ok: false, error: err instanceof Error ? err.message : "send_failed" };
      }
    } else {
      // No invoice template configured — fall back silently. The email
      // + SMS paths still go through.
      results.whatsapp = { ok: false, error: "SENTDM_TEMPLATE_INVOICE not configured" };
    }
  }

  log.info("invoice.sent", { invoiceId: inv.id, channel, results });
  return NextResponse.json({ ok: true, link, results });
}

function currencySymbol(code: string): string {
  const map: Record<string, string> = {
    INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "د.إ",
    SAR: "ر.س", SGD: "S$", AUD: "A$", CAD: "C$", JPY: "¥",
  };
  return map[code] || `${code} `;
}
