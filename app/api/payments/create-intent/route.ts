import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

import { log } from "@/lib/log";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doctorId, doctorName, fee, patientName, patientPhone, timeSlot } = body;

    if (!doctorId || !doctorName || !fee || !patientName || !patientPhone || !timeSlot) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (typeof fee !== 'number' || fee <= 0) {
      return NextResponse.json(
        { error: 'Invalid fee amount' },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(fee * 100),
      currency: 'usd',
      metadata: {
        doctorId,
        doctorName,
        patientName,
        patientPhone,
        timeSlot,
      },
      automatic_payment_methods: {
        enabled: true,
      },
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
