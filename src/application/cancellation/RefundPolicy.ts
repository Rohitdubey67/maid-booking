import type { Money } from "../../domain/shared/Money.js";
import type { TimeSlot } from "../../domain/shared/TimeSlot.js";

export interface RefundPolicy {
  /** How much of the paid amount goes back to the customer. */
  refundFor(amountPaid: Money, slot: TimeSlot, cancelledAt: Date): Money;
}
