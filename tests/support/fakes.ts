import type { Clock } from "../../src/application/interfaces/Clock.js";
import type { IdGenerator } from "../../src/application/interfaces/IdGenerator.js";
import type {
  ChargeRequest,
  ChargeResult,
  PaymentGateway,
  RefundRequest,
  RefundResult,
} from "../../src/application/interfaces/PaymentGateway.js";

const MS_PER_MINUTE = 60_000;

/** A clock that tests can set and move forward. */
export class FixedClock implements Clock {
  private current: Date;

  constructor(start: Date) {
    this.current = new Date(start);
  }

  now(): Date {
    return new Date(this.current);
  }

  set(instant: Date): void {
    this.current = new Date(instant);
  }

  advanceMinutes(minutes: number): void {
    this.current = new Date(this.current.getTime() + minutes * MS_PER_MINUTE);
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;

  next(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

/** A payment gateway whose answer tests choose. It records every charge and refund. */
export class FakePaymentGateway implements PaymentGateway {
  declineCharges = false;

  readonly charges: ChargeRequest[] = [];
  readonly refunds: RefundRequest[] = [];

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    this.charges.push(request);
    return this.declineCharges
      ? { status: "FAILED", reason: "Card declined" }
      : { status: "SUCCEEDED", transactionId: `txn-${request.reference}` };
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    this.refunds.push(request);
    return { status: "SUCCEEDED", refundId: `refund-${request.reference}` };
  }
}
