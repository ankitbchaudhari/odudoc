export interface Booking {
  id: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  patientPhone: string;
  timeSlot: string;
  fee: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentIntentId: string;
  createdAt: string;
}

const bookings: Booking[] = [
  {
    id: 'BK-1001',
    doctorId: 'dr-sarah-johnson',
    doctorName: 'Dr. Sarah Johnson',
    patientName: 'John Doe',
    patientPhone: '+1-555-0101',
    timeSlot: '9:00 AM',
    fee: 40,
    paymentStatus: 'paid',
    paymentIntentId: 'pi_sample_001',
    createdAt: '2026-04-10T08:30:00Z',
  },
  {
    id: 'BK-1002',
    doctorId: 'dr-michael-chen',
    doctorName: 'Dr. Michael Chen',
    patientName: 'Jane Smith',
    patientPhone: '+1-555-0102',
    timeSlot: '10:30 AM',
    fee: 50,
    paymentStatus: 'paid',
    paymentIntentId: 'pi_sample_002',
    createdAt: '2026-04-11T10:15:00Z',
  },
  {
    id: 'BK-1003',
    doctorId: 'dr-david-brown',
    doctorName: 'Dr. David Brown',
    patientName: 'Robert Wilson',
    patientPhone: '+1-555-0103',
    timeSlot: '2:00 PM',
    fee: 75,
    paymentStatus: 'pending',
    paymentIntentId: 'pi_sample_003',
    createdAt: '2026-04-12T14:00:00Z',
  },
];

let nextId = 1004;

export function createBooking(
  data: Omit<Booking, 'id' | 'createdAt'>
): Booking {
  const booking: Booking = {
    ...data,
    id: `BK-${nextId++}`,
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  return booking;
}

export function getBookings(): Booking[] {
  return [...bookings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getBookingById(id: string): Booking | undefined {
  return bookings.find((b) => b.id === id);
}

export function updateBookingStatus(
  paymentIntentId: string,
  status: Booking['paymentStatus']
): Booking | undefined {
  const booking = bookings.find((b) => b.paymentIntentId === paymentIntentId);
  if (booking) {
    booking.paymentStatus = status;
  }
  return booking;
}
