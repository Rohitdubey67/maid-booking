import { AppError } from "../shared/AppError.js";
import type { Money } from "../shared/Money.js";
import { requireNonBlank } from "../shared/requireNonBlank.js";
import { checkStatusChange, isFinalStatus } from "../shared/StatusRules.js";
import type { TimeSlot } from "../shared/TimeSlot.js";
import { VISIT_STATUS_CHANGES } from "./VisitStatus.js";
import type { VisitStatus } from "./VisitStatus.js";

export interface VisitProps {
  id: string;
  bookingId: string;
  maidId: string;
  slot: TimeSlot;
  price: Money;
  paymentDueAt: Date;
}

/** One visit by a maid. It is the unit that holds a slot, is paid for, and is cancelled. */
export class Visit {
  readonly id: string;
  readonly bookingId: string;
  readonly maidId: string;
  readonly slot: TimeSlot;
  readonly price: Money;

  private readonly paymentDueAtMs: number;
  private currentStatus: VisitStatus = "PENDING_PAYMENT";

  private constructor(props: VisitProps) {
    this.id = requireNonBlank(props.id, "Visit id", "INVALID_VISIT");
    this.bookingId = requireNonBlank(props.bookingId, "Booking id", "INVALID_VISIT");
    this.maidId = requireNonBlank(props.maidId, "Maid id", "INVALID_VISIT");
    this.slot = props.slot;
    this.price = props.price;
    this.paymentDueAtMs = props.paymentDueAt.getTime();

    if (props.price.paise === 0) {
      throw new AppError("INVALID_VISIT", "Visit price must be above zero");
    }
    if (Number.isNaN(this.paymentDueAtMs)) {
      throw new AppError("INVALID_VISIT", "Payment due date must be valid");
    }
  }

  static create(props: VisitProps): Visit {
    return new Visit(props);
  }

  get status(): VisitStatus {
    return this.currentStatus;
  }

  get paymentDueAt(): Date {
    return new Date(this.paymentDueAtMs);
  }

  get isFinal(): boolean {
    return isFinalStatus(VISIT_STATUS_CHANGES, this.currentStatus);
  }

  isPaymentOverdue(now: Date): boolean {
    return this.currentStatus === "PENDING_PAYMENT" && this.deadlineHasPassed(now);
  }

  startPayment(now: Date): void {
    this.moveTo("PAYMENT_IN_PROGRESS", () => {
      if (this.deadlineHasPassed(now)) {
        throw new AppError("PAYMENT_OVERDUE", `Payment deadline has passed for ${this.id}`);
      }
    });
  }

  /** Allowed after the deadline, because payment began before it. */
  confirmPayment(): void {
    this.moveTo("CONFIRMED");
  }

  failPayment(): void {
    this.moveTo("PENDING_PAYMENT");
  }

  expire(now: Date): void {
    this.moveTo("EXPIRED", () => {
      if (!this.deadlineHasPassed(now)) {
        throw new AppError("PAYMENT_NOT_OVERDUE", `Payment is not overdue for ${this.id}`);
      }
    });
  }

  /** An unpaid visit can always be abandoned, but a paid one only before it starts. */
  cancel(now: Date): void {
    this.moveTo("CANCELLED", () => {
      if (this.currentStatus === "CONFIRMED" && now >= this.slot.start) {
        throw new AppError("VISIT_ALREADY_STARTED", `Visit ${this.id} has already started`);
      }
    });
  }

  complete(now: Date): void {
    this.moveTo("COMPLETED", () => {
      if (now < this.slot.end) {
        throw new AppError("VISIT_NOT_FINISHED", `Visit ${this.id} has not finished`);
      }
    });
  }

  private deadlineHasPassed(now: Date): boolean {
    return now.getTime() >= this.paymentDueAtMs;
  }

  private moveTo(next: VisitStatus, checkTiming?: () => void): void {
    checkStatusChange(VISIT_STATUS_CHANGES, this.currentStatus, next, `Visit ${this.id}`);
    checkTiming?.();
    this.currentStatus = next;
  }
}
