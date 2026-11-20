import type { TimeSlot } from "../../domain/shared/TimeSlot.js";
import type { BookingRequestBase } from "./BookingRequest.js";

/**
 * The only part of booking that differs by type. Everything after planning,
 * such as pricing, reserving and payment, is shared by all types.
 */
export interface BookingType<TRequest extends BookingRequestBase = BookingRequestBase> {
  /** Matches the request's `type`, ignoring case. */
  readonly type: string;

  /** Validates the type's own fields and returns the visits it needs, in time order. */
  planSlots(request: TRequest, now: Date): TimeSlot[];
}
