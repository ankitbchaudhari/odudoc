import { NextRequest, NextResponse } from 'next/server';
import {
  createBooking,
  getBookings,
  type Booking,
} from '@/lib/bookings-store';
import { notifyAppointmentBooked } from '@/lib/notifications';

import { log } from "@/lib/log";
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
  try {
    const body = await request.json();
    const {
      doctorId,
      doctorName,
      patientName,
      patientPhone,
      timeSlot,
      fee,
      paymentStatus,
      paymentIntentId,
    } = body as Omit<Booking, 'id' | 'createdAt'>;

    if (!doctorId || !doctorName || !patientName || !patientPhone || !timeSlot || !fee) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Require a real patient email so we don't pollute the DB with fake
    // @placeholder.com rows that later break receipts, reminders, etc.
    const rawEmail = typeof body.patientEmail === 'string' ? body.patientEmail.trim().toLowerCase() : '';
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) && !rawEmail.endsWith('@placeholder.com');
    if (!emailOk) {
      return NextResponse.json(
        { error: 'A valid patient email is required to book an appointment.' },
        { status: 400 }
      );
    }
    const patientEmail = rawEmail;

    const booking = createBooking({
      doctorId,
      doctorName,
      patientName,
      patientPhone,
      timeSlot,
      fee,
      paymentStatus: paymentStatus || 'paid',
      paymentIntentId: paymentIntentId || '',
    });

    // Send booking confirmation notifications
    const doctorEmail = body.doctorEmail || `${doctorName.toLowerCase().replace(/\s+/g, '.')}@odudoc.com`;
    const appointmentType = body.appointmentType || 'in-person';
    const appointmentDate = body.date || new Date().toLocaleDateString();

    notifyAppointmentBooked({
      patientName,
      patientEmail,
      patientPhone,
      doctorName,
      doctorEmail,
      doctorPhone: body.doctorPhone,
      date: appointmentDate,
      time: timeSlot,
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
