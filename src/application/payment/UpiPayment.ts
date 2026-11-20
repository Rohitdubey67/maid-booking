import type { PaymentInfo } from "../interfaces/PaymentGateway.js";
import { requireDetail } from "./PaymentMethod.js";
import type { PaymentDetails, PaymentMethod } from "./PaymentMethod.js";

const UPI_ADDRESS = /^[A-Za-z0-9._-]{2,256}@[A-Za-z]{2,64}$/;

export class UpiPayment implements PaymentMethod {
  readonly method = "UPI";

  toPaymentInfo(details: PaymentDetails): PaymentInfo {
    return { method: this.method, token: requireDetail(details, "vpa", UPI_ADDRESS, this.method) };
  }
}
