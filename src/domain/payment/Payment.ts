import { AppError } from "../shared/AppError.js";
import type { Money } from "../shared/Money.js";
import { requireNonBlank } from "../shared/requireNonBlank.js";
import { checkStatusChange } from "../shared/StatusRules.js";
import { PAYMENT_STATUS_CHANGES } from "./PaymentStatus.js";
import type { PaymentStatus } from "./PaymentStatus.js";

export interface PaymentProps {
  id: string;
  visitId: string;
  amount: Money;
  method: string;
  requestKey: string;
  createdAt: Date;
}

/** One attempt to pay for one visit. A failed attempt stays failed; retrying creates a new payment. */
export class Payment {
  readonly id: string;
  readonly visitId: string;
  readonly amount: Money;
  readonly method: string;
  readonly requestKey: string;

  private readonly createdAtMs: number;
  private currentStatus: PaymentStatus = "INITIATED";
  private gatewayTransactionId: string | null = null;
  private failure: string | null = null;
  private refunded: Money | null = null;
  private gatewayRefundId: string | null = null;

  private constructor(props: PaymentProps) {
    this.id = requireNonBlank(props.id, "Payment id", "INVALID_PAYMENT");
    this.visitId = requireNonBlank(props.visitId, "Visit id", "INVALID_PAYMENT");
    this.method = requireNonBlank(props.method, "Payment method", "INVALID_PAYMENT");
    this.requestKey = requireNonBlank(props.requestKey, "Request key", "INVALID_PAYMENT");
    this.amount = props.amount;
    this.createdAtMs = props.createdAt.getTime();

    if (props.amount.paise === 0) {
      throw new AppError("INVALID_PAYMENT", "Payment amount must be above zero");
    }
    if (Number.isNaN(this.createdAtMs)) {
      throw new AppError("INVALID_PAYMENT", "Payment creation time must be valid");
    }
  }

  static initiate(props: PaymentProps): Payment {
    return new Payment(props);
  }

  get status(): PaymentStatus {
    return this.currentStatus;
  }

  get createdAt(): Date {
    return new Date(this.createdAtMs);
  }

  get transactionId(): string | null {
    return this.gatewayTransactionId;
  }

  get failureReason(): string | null {
    return this.failure;
  }

  get refundAmount(): Money | null {
    return this.refunded;
  }

  get refundId(): string | null {
    return this.gatewayRefundId;
  }

  markSucceeded(transactionId: string): void {
    const id = requireNonBlank(transactionId, "Transaction id", "INVALID_PAYMENT");
    this.moveTo("SUCCEEDED");
    this.gatewayTransactionId = id;
  }

  markFailed(reason: string): void {
    this.moveTo("FAILED");
    this.failure = reason;
  }

  requestRefund(amount: Money): void {
    this.moveTo("REFUND_PENDING", () => {
      if (amount.paise === 0 || amount.paise > this.amount.paise) {
        throw new AppError("INVALID_REFUND", `Refund must be above zero and at most ${this.amount.paise} paise`);
      }
    });
    this.refunded = amount;
  }

  markRefunded(refundId: string): void {
    const id = requireNonBlank(refundId, "Refund id", "INVALID_PAYMENT");
    this.moveTo("REFUNDED");
    this.gatewayRefundId = id;
  }

  private moveTo(next: PaymentStatus, check?: () => void): void {
    checkStatusChange(PAYMENT_STATUS_CHANGES, this.currentStatus, next, `Payment ${this.id}`);
    check?.();
    this.currentStatus = next;
  }
}
