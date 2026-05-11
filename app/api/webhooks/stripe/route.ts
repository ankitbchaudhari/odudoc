import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { updateBookingStatus } from '@/lib/bookings-store';
import { upsertSubscription, getSubscriptionByStripeId, getSubscriptionByCustomerId, type PlanTier, type SubStatus } from '@/lib/hospital/subscription-store';
import { applyTopUp } from '@/lib/wallet/store';
import { log } from '@/lib/log';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function planFromPrice(priceId?: string | null): PlanTier {
  if (!priceId) return "starter";
  const map = (process.env.STRIPE_PRICE_MAP || "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const entry of map) {
    const [price, tier] = entry.split(":");
    if (price === priceId) return (tier as PlanTier) || "starter";
  }
  return "starter";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }
    let event: Stripe.Event;
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
        log.error('stripe.webhook.signature_failed', err, { message });
        return NextResponse.json({ error: message }, { status: 400 });
      }
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        updateBookingStatus(pi.id, 'paid');
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        updateBookingStatus(pi.id, 'failed');
        break;
      }
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;

        // Wallet top-up branch — minted by /api/wallet/topup-create
        // for non-India patients (India uses Cashfree). Credits the
        // wallet via the same applyTopUp() the Cashfree webhook
        // calls so both gateways stay symmetric.
        if (s.metadata?.type === 'wallet_topup') {
          const userId = s.metadata.userId;
          const amount = Number(s.metadata.amount || '0');
          const orderId = s.metadata.orderId || s.id;
          if (userId && Number.isFinite(amount) && amount > 0) {
            const r = applyTopUp({
              userId,
              amountRupees: amount,
              note: `Stripe wallet top-up · session ${s.id}`,
            });
            if (r.ok) {
              log.info('stripe.webhook.wallet_topup_credited', { orderId, userId, amount });
            } else {
              log.warn('stripe.webhook.wallet_topup_rejected', { orderId, error: r.error });
            }
          } else {
            log.warn('stripe.webhook.wallet_topup_missing_meta', {
              sessionId: s.id,
              hasUserId: Boolean(userId),
              amount,
            });
          }
          break;
        }

        const orgId = s.metadata?.organizationId;
        if (orgId && s.subscription) {
          const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription.id;
          const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id;
          upsertSubscription(orgId, {
            stripeCustomerId: customerId || undefined,
            stripeSubscriptionId: subId,
            status: 'active',
          });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const existing = getSubscriptionByStripeId(sub.id) || getSubscriptionByCustomerId(customerId);
        const priceId = sub.items.data[0]?.price.id;
        if (existing) {
          upsertSubscription(existing.organizationId, {
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            priceId,
            planTier: planFromPrice(priceId),
            status: sub.status as SubStatus,
            currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : undefined,
            cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : undefined,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : undefined,
            quantity: sub.items.data[0]?.quantity,
          });
        } else {
          log.warn('stripe.webhook.unmatched_sub', { subId: sub.id });
        }
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
        if (customerId) {
          const existing = getSubscriptionByCustomerId(customerId);
          if (existing) {
            upsertSubscription(existing.organizationId, {
              lastInvoiceId: inv.id,
              lastInvoiceAmount: inv.amount_paid,
              lastInvoicePaidAt: new Date().toISOString(),
              status: 'active',
            });
          }
        }
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
        if (customerId) {
          const existing = getSubscriptionByCustomerId(customerId);
          if (existing) {
            upsertSubscription(existing.organizationId, { status: 'past_due' });
          }
        }
        break;
      }
      default:
        // silently ignore
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    log.error('stripe.webhook.processing_error', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
