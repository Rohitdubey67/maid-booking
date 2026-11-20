import { TimeSlot } from "../../domain/shared/TimeSlot.js";
import type { InstantBookingRequest } from "./BookingRequest.js";
import type { BookingType } from "./BookingType.js";

/** A single visit starting right now. */
export class InstantBooking implements BookingType<InstantBookingRequest> {
  readonly type = "INSTANT";

  planSlots(request: InstantBookingRequest, now: Date): TimeSlot[] {
    return [TimeSlot.ofDuration(now, request.durationMinutes)];
  }
}
