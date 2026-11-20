import { beforeEach, describe, expect, it } from "vitest";
import { createTestContext, ist, maidCommand, recurringRequest, scheduledRequest } from "../support/testContext.js";
import type { TestContext } from "../support/testContext.js";

describe("Unpaid visits", () => {
  let ctx: TestContext;
  let maidId: string;

  const book = async () =>
    (await ctx.bookingService.book(scheduledRequest(maidId, ist("2026-12-08T10:00")))).visits[0]!;

  beforeEach(async () => {
    ctx = createTestContext();
    maidId = (await ctx.maidService.onboard(maidCommand())).id;
  });

  it("expire at the payment deadline, which frees the time", async () => {
    const visit = await book();
    ctx.clock.advanceMinutes(14);
    expect(await ctx.expiryService.expireUnpaid()).toEqual([]);

    ctx.clock.advanceMinutes(1);
    expect(await ctx.expiryService.expireUnpaid()).toEqual([visit.id]);
    expect(visit.status).toBe("EXPIRED");
    await expect(book()).resolves.toBeDefined();
  });

  it("never include paid visits", async () => {
    const visit = await book();
    await ctx.paymentService.pay({ visitId: visit.id, method: "UPI", details: { vpa: "asha@okbank" }, requestKey: "key-1" });
    ctx.clock.advanceMinutes(60);

    expect(await ctx.expiryService.expireUnpaid()).toEqual([]);
    expect(visit.status).toBe("CONFIRMED");
  });

  it("each expire on their own deadline in a recurring booking", async () => {
    const { visits } = await ctx.bookingService.book(recurringRequest(maidId));

    ctx.clock.advanceMinutes(15);
    expect(await ctx.expiryService.expireUnpaid()).toEqual([visits[0]!.id]);

    ctx.clock.set(ist("2026-12-08T09:00"));
    expect(await ctx.expiryService.expireUnpaid()).toEqual([visits[1]!.id]);
  });
});
