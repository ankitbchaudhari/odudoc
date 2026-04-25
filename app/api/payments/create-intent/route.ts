import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe';
import { parseJson } from '@/lib/api-validate';
import { log } from "@/lib/log";
import { byCode } from '@/lib/currencies';
import { convert } from '@/lib/currency-convert';

export const runtime = "nodejs";

// Stripe expects amounts in the smallest unit of the target currency.
// For 2-decimal currencies that's cents (×100); for zero-decimal
// currencies (JPY, KRW, VND, IDR-as-rupiah, etc.) that's whole units.
// Use the catalogue's `decimals` field so we don't have to hard-code
// Stripe's zero-decimal list.
function toStripeAmount(amount: number, code: string): number {
  const def = byCode(code);
  const decimals = def?.decimals ?? 2;
  return Math.round(amount * Math.pow(10, decimals));
}

const CreateIntentSchema = z.object({
  doctorId: z.string().min(1).max(64),
  doctorName: z.string().min(1).max(120),
  fee: z.number().positive().max(100000),
  patientName: z.string().min(1).max(120),
  patientPhone: z.string().min(3).max(32),
  timeSlot: z.string().min(1).max(64),
  // Optional visitor-chosen currency. When omitted, charge in the site
  // default (USD). When present, we convert the USD-priced fee into
  // the target currency at the live rate before handing it to Stripe.
  currency: z.string().min(3).max(8).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = await parseJson(request, CreateIntentSchema);
  if (!parsed.ok) return parsed.response;
  const { doctorId, doctorName, fee, patientName, patientPhone, timeSlot, currency } = parsed.data;

  // Resolve target currency. Default to USD; downcase for Stripe.
  const targetCode = (currency || 'USD').toUpperCase();
  const targetDef = byCode(targetCode);
  if (!targetDef && targetCode !== 'USD') {
    return NextResponse.json({ error: `Unsupported currency: ${targetCode}` }, { status: 400 });
  }

  // Convert the USD-priced fee at the live FX rate. convert() falls back
  // to identity if the rate feed is unreachable, which means an outage
  // would silently charge USD-as-target — so we guard: if the conversion
  // returns the same value but the target is non-USD, fail closed and
  // ask the client to retry with USD.
  let chargedAmount = fee;
  if (targetCode !== 'USD') {
    const converted = await convert(fee, 'USD', targetCode);
    if (converted === fee) {
      log.warn('payments.create_intent.fx_unavailable', { targetCode });
      return NextResponse.json(
        { error: 'Currency conversion temporarily unavailable. Please retry or pay in USD.' },
        { status: 503 },
      );
    }
    chargedAmount = converted;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: toStripeAmount(chargedAmount, targetCode),
      currency: targetCode.toLowerCase(),
      metadata: {
        doctorId,
        doctorName,
        patientName,
        patientPhone,
        timeSlot,
        sourceCurrency: 'USD',
        sourceFee: String(fee),
        chargedCurrency: targetCode,
        chargedAmount: chargedAmount.toFixed(targetDef?.decimals ?? 2),
      },
      automatic_payment_methods: { enabled: true },
    });
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      currency: targetCode,
      amount: chargedAmount,
    });
  } catch (error: unknown) {
    log.error('payments.create_intent.failed', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 },
    );
  }
}
