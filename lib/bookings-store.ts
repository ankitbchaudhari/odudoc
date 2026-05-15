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

  // --- Additive mobile fields ---
  // Older records (pre-Apr-2026, pre-mobile) may be missing these. Readers
  // MUST treat them as optional. Introduced so the mobile "My consultations"
  // screen can scope to the current user and filter upcoming vs past.
  patientUserId?: string;      // users-store id; set for mobile bookings
  patientEmail?: string;        // lowercased
  date?: string;                // YYYY-MM-DD
  appointmentType?: 'video' | 'in-person';
  /** Scheduling lifecycle, distinct from paymentStatus. Default: 'scheduled'. */
  status?: 'scheduled' | 'cancelled' | 'completed';
  cancelledAt?: string;         // ISO-8601
  cancelledBy?: 'patient' | 'doctor' | 'system';

  /** Set by the appointment-reminders cron after a 24h-out push lands.
   *  Idempotency marker — same job re-running won't double-push. */
  reminderSentAt?: string;     // ISO-8601

  // --- Clinic visit fields (May 2026) ---
  // For in-person clinic appointments. When clinicId is set, the booking
  // is a physical visit and routes to that clinic's reception. Telemed
  // bookings leave these null.
  clinicId?: string;            // CL-XXXX
  clinicName?: string;          // denormalized for confirmation/notifications
  clinicAddress?: string;       // single-line formatted, denormalized
  /** Payment mode chosen by patient. 'online' = paid via Stripe/Cashfree
   *  at booking; 'clinic' = pay-at-clinic (cash/UPI at reception).
   *  Telemed bookings default to 'online'. */
  paymentMode?: "online" | "clinic";
  arrivedAt?: string;           // ISO; set by reception when patient checks in
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

/**
 * Mark a booking as having had its 24h reminder dispatched. Returns true
 * if the marker was actually set (false if the booking was missing or a
 * marker was already in place — the cron uses this to count "first
 * times" vs "already sent").
 */
export function markBookingReminderSent(id: string, when: string = new Date().toISOString()): boolean {
  const b = bookings.find((x) => x.id === id);
  if (!b) return false;
  if (b.reminderSentAt) return false;
  b.reminderSentAt = when;
  flush();
  return true;
}

/**
 * Bookings whose slot starts inside [windowStartMs, windowEndMs] AND
 * haven't been reminded yet. Cancelled / unpaid bookings are skipped.
 */
export function getBookingsDueForReminder(
  windowStartMs: number,
  windowEndMs: number
): Booking[] {
  return bookings.filter((b) => {
    if (b.status === 'cancelled') return false;
    if (b.paymentStatus !== 'paid') return false;
    if (b.reminderSentAt) return false;
    if (!b.date || !/^\d{2}:\d{2}$/.test(b.timeSlot)) return false;
    const at = new Date(`${b.date}T${b.timeSlot}:00`).getTime();
    if (Number.isNaN(at)) return false;
    return at >= windowStartMs && at <= windowEndMs;
  });
}

/**
 * Patch payment fields on a booking by its id. Used by the mobile flow to
 * attach a Stripe PaymentIntent the moment it's created (before the user
 * has paid) so the subsequent verify call can locate the booking and
 * double-check that the intent belongs to it.
 */
export function setBookingPayment(
  id: string,
  patch: {
    paymentIntentId?: string;
    paymentStatus?: Booking['paymentStatus'];
  }
): Booking | undefined {
  const b = bookings.find((x) => x.id === id);
  if (!b) return undefined;
  if (patch.paymentIntentId !== undefined) b.paymentIntentId = patch.paymentIntentId;
  if (patch.paymentStatus !== undefined) b.paymentStatus = patch.paymentStatus;
  flush();
  return b;
}

// ----- Mobile helpers -----------------------------------------------------

/**
 * Return every booking linked to a user id (set at creation time by the
 * mobile endpoint). Falls back to email match so accounts created before
 * the patientUserId field existed still show up, as long as the booking
 * recorded an email.
 */
export function getBookingsForUser(
  userId: string,
  email?: string
): Booking[] {
  const lowerEmail = email?.toLowerCase();
  return getBookings().filter((b) => {
    if (b.patientUserId === userId) return true;
    if (lowerEmail && b.patientEmail?.toLowerCase() === lowerEmail) return true;
    return false;
  });
}

/** Doctor-side view: every booking pinned to a given doctor id. Used by
 *  the doctor mobile app's Today + Queue screens. */
export function getBookingsForDoctor(doctorId: string): Booking[] {
  return getBookings().filter((b) => b.doctorId === doctorId);
}

export type CancelResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: 'not_found' | 'not_owner' | 'already_cancelled' | 'too_late' };

/**
 * Patient-initiated cancel. Refuses if the booking isn't owned by the
 * caller, if it was already cancelled, or if the slot starts within
 * BOOKING_LEAD_MIN (spec: can't cancel in the last 30 min before).
 */
export function cancelBookingByUser(
  bookingId: string,
  userId: string,
  opts: { leadMinutes: number }
): CancelResult {
  const b = bookings.find((x) => x.id === bookingId);
  if (!b) return { ok: false, reason: 'not_found' };
  if (b.patientUserId !== userId) return { ok: false, reason: 'not_owner' };
  if (b.status === 'cancelled') return { ok: false, reason: 'already_cancelled' };

  if (b.date && /^\d{2}:\d{2}$/.test(b.timeSlot)) {
    const [h, m] = b.timeSlot.split(':').map(Number);
    const start = new Date(`${b.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    const minutesUntil = (start.getTime() - Date.now()) / 60000;
    if (minutesUntil < opts.leadMinutes) {
      return { ok: false, reason: 'too_late' };
    }
  }

  b.status = 'cancelled';
  b.cancelledAt = new Date().toISOString();
  b.cancelledBy = 'patient';
  flush();
  return { ok: true, booking: b };
}

/** Reception "Mark arrived" action — idempotent. */
export function markBookingArrived(id: string): Booking | undefined {
  const b = bookings.find((x) => x.id === id);
  if (!b) return undefined;
  if (!b.arrivedAt) {
    b.arrivedAt = new Date().toISOString();
    flush();
  }
  return b;
}

/** Patient-claim utility — once a patient signs up, find all unclaimed
 *  bookings (phone match, no patientUserId yet) and stamp the user id.
 *  Returns the count of bookings claimed. */
export function claimBookingsForUser(userId: string, phone: string): number {
  const normalize = (p: string) => (p || "").replace(/[^\d]/g, "").replace(/^0+/, "");
  const target = normalize(phone);
  if (!target) return 0;
  let n = 0;
  for (const b of bookings) {
    if (!b.patientUserId && normalize(b.patientPhone) === target) {
      b.patientUserId = userId;
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}
