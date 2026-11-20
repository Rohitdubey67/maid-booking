import type { PaymentInfo } from "../interfaces/PaymentGateway.js";
import { requireDetail } from "./PaymentMethod.js";
import type { PaymentDetails, PaymentMethod } from "./PaymentMethod.js";

/** Takes a gateway card token, never a raw card number. */
const CARD_TOKEN = /^tok_[A-Za-z0-9_]{1,64}$/;

export class CardPayment implements PaymentMethod {
  readonly method = "CARD";

  toPaymentInfo(details: PaymentDetails): PaymentInfo {
    return { method: this.method, token: requireDetail(details, "cardToken", CARD_TOKEN, this.method) };
  }
}
