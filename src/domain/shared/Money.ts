import { DomainError } from "./DomainError.js";

/** Immutable, non-negative INR amount stored in paise to avoid decimal errors. */
export class Money {
  static readonly ZERO = new Money(0);

  readonly paise: number;

  private constructor(paise: number) {
    this.paise = paise;
  }

  static ofPaise(paise: number): Money {
    if (!Number.isSafeInteger(paise) || paise < 0) {
      throw new DomainError("INVALID_MONEY", `Amount must be a non-negative whole number of paise: ${paise}`);
    }
    return new Money(paise);
  }

  add(other: Money): Money {
    return Money.ofPaise(this.paise + other.paise);
  }

  subtract(other: Money): Money {
    return Money.ofPaise(this.paise - other.paise);
  }

  /**
   * Returns part/whole of this amount, rounded to the nearest paisa (halves round up).
   * Examples: hourlyRate.prorate(90, 60) for 90 minutes, amount.prorate(50, 100) for 50%.
   */
  prorate(part: number, whole: number): Money {
    if (!Number.isSafeInteger(part) || part < 0) {
      throw new DomainError("INVALID_MONEY", `Proration part must be a non-negative whole number: ${part}`);
    }
    if (!Number.isSafeInteger(whole) || whole <= 0) {
      throw new DomainError("INVALID_MONEY", `Proration whole must be a positive whole number: ${whole}`);
    }
    return Money.ofPaise(Math.round((this.paise * part) / whole));
  }

  equals(other: Money): boolean {
    return this.paise === other.paise;
  }
}
