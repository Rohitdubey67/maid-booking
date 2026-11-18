import { describe, expect, it } from "vitest";
import { DomainError } from "../../../src/domain/shared/DomainError.js";
import { TimeSlot } from "../../../src/domain/shared/TimeSlot.js";

const at = (time: string) => new Date(`2026-12-01T${time}:00+05:30`);
const slot = (start: string, end: string) => TimeSlot.of(at(start), at(end));

const expectInvalidSlot = (action: () => unknown) => {
  expect(action).toThrow(DomainError);
  expect(action).toThrow(expect.objectContaining({ code: "INVALID_TIME_SLOT" }));
};

describe("TimeSlot", () => {
  describe("of", () => {
    it("creates a slot and reports its duration", () => {
      const created = slot("09:00", "10:30");

      expect(created.start).toEqual(at("09:00"));
      expect(created.end).toEqual(at("10:30"));
      expect(created.durationMinutes).toBe(90);
    });

    it("rejects an end before the start", () => {
      expectInvalidSlot(() => slot("10:00", "09:00"));
    });

    it("rejects an empty slot", () => {
      expectInvalidSlot(() => slot("09:00", "09:00"));
    });

    it("rejects invalid dates", () => {
      expectInvalidSlot(() => TimeSlot.of(new Date("invalid"), at("09:00")));
      expectInvalidSlot(() => TimeSlot.of(at("09:00"), new Date("invalid")));
    });

    it("rejects a duration that is not whole minutes", () => {
      expectInvalidSlot(() => TimeSlot.of(at("09:00"), new Date(at("09:00").getTime() + 30_000)));
    });
  });

  describe("ofDuration", () => {
    it("calculates the end from the duration", () => {
      expect(TimeSlot.ofDuration(at("09:00"), 45).equals(slot("09:00", "09:45"))).toBe(true);
    });

    it.each([0, -30, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects %s minutes", (minutes) => {
      expectInvalidSlot(() => TimeSlot.ofDuration(at("09:00"), minutes));
    });
  });

  describe("immutability", () => {
    it("is unaffected by changes to the input date", () => {
      const start = at("09:00");
      const created = TimeSlot.of(start, at("10:00"));

      start.setHours(start.getHours() - 1);

      expect(created.start).toEqual(at("09:00"));
    });

    it("is unaffected by changes to a returned date", () => {
      const created = slot("09:00", "10:00");

      created.start.setHours(0);

      expect(created.start).toEqual(at("09:00"));
    });
  });

  describe("overlaps", () => {
    const booked = slot("10:00", "11:00");

    it.each([
      ["starts inside", "10:30", "11:30"],
      ["ends inside", "09:30", "10:30"],
      ["sits inside", "10:15", "10:45"],
      ["surrounds it", "09:00", "12:00"],
      ["is identical", "10:00", "11:00"],
    ])("is true when the other slot %s", (_case, start, end) => {
      const other = slot(start, end);

      expect(booked.overlaps(other)).toBe(true);
      expect(other.overlaps(booked)).toBe(true);
    });

    it.each([
      ["ends exactly at its start", "09:00", "10:00"],
      ["starts exactly at its end", "11:00", "12:00"],
      ["is well before", "07:00", "08:00"],
      ["is well after", "13:00", "14:00"],
    ])("is false when the other slot %s", (_case, start, end) => {
      const other = slot(start, end);

      expect(booked.overlaps(other)).toBe(false);
      expect(other.overlaps(booked)).toBe(false);
    });
  });

  describe("contains", () => {
    const window = slot("09:00", "17:00");

    it("accepts a slot inside the window", () => {
      expect(window.contains(slot("10:00", "11:00"))).toBe(true);
    });

    it("accepts a slot touching both window edges", () => {
      expect(window.contains(slot("09:00", "17:00"))).toBe(true);
    });

    it("rejects a slot running past either edge", () => {
      expect(window.contains(slot("08:59", "10:00"))).toBe(false);
      expect(window.contains(slot("16:00", "17:01"))).toBe(false);
    });
  });
});
