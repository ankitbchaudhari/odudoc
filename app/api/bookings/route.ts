import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createBooking, getBookings } from '@/lib/bookings-store';
import { notifyAppointmentBooked } from '@/lib/notifications';
import { parseJson } from '@/lib/api-validate';
import { log } from "@/lib/log";

const BookingSchema = z.object({
  doctorId: z.string().trim().min(1).max(64),
  doctorName: z.string().trim().min(1).max(120),
  patientName: z.string().trim().min(1).max(120),
  patientEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(200)
    .refine((e) => !e.endsWith('@placeholder.com'), {
      message: 'Placeholder emails are not allowed',
    }),
  patientPhone: z.string().trim().min(3).max(32),
  timeSlot: z.string().trim().min(1).max(64),
  fee: z.number().positive().max(100000),
  paymentStatus: z.enum(['paid', 'pending', 'failed', 'refunded']).optional(),
  paymentIntentId: z.string().trim().max(128).optional(),
  appointmentType: z.enum(['in-person', 'video']).optional(),
  date: z.string().trim().max(64).optional(),
  doctorEmail: z.string().trim().email().max(200).optional(),
  doctorPhone: z.string().trim().max(32).optional(),
});

export async function GET() {
  try {
    const bookings = getBookings();
    return NextResponse.json({ bookings });
  } catch (error: unknown) {
    log.error('Failed to fetch bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const parsed = await parseJson(request, BookingSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const booking = createBooking({
      doctorId: body.doctorId,
      doctorName: body.doctorName,
      patientName: body.patientName,
      patientPhone: body.patientPhone,
      timeSlot: body.timeSlot,
      fee: body.fee,
      paymentStatus: body.paymentStatus || 'paid',
      paymentIntentId: body.paymentIntentId || '',
    });

    const doctorEmail =
      body.doctorEmail ||
      `${body.doctorName.toLowerCase().replace(/\s+/g, '.')}@odudoc.com`;
    const appointmentType = body.appointmentType || 'in-person';
    const appointmentDate = body.date || new Date().toLocaleDateString();

    notifyAppointmentBooked({
      patientName: body.patientName,
      patientEmail: body.patientEmail,
      patientPhone: body.patientPhone,
      doctorName: body.doctorName,
      doctorEmail,
      doctorPhone: body.doctorPhone,
      date: appointmentDate,
      time: body.timeSlot,
      type: appointmentType,
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error: unknown) {
    log.error('Failed to create booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
