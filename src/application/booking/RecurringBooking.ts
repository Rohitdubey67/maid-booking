import { AppError } from "../../domain/shared/AppError.js";
import {
  addDays,
  atIstMinute,
  istDateStart,
  istDayOfWeek,
  MINUTES_PER_DAY,
  parseTimeOfDay,
} from "../../domain/shared/IstCalendar.js";
import { TimeSlot } from "../../domain/shared/TimeSlot.js";
import type { RecurringBookingRequest } from "./BookingRequest.js";
import type { BookingType } from "./BookingType.js";

/** 12 weeks, counting both the start and end dates. */
export const MAX_RECURRING_DAYS = 84;

/** The same time on chosen weekdays between two dates. Times already past are skipped. */
export class RecurringBooking implements BookingType<RecurringBookingRequest> {
  readonly type = "RECURRING";

  planSlots(request: RecurringBookingRequest, now: Date): TimeSlot[] {
    const days = parseDaysOfWeek(request.daysOfWeek);
    const startMinute = parseStartTime(request.startTime);
    const today = atIstMinute(now, 0);
    const firstDay = request.startDate === undefined ? today : istDateStart(request.startDate);
    const lastDay = istDateStart(request.endDate);

    assertDateRange(firstDay, lastDay, today);

    const slots: TimeSlot[] = [];
    for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) {
      const start = atIstMinute(day, startMinute);

      if (days.has(istDayOfWeek(day)) && start > now) {
        slots.push(TimeSlot.ofDuration(start, request.durationMinutes));
      }
    }

    if (slots.length === 0) {
      throw invalidRequest("No visits fall between the start and end dates");
    }
    return slots;
  }
}

function invalidRequest(message: string): AppError {
  return new AppError("INVALID_BOOKING_REQUEST", message);
}

function parseDaysOfWeek(days: readonly number[]): ReadonlySet<number> {
  if (days.length === 0 || days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw invalidRequest("Days of week must be a non-empty list of numbers from 0 to 6");
  }
  return new Set(days);
}

function parseStartTime(value: string): number {
  const minute = parseTimeOfDay(value);

  if (minute >= MINUTES_PER_DAY) {
    throw invalidRequest("Start time must be before 24:00");
  }
  return minute;
}

function assertDateRange(firstDay: Date, lastDay: Date, today: Date): void {
  if (firstDay < today) {
    throw invalidRequest("Start date cannot be in the past");
  }
  if (lastDay < firstDay) {
    throw invalidRequest("End date must be on or after the start date");
  }
  if (lastDay >= addDays(firstDay, MAX_RECURRING_DAYS)) {
    throw invalidRequest(`A recurring booking can cover at most ${MAX_RECURRING_DAYS} days`);
  }
}
