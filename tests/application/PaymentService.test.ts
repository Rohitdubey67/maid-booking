import { beforeEach, describe, expect, it } from "vitest";
import type { PayCommand } from "../../src/application/services/PaymentService.js";
import type { Visit } from "../../src/domain/booking/Visit.js";
import { expectRejection } from "../support/expectAppError.js";
import { createTestContext, ist, maidCommand, recurringRequest, scheduledRequest } from "../support/testContext.js";
import type { TestContext } from "../support/testContext.js";

describe("Paying for a visit", () => {
  let ctx: TestContext;
  let maidId: string;
  let visit: Visit;

  const pay = (overrides: Partial<PayCommand> = {}) =>
    ctx.paymentService.pay({
      visitId: visit.id,
      method: "UPI",
      details: { vpa: "asha@okbank" },
      requestKey: "key-1",
      ...overrides,
    });

  beforeEach(async () => {
    ctx = createTestContext();
    maidId = (await ctx.maidService.onboard(maidCommand())).id;
    visit = (await ctx.bookingService.book(scheduledRequest(maidId, ist("2026-12-08T10:00")))).visits[0]!;
  });

  it.each([
    ["CARD", { cardToken: "tok_visa" }],
    ["UPI", { vpa: "asha@okbank" }],
    ["WALLET", { walletId: "wallet-123" }],
  ])("accepts %s and confirms the visit", async (method, details) => {
    const { payment } = await pay({ method, details });

    expect(payment.status).toBe("SUCCEEDED");
    expect(payment.amount).toBe(visit.price);
    expect(visit.status).toBe("CONFIRMED");
  });

  it("refuses an unknown method or bad details without charging", async () => {
    await expectRejection("UNSUPPORTED_PAYMENT_METHOD", pay({ method: "CASH" }));
    await expectRejection("INVALID_PAYMENT_DETAILS", pay({ method: "CARD", details: { cardToken: "4111111111111111" } }));
    expect(ctx.gateway.charges).toHaveLength(0);
  });

  it("keeps the visit unpaid after a decline, and lets the customer retry", async () => {
    ctx.gateway.declineCharges = true;
    expect((await pay()).payment.status).toBe("FAILED");
    expect(visit.status).toBe("PENDING_PAYMENT");

    ctx.gateway.declineCharges = false;
    expect((await pay({ requestKey: "key-2" })).payment.status).toBe("SUCCEEDED");
  });

  it("refuses payment after the deadline", async () => {
    ctx.clock.advanceMinutes(15);

    await expectRejection("PAYMENT_OVERDUE", pay());
  });

  it("refuses paying for a visit that is already paid", async () => {
    await pay();

    await expectRejection("INVALID_STATUS_CHANGE", pay({ requestKey: "key-2" }));
    expect(ctx.gateway.charges).toHaveLength(1);
  });

  it("charges each recurring visit separately", async () => {
    const { visits } = await ctx.bookingService.book(recurringRequest(maidId, { startDate: "2026-12-14" }));

    await pay({ visitId: visits[1]!.id });

    expect(visits[1]?.status).toBe("CONFIRMED");
    expect(visits[0]?.status).toBe("PENDING_PAYMENT");
  });

  describe("never charging twice", () => {
    it("returns the first result when the same key is sent again", async () => {
      const first = await pay();
      const again = await pay();

      expect(again.repeated).toBe(true);
      expect(again.payment.id).toBe(first.payment.id);
      expect(ctx.gateway.charges).toHaveLength(1);
    });

    it("refuses a key already used for another visit", async () => {
      await pay();
      const other = (await ctx.bookingService.book(scheduledRequest(maidId, ist("2026-12-09T10:00")))).visits[0]!;

      await expectRejection("KEY_ALREADY_USED", pay({ visitId: other.id }));
    });

    it("charges once when the same payment is sent twice at the same moment", async () => {
      await Promise.allSettled([pay(), pay()]);

      expect(ctx.gateway.charges).toHaveLength(1);
      expect(visit.status).toBe("CONFIRMED");
    });
  });
});
