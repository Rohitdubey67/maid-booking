import { describe, expect, it } from "vitest";
import type { RecurringBookingRequest } from "../../src/application/booking/BookingRequest.js";
import { InstantBooking } from "../../src/application/booking/InstantBooking.js";
import { RecurringBooking } from "../../src/application/booking/RecurringBooking.js";
import { ScheduledBooking } from "../../src/application/booking/ScheduledBooking.js";
import type { TimeSlot } from "../../src/domain/shared/TimeSlot.js";
import { expectAppError } from "../support/expectAppError.js";
import { ist } from "../support/testContext.js";

/** Monday 7 December 2026, 10:00 IST. */
const NOW = ist("2026-12-07T10:00");

const base = { customerId: "customer-1", maidId: "maid-1", serviceType: "cleaning", durationMinutes: 60 };
const starts = (slots: TimeSlot[]) => slots.map((slot) => slot.start);

describe("Instant booking", () => {
  it("plans one visit starting now", () => {
    expect(starts(new InstantBooking().planSlots({ ...base, type: "INSTANT" }, NOW))).toEqual([NOW]);
  });
});

describe("Scheduled booking", () => {
  const scheduled = new ScheduledBooking();

  it("plans one visit at the chosen future time", () => {
    const startAt = ist("2026-12-08T10:00");

    expect(starts(scheduled.planSlots({ ...base, type: "SCHEDULED", startAt }, NOW))).toEqual([startAt]);
  });

  it("refuses a time in the past", () => {
    expectAppError("INVALID_BOOKING_REQUEST", () =>
      scheduled.planSlots({ ...base, type: "SCHEDULED", startAt: ist("2026-12-07T09:00") }, NOW),
    );
  });
});

describe("Recurring booking", () => {
  const recurring = new RecurringBooking();
  const plan = (overrides: Partial<RecurringBookingRequest>) =>
    starts(
      recurring.planSlots(
        { ...base, type: "RECURRING", daysOfWeek: [1], startTime: "11:00", endDate: "2026-12-18", ...overrides },
        NOW,
      ),
    );

  it("books every weekday at the same time", () => {
    expect(plan({ daysOfWeek: [1, 2, 3, 4, 5] })).toHaveLength(10);
  });

  it("books every Sunday", () => {
    expect(plan({ daysOfWeek: [0], endDate: "2026-12-27" })).toEqual([
      ist("2026-12-13T11:00"),
      ist("2026-12-20T11:00"),
      ist("2026-12-27T11:00"),
    ]);
  });

  it("skips today's visit when its time has already passed", () => {
    expect(plan({ startTime: "09:00" })).toEqual([ist("2026-12-14T09:00")]);
  });

  it.each<[string, Partial<RecurringBookingRequest>]>([
    ["no days", { daysOfWeek: [] }],
    ["a day number above 6", { daysOfWeek: [7] }],
    ["more than 12 weeks", { endDate: "2027-03-01" }],
    ["an end date before the start", { startDate: "2026-12-10", endDate: "2026-12-09" }],
    ["no matching days in the range", { daysOfWeek: [0], endDate: "2026-12-12" }],
  ])("refuses %s", (_case, overrides) => {
    expectAppError("INVALID_BOOKING_REQUEST", () => plan(overrides));
  });
});
