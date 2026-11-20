import type { RecurringBookingRequest, ScheduledBookingRequest } from "../../src/application/booking/BookingRequest.js";
import type { OnboardMaidCommand } from "../../src/application/services/MaidService.js";
import { createServices } from "../../src/setup.js";
import { FakePaymentGateway, FixedClock, SequentialIdGenerator } from "./fakes.js";

export const ist = (dateTime: string) => new Date(`${dateTime}:00+05:30`);

/** Monday 7 December 2026, 08:00 IST. Tests start here unless they say otherwise. */
export const MONDAY_8AM = ist("2026-12-07T08:00");

export const MONDAY_TO_SATURDAY = [1, 2, 3, 4, 5, 6];

/** Cleaning at ₹200/hour and cooking at ₹300/hour, Monday to Saturday 09:00 to 18:00. */
export function maidCommand(overrides: Partial<OnboardMaidCommand> = {}): OnboardMaidCommand {
  return {
    name: "Asha Kumari",
    gender: "FEMALE",
    locality: "Koramangala",
    services: [
      { serviceType: "cleaning", hourlyRatePaise: 20_000 },
      { serviceType: "cooking", hourlyRatePaise: 30_000 },
    ],
    skills: ["deep cleaning"],
    rating: 4.5,
    availability: MONDAY_TO_SATURDAY.map((dayOfWeek) => ({ dayOfWeek, startTime: "09:00", endTime: "18:00" })),
    ...overrides,
  };
}

export function scheduledRequest(
  maidId: string,
  startAt: Date,
  overrides: Partial<ScheduledBookingRequest> = {},
): ScheduledBookingRequest {
  return {
    type: "SCHEDULED",
    customerId: "customer-1",
    maidId,
    serviceType: "cleaning",
    durationMinutes: 60,
    startAt,
    ...overrides,
  };
}

/** Monday, Wednesday and Friday at 09:00 for two weeks: 7, 9, 11, 14, 16 and 18 December. */
export function recurringRequest(
  maidId: string,
  overrides: Partial<RecurringBookingRequest> = {},
): RecurringBookingRequest {
  return {
    type: "RECURRING",
    customerId: "customer-1",
    maidId,
    serviceType: "cleaning",
    durationMinutes: 60,
    daysOfWeek: [1, 3, 5],
    startTime: "09:00",
    startDate: "2026-12-07",
    endDate: "2026-12-20",
    ...overrides,
  };
}

export function createTestContext(start: Date = MONDAY_8AM) {
  const clock = new FixedClock(start);
  const gateway = new FakePaymentGateway();
  const services = createServices({ clock, gateway, ids: new SequentialIdGenerator() });

  return { ...services, clock, gateway };
}

export type TestContext = ReturnType<typeof createTestContext>;
