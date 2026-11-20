import { MS_PER_MINUTE } from "../shared/IstCalendar.js";
import type { TimeSlot } from "../shared/TimeSlot.js";

export const PAYMENT_HOLD_MINUTES = 15;
export const ADVANCE_PAYMENT_MINUTES = 24 * 60;

/**
 * The first visit must be paid within the hold window, which secures the booking.
 * Later recurring visits are paid 24 hours ahead, but never sooner than the hold window.
 */
export function paymentDeadlineFor(slot: TimeSlot, visitIndex: number, bookedAt: Date): Date {
  const holdEndsMs = bookedAt.getTime() + PAYMENT_HOLD_MINUTES * MS_PER_MINUTE;

  if (visitIndex === 0) {
    return new Date(holdEndsMs);
  }
  const advanceDueMs = slot.start.getTime() - ADVANCE_PAYMENT_MINUTES * MS_PER_MINUTE;
  return new Date(Math.max(holdEndsMs, advanceDueMs));
}
