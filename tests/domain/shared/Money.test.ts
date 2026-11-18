import { describe, expect, it } from "vitest";
import { DomainError } from "../../../src/domain/shared/DomainError.js";
import { Money } from "../../../src/domain/shared/Money.js";

const expectInvalidMoney = (action: () => unknown) => {
  expect(action).toThrow(DomainError);
  expect(action).toThrow(expect.objectContaining({ code: "INVALID_MONEY" }));
};

describe("Money", () => {
  describe("ofPaise", () => {
    it("accepts zero and positive whole amounts", () => {
      expect(Money.ofPaise(0).equals(Money.ZERO)).toBe(true);
      expect(Money.ofPaise(1999).paise).toBe(1999);
    });

    it.each([-1, 10.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
      "rejects %s",
      (paise) => expectInvalidMoney(() => Money.ofPaise(paise)),
    );
  });

  describe("add and subtract", () => {
    it("adds amounts without changing the originals", () => {
      const first = Money.ofPaise(100);
      const second = Money.ofPaise(250);

      expect(first.add(second).paise).toBe(350);
      expect(first.paise).toBe(100);
      expect(second.paise).toBe(250);
    });

    it("subtracts down to exactly zero", () => {
      expect(Money.ofPaise(100).subtract(Money.ofPaise(100)).equals(Money.ZERO)).toBe(true);
    });

    it("rejects a result below zero", () => {
      expectInvalidMoney(() => Money.ofPaise(100).subtract(Money.ofPaise(101)));
    });

    it("rejects a total beyond the safe integer range", () => {
      expectInvalidMoney(() => Money.ofPaise(Number.MAX_SAFE_INTEGER).add(Money.ofPaise(1)));
    });
  });

  describe("prorate", () => {
    it("prices a duration from an hourly rate", () => {
      expect(Money.ofPaise(20_000).prorate(90, 60).paise).toBe(30_000);
    });

    it("calculates a percentage", () => {
      expect(Money.ofPaise(30_000).prorate(50, 100).paise).toBe(15_000);
    });

    it("rounds to the nearest paisa", () => {
      expect(Money.ofPaise(100).prorate(1, 3).paise).toBe(33);
      expect(Money.ofPaise(100).prorate(2, 3).paise).toBe(67);
    });

    it("rounds exact halves up", () => {
      expect(Money.ofPaise(101).prorate(1, 2).paise).toBe(51);
    });

    it("returns zero for a zero part", () => {
      expect(Money.ofPaise(100).prorate(0, 100).equals(Money.ZERO)).toBe(true);
    });

    it.each([
      [-1, 100],
      [1.5, 100],
      [1, 0],
      [1, -100],
      [1, 2.5],
    ])("rejects part %s of whole %s", (part, whole) => {
      expectInvalidMoney(() => Money.ofPaise(100).prorate(part, whole));
    });
  });
});
