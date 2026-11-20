import { AppError } from "../../domain/shared/AppError.js";
import { TimeSlot } from "../../domain/shared/TimeSlot.js";
import type { ScheduledBookingRequest } from "./BookingRequest.js";
import type { BookingType } from "./BookingType.js";

/** A single visit at a chosen future time. */
export class ScheduledBooking implements BookingType<ScheduledBookingRequest> {
  readonly type = "SCHEDULED";

  planSlots(request: ScheduledBookingRequest, now: Date): TimeSlot[] {
    if (request.startAt <= now) {
      throw new AppError("INVALID_BOOKING_REQUEST", "Scheduled start must be in the future");
    }
    return [TimeSlot.ofDuration(request.startAt, request.durationMinutes)];
  }
}
