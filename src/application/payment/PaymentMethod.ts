import { AppError } from "../../domain/shared/AppError.js";
import type { PaymentInfo } from "../interfaces/PaymentGateway.js";

export type PaymentDetails = Readonly<Record<string, unknown>>;

/** Knows the details one payment method needs, and turns them into what the payment gateway needs. */
export interface PaymentMethod {
  readonly method: string;
  toPaymentInfo(details: PaymentDetails): PaymentInfo;
}

export function requireDetail(details: PaymentDetails, key: string, pattern: RegExp, method: string): string {
  const value = details[key];

  if (typeof value !== "string" || !pattern.test(value)) {
    throw new AppError("INVALID_PAYMENT_DETAILS", `${method} payment needs a valid ${key}`);
  }
  return value;
}
