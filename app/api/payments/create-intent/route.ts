import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe';
import { parseJson } from '@/lib/api-validate';
import { log } from "@/lib/log";

const CreateIntentSchema = z.object({
  doctorId: z.string().min(1).max(64),
  doctorName: z.string().min(1).max(120),
  fee: z.number().positive().max(100000),
  patientName: z.string().min(1).max(120),
  patientPhone: z.string().min(3).max(32),
  timeSlot: z.string().min(1).max(64),
});

export async function POST(request: NextRequest) {
  const parsed = await parseJson(request, CreateIntentSchema);
  if (!parsed.ok) return parsed.response;
  const { doctorId, doctorName, fee, patientName, patientPhone, timeSlot } = parsed.data;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(fee * 100),
      currency: 'usd',
      metadata: { doctorId, doctorName, patientName, patientPhone, timeSlot },
      automatic_payment_methods: { enabled: true },
    });
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: unknown) {
    log.error('Payment intent creation failed:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create payment intent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
