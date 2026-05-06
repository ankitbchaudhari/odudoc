import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/induspays";
import {
  getConsultation,
  markPaid as markConsultationPaid,
  markPaymentFailed as markConsultationPaymentFailed,
} from "@/lib/consultations-store";
import {
  upgradeSubscription,
  extendSubscription,
  cancelSubscription,
  getSubscription,
} from "@/lib/doctor-subscriptions";
import { sendPatientBookingReceived } from "@/lib/consultation-emails";
import { addAdminNotification } from "@/lib/admin-notifications-store";
import { recordConsultationEarning } from "@/lib/doctor-earnings-store";

import { log } from "@/lib/log";
export const runtime = "nodejs";

/**
 * POST /api/payments/induspays/webhook
 *
 * Receives payment status updates from IndusPays. Configure this URL in the
 * IndusPays merchant dashboard:
 *   https://www.odudoc.com/api/payments/induspays/webhook
 *
 * Expected events:
 *   - payment.success / payment.captured
 *   - payment.failed  / payment.declined
 *   - subscription.renewed
 *   - subscription.cancelled
 *
 * Expected metadata shape (set when creating the IndusPays order):
 *   type:            "consultation" | "clinic_subscription" | "doctor_subscription"
 *   orderId:         consultation id (for consultation payments)
 *   doctorId:        doctor id (for subscription payments)
 *   doctorPayout:    optional — 70% split, informational
 *   commission:      optional — 30% split, informational
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-induspays-signature") || "";

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType: string = event.type || event.event || "unknown";
    const data = event.data || event;
    const metadata = data.metadata || {};
    const paymentId: string =
      data.id || data.paymentId || data.transactionId || "";

    switch (eventType) {
      case "payment.success":
      case "payment.captured": {
        const paymentType: string | undefined = metadata.type;

        if (paymentType === "consultation") {
          const orderId: string = metadata.orderId || "";
          const consultation = orderId
            ? markConsultationPaid(orderId, paymentId)
            : null;

          if (!consultation) {
            log.warn("[induspays] consultation not found for paid webhook", { orderId });
            break;
          }

          // Record the 70/30 split in the doctor's earnings ledger. If the
          // gateway sent explicit amounts in metadata we use them, otherwise
          // we fall back to the platform default. Idempotent — double-firing
          // webhooks won't double-count.
          recordConsultationEarning({
            consultation,
            doctorPayoutFromGateway:
              typeof metadata.doctorPayout === "number"
                ? metadata.doctorPayout
                : undefined,
            commissionFromGateway:
              typeof metadata.commission === "number"
                ? metadata.commission
                : undefined,
          });

          // Patient confirmation — fire and forget so a flaky SMTP doesn't
          // turn the webhook into a 500 and trigger a retry storm.
          void sendPatientBookingReceived(consultation).catch((err) =>
            log.error("booking email failed", err)
          );

          addAdminNotification({
            type: "payment_received",
            title: "Consultation paid",
            body: `${consultation.patientName} paid ${consultation.currency} ${consultation.fee} for ${consultation.doctorName}`,
            link: `/admin/consultations/${consultation.id}`,
          });
        } else if (
          paymentType === "clinic_subscription" ||
          paymentType === "doctor_subscription"
        ) {
          // Both paths upgrade/activate the doctor's subscription to premium
          // for 30 days. Clinics currently ride on the same subscription
          // primitive — if/when we split them out this switch grows a case.
          const doctorId: string = metadata.doctorId || metadata.clinicId || "";
          if (!doctorId) {
            log.warn("[induspays] subscription paid but no doctorId");
            break;
          }
          const sub =
            getSubscription(doctorId) === null
              ? null
              : upgradeSubscription(doctorId);

          if (!sub) {
            log.warn("[induspays] no subscription found to upgrade for doctor", { doctorId });
            break;
          }

          addAdminNotification({
            type: "subscription_activated",
            title: "Subscription activated",
            body: `Doctor ${doctorId} upgraded to premium — expires ${new Date(sub.expiresAt).toLocaleDateString()}`,
            link: `/admin/doctors`,
          });
        } else {
          log.info("[induspays] payment success with unknown type", { paymentType });
        }
        break;
      }

      case "payment.failed":
      case "payment.declined": {
        const paymentType: string | undefined = metadata.type;
        const orderId: string = metadata.orderId || "";

        if (paymentType === "consultation" && orderId) {
          const consultation = markConsultationPaymentFailed(orderId);
          if (consultation) {
            addAdminNotification({
              type: "payment_failed",
              title: "Consultation payment failed",
              body: `${consultation.patientName} — ${consultation.doctorName} (${consultation.currency} ${consultation.fee})`,
              link: `/admin/consultations/${consultation.id}`,
            });
          }
        } else {
          addAdminNotification({
            type: "payment_failed",
            title: "Payment failed",
            body: `IndusPays reported ${eventType} for order ${orderId || "(unknown)"}`,
            link: `/admin`,
          });
        }
        break;
      }

      case "subscription.renewed": {
        const doctorId: string = metadata.doctorId || metadata.clinicId || "";
        if (!doctorId) {
          log.warn("[induspays] subscription.renewed missing doctorId");
          break;
        }
        const sub = extendSubscription(doctorId, 30);
        if (sub) {
          addAdminNotification({
            type: "subscription_activated",
            title: "Subscription renewed",
            body: `Doctor ${doctorId} renewed — now expires ${new Date(sub.expiresAt).toLocaleDateString()}`,
            link: `/admin/doctors`,
          });
        }
        break;
      }

      case "subscription.cancelled": {
        const doctorId: string = metadata.doctorId || metadata.clinicId || "";
        if (!doctorId) break;
        const sub = cancelSubscription(doctorId);
        if (sub) {
          addAdminNotification({
            type: "subscription_cancelled",
            title: "Subscription cancelled",
            body: `Doctor ${doctorId} cancelled their subscription`,
            link: `/admin/doctors`,
          });
        }
        break;
      }

      default:
        log.info("[induspays] unhandled event", { eventType });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    log.error("IndusPays webhook error", error as Error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
