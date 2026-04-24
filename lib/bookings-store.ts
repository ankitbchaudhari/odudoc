import { bindPersistentArray } from "./persistent-array";

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

const bookings: Booking[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<Booking>(
  "bookings",
  bookings,
  () => []
);
await hydrate();

// One-time cleanup: drop the original demo bookings (BK-1001/1002/1003)
// that shipped with the initial seed so production doesn't carry fake
// patients forever. Tombstoning them first stops the anti-clobber merge
// in flush() from resurrecting the same IDs from Postgres.
(function removeLegacySeedBookings() {
  const legacyIds = ["BK-1001", "BK-1002", "BK-1003"];
  const set = new Set(legacyIds);
  let dirty = false;
  for (let i = bookings.length - 1; i >= 0; i--) {
    if (set.has(bookings[i].id)) {
      bookings.splice(i, 1);
      dirty = true;
    }
  }
  for (const id of legacyIds) tombstone(id);
  if (dirty) flush();
})();

// Derive counter from hydrated state so IDs don't collide.
let nextId = bookings.reduce((max, b) => {
  const m = /^BK-(\d+)$/.exec(b.id);
  const n = m ? parseInt(m[1], 10) : 0;
  return n > max ? n : max;
}, 1003) + 1;

export function createBooking(
  data: Omit<Booking, 'id' | 'createdAt'>
): Booking {
  const booking: Booking = {
    ...data,
    id: `BK-${nextId++}`,
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  flush();
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
    flush();
  }
  return booking;
}
