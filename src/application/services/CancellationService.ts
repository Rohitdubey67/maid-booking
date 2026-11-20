import type { Visit } from "../../domain/booking/Visit.js";
import type { Payment } from "../../domain/payment/Payment.js";
import { AppError } from "../../domain/shared/AppError.js";
import { Money } from "../../domain/shared/Money.js";
import type { RefundPolicy } from "../cancellation/RefundPolicy.js";
import type { Clock } from "../interfaces/Clock.js";
import type { PaymentGateway, RefundResult } from "../interfaces/PaymentGateway.js";
import type { BookingRepository, VisitRepository, PaymentRepository } from "../interfaces/Repositories.js";
import type { SlotCalendar } from "../interfaces/SlotCalendar.js";
import { findOrThrow } from "./findOrThrow.js";

/**
 * NOT_APPLICABLE: the visit was never paid.
 * NO_REFUND: the policy gives nothing back.
 * REFUND_PENDING: the gateway refund failed and needs a retry.
 */
export type RefundStatus = "NOT_APPLICABLE" | "NO_REFUND" | "REFUNDED" | "REFUND_PENDING";

export interface VisitCancellation {
  visitId: string;
  refundAmount: Money;
  refundStatus: RefundStatus;
}

export interface SeriesCancellation {
  bookingId: string;
  cancelled: VisitCancellation[];
  skipped: { visitId: string; reason: string }[];
}

interface CancellationServiceDeps {
  bookings: BookingRepository;
  visits: VisitRepository;
  payments: PaymentRepository;
  calendar: SlotCalendar;
  gateway: PaymentGateway;
  policy: RefundPolicy;
  clock: Clock;
}

export class CancellationService {
  private readonly deps: CancellationServiceDeps;

  constructor(deps: CancellationServiceDeps) {
    this.deps = deps;
  }

  async cancelVisit(visitId: string): Promise<VisitCancellation> {
    const visit = await findOrThrow(this.deps.visits.findById(visitId), "Visit", visitId);
    return this.cancel(visit, this.deps.clock.now());
  }

  /**
   * Cancels every open visit that still can be. Visits that have started or
   * are mid-payment are skipped and reported, rather than blocking the rest.
   */
  async cancelBooking(bookingId: string): Promise<SeriesCancellation> {
    await findOrThrow(this.deps.bookings.findById(bookingId), "Booking", bookingId);
    const now = this.deps.clock.now();
    const open = (await this.deps.visits.findByBookingId(bookingId)).filter((visit) => !visit.isFinal);
    const result: SeriesCancellation = { bookingId, cancelled: [], skipped: [] };

    for (const visit of open) {
      try {
        result.cancelled.push(await this.cancel(visit, now));
      } catch (error) {
        if (!(error instanceof AppError)) {
          throw error;
        }
        result.skipped.push({ visitId: visit.id, reason: error.message });
      }
    }

    if (result.cancelled.length === 0) {
      throw new AppError("NOTHING_TO_CANCEL", `Booking ${bookingId} has no visits that can be cancelled`);
    }
    return result;
  }

  private async cancel(visit: Visit, now: Date): Promise<VisitCancellation> {
    const wasPaid = visit.status === "CONFIRMED";

    visit.cancel(now);
    await this.deps.visits.saveAll([visit]);
    await this.deps.calendar.release(visit.maidId, visit.id);

    if (!wasPaid) {
      return { visitId: visit.id, refundAmount: Money.ZERO, refundStatus: "NOT_APPLICABLE" };
    }
    return this.refund(visit, now);
  }

  private async refund(visit: Visit, now: Date): Promise<VisitCancellation> {
    const payment = await this.deps.payments.findSucceededByVisitId(visit.id);
    if (!payment) {
      throw new Error(`Paid visit ${visit.id} has no successful payment`);
    }

    const refundAmount = this.deps.policy.refundFor(payment.amount, visit.slot, now);
    if (refundAmount.paise === 0) {
      return { visitId: visit.id, refundAmount, refundStatus: "NO_REFUND" };
    }

    payment.requestRefund(refundAmount);
    await this.deps.payments.save(payment);

    const result = await this.requestGatewayRefund(payment, refundAmount);
    if (result.status === "SUCCEEDED") {
      payment.markRefunded(result.refundId);
      await this.deps.payments.save(payment);
    }

    const refundStatus = payment.status === "REFUNDED" ? "REFUNDED" : "REFUND_PENDING";
    return { visitId: visit.id, refundAmount, refundStatus };
  }

  /** A failed refund leaves the payment REFUND_PENDING instead of undoing the cancellation. */
  private async requestGatewayRefund(payment: Payment, amount: Money): Promise<RefundResult> {
    const { transactionId } = payment;
    if (transactionId === null) {
      throw new Error(`Payment ${payment.id} has no transaction to refund`);
    }

    try {
      return await this.deps.gateway.refund({ reference: payment.id, transactionId, amount });
    } catch {
      return { status: "FAILED", reason: "Payment gateway unavailable" };
    }
  }
}
