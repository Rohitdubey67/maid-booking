import { beforeEach, describe, expect, it } from "vitest";
import { NoticeRefundPolicy } from "../../src/application/cancellation/NoticeRefundPolicy.js";
import type { Visit } from "../../src/domain/booking/Visit.js";
import { Money } from "../../src/domain/shared/Money.js";
import { TimeSlot } from "../../src/domain/shared/TimeSlot.js";
import { expectRejection } from "../support/expectAppError.js";
import { createTestContext, ist, maidCommand, recurringRequest, scheduledRequest } from "../support/testContext.js";
import type { TestContext } from "../support/testContext.js";

describe("Refund rules", () => {
  const policy = new NoticeRefundPolicy();
  const visitSlot = TimeSlot.ofDuration(ist("2026-12-08T10:00"), 60);
  const refundIfCancelledAt = (dateTime: string) => policy.refundFor(Money.ofPaise(20_000), visitSlot, ist(dateTime)).paise;

  it.each([
    ["24 hours or more before", "2026-12-07T10:00", 20_000],
    ["just under 24 hours before", "2026-12-07T10:01", 10_000],
    ["exactly 2 hours before", "2026-12-08T08:00", 10_000],
    ["under 2 hours before", "2026-12-08T08:01", 0],
  ])("cancelling %s refunds the right amount", (_case, cancelledAt, expected) => {
    expect(refundIfCancelledAt(cancelledAt)).toBe(expected);
  });
});

describe("Cancelling", () => {
  let ctx: TestContext;
  let maidId: string;
  let keyCounter = 0;

  const book = async (startAt: Date) => (await ctx.bookingService.book(scheduledRequest(maidId, startAt))).visits[0]!;
  const payFor = (visit: Visit) => {
    keyCounter += 1;
    return ctx.paymentService.pay({ visitId: visit.id, method: "UPI", details: { vpa: "asha@okbank" }, requestKey: `key-${keyCounter}` });
  };
  const bookAgain = (startAt: Date) => ctx.bookingService.book(scheduledRequest(maidId, startAt));

  beforeEach(async () => {
    ctx = createTestContext();
    maidId = (await ctx.maidService.onboard(maidCommand())).id;
  });

  describe("one visit", () => {
    it("cancels an unpaid visit with nothing to refund, and frees the time", async () => {
      const visit = await book(ist("2026-12-08T10:00"));

      const result = await ctx.cancellationService.cancelVisit(visit.id);

      expect(result.refundStatus).toBe("NOT_APPLICABLE");
      await expect(bookAgain(ist("2026-12-08T10:00"))).resolves.toBeDefined();
    });

    it("refunds a paid visit by the rules, and frees the time", async () => {
      const visit = await book(ist("2026-12-09T10:00"));
      const { payment } = await payFor(visit);

      const result = await ctx.cancellationService.cancelVisit(visit.id);

      expect(result).toMatchObject({ refundStatus: "REFUNDED", refundAmount: { paise: 20_000 } });
      expect(payment.status).toBe("REFUNDED");
      await expect(bookAgain(ist("2026-12-09T10:00"))).resolves.toBeDefined();
    });

    it("gives no refund with under 2 hours' notice", async () => {
      const visit = await book(ist("2026-12-07T09:00"));
      await payFor(visit);

      const result = await ctx.cancellationService.cancelVisit(visit.id);

      expect(result.refundStatus).toBe("NO_REFUND");
      expect(ctx.gateway.refunds).toHaveLength(0);
    });

    it("refuses to cancel a paid visit that has started", async () => {
      const visit = await book(ist("2026-12-07T09:00"));
      await payFor(visit);
      ctx.clock.set(ist("2026-12-07T09:30"));

      await expectRejection("VISIT_ALREADY_STARTED", ctx.cancellationService.cancelVisit(visit.id));
    });

    it("refuses to cancel the same visit twice", async () => {
      const visit = await book(ist("2026-12-08T10:00"));
      await ctx.cancellationService.cancelVisit(visit.id);

      await expectRejection("INVALID_STATUS_CHANGE", ctx.cancellationService.cancelVisit(visit.id));
    });
  });

  describe("recurring booking", () => {
    it("cancels one visit and leaves the others", async () => {
      const { visits } = await ctx.bookingService.book(recurringRequest(maidId));

      await ctx.cancellationService.cancelVisit(visits[1]!.id);

      expect(visits.map((visit) => visit.status)).toEqual([
        "PENDING_PAYMENT",
        "CANCELLED",
        "PENDING_PAYMENT",
        "PENDING_PAYMENT",
        "PENDING_PAYMENT",
        "PENDING_PAYMENT",
      ]);
    });

    it("cancels the whole series and refunds the paid visit", async () => {
      const { booking, visits } = await ctx.bookingService.book(
        recurringRequest(maidId, { daysOfWeek: [2, 4], startDate: "2026-12-08", endDate: "2026-12-17" }),
      );
      await payFor(visits[0]!);

      const result = await ctx.cancellationService.cancelBooking(booking.id);

      expect(result.cancelled.map((visit) => visit.refundStatus)).toEqual([
        "REFUNDED",
        "NOT_APPLICABLE",
        "NOT_APPLICABLE",
        "NOT_APPLICABLE",
      ]);
      expect((await ctx.bookingService.getBooking(booking.id)).status).toBe("CANCELLED");
    });

    it("skips a paid visit that has started and cancels the rest", async () => {
      const { booking, visits } = await ctx.bookingService.book(recurringRequest(maidId));
      await payFor(visits[0]!);
      ctx.clock.set(ist("2026-12-07T09:30"));

      const result = await ctx.cancellationService.cancelBooking(booking.id);

      expect(result.skipped.map((visit) => visit.visitId)).toEqual([visits[0]!.id]);
      expect(result.cancelled).toHaveLength(5);
    });

    it("refuses when nothing is left to cancel", async () => {
      const { booking } = await ctx.bookingService.book(recurringRequest(maidId));
      await ctx.cancellationService.cancelBooking(booking.id);

      await expectRejection("NOTHING_TO_CANCEL", ctx.cancellationService.cancelBooking(booking.id));
    });
  });
});
