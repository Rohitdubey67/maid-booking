import { AppError } from "../../domain/shared/AppError.js";
import { Money } from "../../domain/shared/Money.js";
import type { TimeSlot } from "../../domain/shared/TimeSlot.js";
import type { RefundPolicy } from "./RefundPolicy.js";

export interface RefundRule {
  minHoursBeforeStart: number;
  refundPercent: number;
}

/** 100% with at least 24 hours' notice, 50% with at least 2 hours, otherwise nothing. */
export const DEFAULT_REFUND_RULES: readonly RefundRule[] = [
  { minHoursBeforeStart: 24, refundPercent: 100 },
  { minHoursBeforeStart: 2, refundPercent: 50 },
];

const MS_PER_HOUR = 3_600_000;

export class NoticeRefundPolicy implements RefundPolicy {
  private readonly tiers: readonly RefundRule[];

  constructor(tiers: readonly RefundRule[] = DEFAULT_REFUND_RULES) {
    tiers.forEach(assertValidTier);
    this.tiers = [...tiers].sort((a, b) => b.minHoursBeforeStart - a.minHoursBeforeStart);
  }

  refundFor(amountPaid: Money, slot: TimeSlot, cancelledAt: Date): Money {
    const hoursBeforeStart = (slot.start.getTime() - cancelledAt.getTime()) / MS_PER_HOUR;
    const tier = this.tiers.find(({ minHoursBeforeStart }) => hoursBeforeStart >= minHoursBeforeStart);

    return tier ? amountPaid.portion(tier.refundPercent, 100) : Money.ZERO;
  }
}

function assertValidTier({ minHoursBeforeStart, refundPercent }: RefundRule): void {
  const validHours = Number.isFinite(minHoursBeforeStart) && minHoursBeforeStart >= 0;
  const validPercent = Number.isInteger(refundPercent) && refundPercent >= 0 && refundPercent <= 100;

  if (!validHours || !validPercent) {
    throw new AppError(
      "INVALID_REFUND_RULES",
      `Refund tier needs non-negative hours and a whole percent from 0 to 100: ${minHoursBeforeStart}h, ${refundPercent}%`,
    );
  }
}
