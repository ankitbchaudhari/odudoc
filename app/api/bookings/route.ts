import { NextRequest, NextResponse } from 'next/server';
import {
  createBooking,
  getBookings,
  type Booking,
} from '@/lib/bookings-store';

export async function GET() {
  try {
    const bookings = getBookings();
    return NextResponse.json({ bookings });
  } catch (error: unknown) {
    console.error('Failed to fetch bookings:', error);
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

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
