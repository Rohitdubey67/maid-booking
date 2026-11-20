import { describe, expect, it } from "vitest";
import { Visit } from "../../../src/domain/booking/Visit.js";
import type { VisitStatus } from "../../../src/domain/booking/VisitStatus.js";
import { Money } from "../../../src/domain/shared/Money.js";
import { TimeSlot } from "../../../src/domain/shared/TimeSlot.js";
import { expectAppError } from "../../support/expectAppError.js";
import { ist } from "../../support/testContext.js";

const BEFORE_DEADLINE = ist("2026-12-05T10:00");
const DEADLINE = ist("2026-12-06T10:00");
const VISIT_START = ist("2026-12-07T10:00");
const DURING_VISIT = ist("2026-12-07T10:30");
const VISIT_END = ist("2026-12-07T11:00");

const unpaid = () =>
  Visit.create({
    id: "visit-1",
    bookingId: "booking-1",
    maidId: "maid-1",
    slot: TimeSlot.of(VISIT_START, VISIT_END),
    price: Money.ofPaise(20_000),
    paymentDueAt: DEADLINE,
  });

const paying = () => {
  const visit = unpaid();
  visit.startPayment(BEFORE_DEADLINE);
  return visit;
};

const paid = () => {
  const visit = paying();
  visit.confirmPayment();
  return visit;
};

const visitIn: Record<VisitStatus, () => Visit> = {
  PENDING_PAYMENT: unpaid,
  PAYMENT_IN_PROGRESS: paying,
  CONFIRMED: paid,
  COMPLETED: () => {
    const visit = paid();
    visit.complete(VISIT_END);
    return visit;
  },
  CANCELLED: () => {
    const visit = unpaid();
    visit.cancel(BEFORE_DEADLINE);
    return visit;
  },
  EXPIRED: () => {
    const visit = unpaid();
    visit.expire(DEADLINE);
    return visit;
  },
};

// Each move uses a time its own timing rule allows, so only the status can block it.
const moveTo: Record<VisitStatus, (visit: Visit) => void> = {
  PENDING_PAYMENT: (visit) => visit.failPayment(),
  PAYMENT_IN_PROGRESS: (visit) => visit.startPayment(BEFORE_DEADLINE),
  CONFIRMED: (visit) => visit.confirmPayment(),
  COMPLETED: (visit) => visit.complete(VISIT_END),
  CANCELLED: (visit) => visit.cancel(BEFORE_DEADLINE),
  EXPIRED: (visit) => visit.expire(DEADLINE),
};

const allowed: ReadonlyArray<readonly [VisitStatus, VisitStatus]> = [
  ["PENDING_PAYMENT", "PAYMENT_IN_PROGRESS"],
  ["PENDING_PAYMENT", "CANCELLED"],
  ["PENDING_PAYMENT", "EXPIRED"],
  ["PAYMENT_IN_PROGRESS", "CONFIRMED"],
  ["PAYMENT_IN_PROGRESS", "PENDING_PAYMENT"],
  ["CONFIRMED", "COMPLETED"],
  ["CONFIRMED", "CANCELLED"],
];

const statuses = Object.keys(visitIn) as VisitStatus[];
const notAllowed = statuses
  .flatMap((from) => statuses.map((to) => [from, to] as const))
  .filter(([from, to]) => !allowed.some(([a, b]) => a === from && b === to));

describe("Visit status changes", () => {
  it.each(allowed)("allows %s to %s", (from, to) => {
    const visit = visitIn[from]();

    moveTo[to](visit);

    expect(visit.status).toBe(to);
  });

  it.each(notAllowed)("blocks %s to %s and keeps the status", (from, to) => {
    const visit = visitIn[from]();

    expectAppError("INVALID_STATUS_CHANGE", () => moveTo[to](visit));
    expect(visit.status).toBe(from);
  });
});

describe("Visit timing rules", () => {
  it("blocks payment once the deadline has passed", () => {
    expectAppError("PAYMENT_OVERDUE", () => unpaid().startPayment(DEADLINE));
  });

  it("blocks expiry before the deadline", () => {
    expectAppError("PAYMENT_NOT_OVERDUE", () => unpaid().expire(BEFORE_DEADLINE));
  });

  it("blocks cancelling a paid visit once it has started", () => {
    expectAppError("VISIT_ALREADY_STARTED", () => paid().cancel(VISIT_START));
  });

  it("lets an unpaid visit be cancelled even after its start time", () => {
    const visit = unpaid();

    visit.cancel(DURING_VISIT);

    expect(visit.status).toBe("CANCELLED");
  });

  it("blocks completing a visit before it ends", () => {
    expectAppError("VISIT_NOT_FINISHED", () => paid().complete(DURING_VISIT));
  });
});
