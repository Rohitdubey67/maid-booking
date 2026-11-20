import type { Money } from "../../domain/shared/Money.js";

/** What the gateway needs to charge one payment method, such as a card token or UPI address. */
export interface PaymentInfo {
  method: string;
  token: string;
}

export interface ChargeRequest {
  /** Our payment id, which a real gateway would use to ignore duplicate charges. */
  reference: string;
  amount: Money;
  paymentInfo: PaymentInfo;
}

export type ChargeResult =
  | { status: "SUCCEEDED"; transactionId: string }
  | { status: "FAILED"; reason: string };

export interface RefundRequest {
  reference: string;
  transactionId: string;
  amount: Money;
}

export type RefundResult =
  | { status: "SUCCEEDED"; refundId: string }
  | { status: "FAILED"; reason: string };

/** A third-party payment provider. Implementations may throw when the provider is unreachable. */
export interface PaymentGateway {
  charge(request: ChargeRequest): Promise<ChargeResult>;
  refund(request: RefundRequest): Promise<RefundResult>;
}
