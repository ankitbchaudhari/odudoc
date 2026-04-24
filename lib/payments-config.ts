// Kill switch for consultation payments.
//
// When the window is active, the booking flow skips the payment step,
// displays consultations as free, and the API forces fee = 0 /
// paymentStatus = "paid" regardless of what the client sent.
//
// Edit PAYMENTS_DISABLED_UNTIL to extend or remove the window. Leave as a
// past ISO date (or empty string) to re-enable paid consultations.

export const PAYMENTS_DISABLED_UNTIL = "2026-04-24T23:59:59Z";

export function paymentsDisabled(now: Date = new Date()): boolean {
  if (!PAYMENTS_DISABLED_UNTIL) return false;
  const until = new Date(PAYMENTS_DISABLED_UNTIL).getTime();
  if (Number.isNaN(until)) return false;
  return now.getTime() <= until;
}
