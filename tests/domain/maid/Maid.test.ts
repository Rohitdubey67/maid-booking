import { describe, expect, it } from "vitest";
import { Maid } from "../../../src/domain/maid/Maid.js";
import type { MaidProps } from "../../../src/domain/maid/Maid.js";
import { WeeklyAvailability } from "../../../src/domain/maid/WeeklyAvailability.js";
import { WeeklyWindow } from "../../../src/domain/maid/WeeklyWindow.js";
import { Money } from "../../../src/domain/shared/Money.js";
import { TimeSlot } from "../../../src/domain/shared/TimeSlot.js";
import { expectAppError } from "../../support/expectAppError.js";
import { ist } from "../../support/testContext.js";

const MONDAY = 1;
const hours = (startHour: number, endHour: number, dayOfWeek = MONDAY) =>
  WeeklyWindow.of({ dayOfWeek, startMinute: startHour * 60, endMinute: endHour * 60 });

const validProps = (overrides: Partial<MaidProps> = {}): MaidProps => ({
  id: "maid-1",
  name: "Asha Kumari",
  gender: "FEMALE",
  locality: "Koramangala",
  services: [{ serviceType: "Cleaning", hourlyRate: Money.ofPaise(20_000) }],
  availability: WeeklyAvailability.of([hours(9, 18)]),
  skills: ["Deep Cleaning"],
  rating: 4.5,
  ...overrides,
});

// 7 December 2026 is a Monday.
const mondaySlot = (start: string, end: string) => TimeSlot.of(ist(`2026-12-07T${start}`), ist(`2026-12-07T${end}`));

describe("Adding a maid", () => {
  it("keeps the profile details", () => {
    const maid = Maid.create(validProps());

    expect(maid.name).toBe("Asha Kumari");
    expect(maid.locality).toBe("koramangala");
    expect(maid.offers("cleaning")).toBe(true);
    expect(maid.hourlyRateFor("cleaning").paise).toBe(20_000);
    expect(maid.hasSkill("deep cleaning")).toBe(true);
    expect(maid.rating).toBe(4.5);
  });

  it.each([
    ["a blank name", { name: " " }],
    ["no services", { services: [] }],
    ["a free service", { services: [{ serviceType: "cooking", hourlyRate: Money.ZERO }] }],
    [
      "the same service twice",
      {
        services: [
          { serviceType: "Cooking", hourlyRate: Money.ofPaise(100) },
          { serviceType: "cooking", hourlyRate: Money.ofPaise(100) },
        ],
      },
    ],
    ["a rating above 5", { rating: 5.1 }],
  ])("rejects %s", (_case, overrides: Partial<MaidProps>) => {
    expectAppError("INVALID_MAID", () => Maid.create(validProps(overrides)));
  });

  it("rejects impossible working hours", () => {
    expectAppError("INVALID_AVAILABILITY", () => WeeklyAvailability.of([]));
    expectAppError("INVALID_AVAILABILITY", () => hours(18, 9));
    expectAppError("INVALID_AVAILABILITY", () => hours(9, 18, 7));
  });
});

describe("Working hours", () => {
  const maid = Maid.create(validProps());

  it("allows a visit inside working hours, including the edges", () => {
    expect(maid.worksDuring(mondaySlot("09:00", "10:00"))).toBe(true);
    expect(maid.worksDuring(mondaySlot("17:00", "18:00"))).toBe(true);
  });

  it("refuses a visit running past the end of the day", () => {
    expect(maid.worksDuring(mondaySlot("17:30", "18:30"))).toBe(false);
  });

  it("refuses a visit on a day off", () => {
    const tuesday = TimeSlot.of(ist("2026-12-08T10:00"), ist("2026-12-08T11:00"));

    expect(maid.worksDuring(tuesday)).toBe(false);
  });

  it("uses the day in IST, even when the UTC day is different", () => {
    const nightOwl = Maid.create(validProps({ availability: WeeklyAvailability.of([hours(1, 3)]) }));

    // 01:30 IST on Monday is still Sunday in UTC.
    expect(nightOwl.worksDuring(mondaySlot("01:30", "02:30"))).toBe(true);
  });

  it("joins touching hours, but not hours with a break between them", () => {
    const touching = Maid.create(validProps({ availability: WeeklyAvailability.of([hours(9, 12), hours(12, 17)]) }));
    const withBreak = Maid.create(validProps({ availability: WeeklyAvailability.of([hours(9, 12), hours(14, 17)]) }));

    expect(touching.worksDuring(mondaySlot("11:00", "13:00"))).toBe(true);
    expect(withBreak.worksDuring(mondaySlot("11:00", "15:00"))).toBe(false);
  });
});
