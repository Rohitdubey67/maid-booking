import { beforeEach, describe, expect, it } from "vitest";
import { SlotTakenError } from "../../src/domain/booking/SlotTakenError.js";
import { expectRejection } from "../support/expectAppError.js";
import { createTestContext, ist, maidCommand, recurringRequest, scheduledRequest } from "../support/testContext.js";
import type { TestContext } from "../support/testContext.js";

const TUESDAY_10AM = ist("2026-12-08T10:00");

describe("Booking a maid", () => {
  let ctx: TestContext;
  let maidId: string;

  beforeEach(async () => {
    ctx = createTestContext();
    maidId = (await ctx.maidService.onboard(maidCommand())).id;
  });

  it("creates a scheduled visit, priced and waiting 15 minutes for payment", async () => {
    const { visits } = await ctx.bookingService.book(scheduledRequest(maidId, TUESDAY_10AM, { durationMinutes: 90 }));

    expect(visits).toHaveLength(1);
    expect(visits[0]?.status).toBe("PENDING_PAYMENT");
    expect(visits[0]?.price.paise).toBe(30_000);
    expect(visits[0]?.paymentDueAt).toEqual(ist("2026-12-07T08:15"));
  });

  it("creates an instant visit starting now", async () => {
    ctx.clock.set(ist("2026-12-07T10:00"));

    const { visits } = await ctx.bookingService.book({
      type: "INSTANT",
      customerId: "customer-1",
      maidId,
      serviceType: "cleaning",
      durationMinutes: 60,
    });

    expect(visits[0]?.slot.start).toEqual(ist("2026-12-07T10:00"));
  });

  it("creates one visit per recurring date, each with its own payment deadline", async () => {
    const { visits } = await ctx.bookingService.book(recurringRequest(maidId));

    expect(visits).toHaveLength(6);
    expect(visits[0]?.paymentDueAt).toEqual(ist("2026-12-07T08:15"));
    expect(visits[1]?.paymentDueAt).toEqual(ist("2026-12-08T09:00"));
  });

  describe("no double-booking", () => {
    it("blocks an overlapping time", async () => {
      await ctx.bookingService.book(scheduledRequest(maidId, TUESDAY_10AM));

      await expectRejection("SLOT_TAKEN", ctx.bookingService.book(scheduledRequest(maidId, ist("2026-12-08T10:30"))));
    });

    it("allows a back-to-back booking", async () => {
      await ctx.bookingService.book(scheduledRequest(maidId, TUESDAY_10AM));

      await expect(ctx.bookingService.book(scheduledRequest(maidId, ist("2026-12-08T11:00")))).resolves.toBeDefined();
    });

    it("books nothing from a recurring booking when any one visit clashes", async () => {
      await ctx.bookingService.book(scheduledRequest(maidId, ist("2026-12-16T09:30")));

      await expectRejection("SLOT_TAKEN", ctx.bookingService.book(recurringRequest(maidId)));
      await expect(ctx.bookingService.book(scheduledRequest(maidId, ist("2026-12-07T09:00")))).resolves.toBeDefined();
    });

    it("lets exactly one of 50 people booking the same time at once succeed", async () => {
      const attempts = Array.from({ length: 50 }, (_, index) =>
        ctx.bookingService.book(scheduledRequest(maidId, TUESDAY_10AM, { customerId: `customer-${index}` })),
      );

      const results = await Promise.allSettled(attempts);
      const losers = results.filter((result) => result.status === "rejected");

      expect(results.length - losers.length).toBe(1);
      losers.forEach((loser) => expect(loser.reason).toBeInstanceOf(SlotTakenError));
    });
  });

  describe("refused bookings", () => {
    it("refuses a time outside working hours", async () => {
      await expectRejection("OUTSIDE_WORKING_HOURS", ctx.bookingService.book(scheduledRequest(maidId, ist("2026-12-13T10:00"))));
    });

    it("refuses a service the maid doesn't offer", async () => {
      await expectRejection(
        "SERVICE_NOT_OFFERED",
        ctx.bookingService.book(scheduledRequest(maidId, TUESDAY_10AM, { serviceType: "gardening" })),
      );
    });

    it("refuses an unknown maid", async () => {
      await expectRejection("NOT_FOUND", ctx.bookingService.book(scheduledRequest("missing", TUESDAY_10AM)));
    });

    it("refuses an unknown booking type", async () => {
      await expectRejection(
        "UNSUPPORTED_BOOKING_TYPE",
        ctx.bookingService.book({ ...scheduledRequest(maidId, TUESDAY_10AM), type: "MONTHLY" }),
      );
    });
  });
});
