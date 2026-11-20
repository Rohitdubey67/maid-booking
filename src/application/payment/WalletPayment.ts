import type { PaymentInfo } from "../interfaces/PaymentGateway.js";
import { requireDetail } from "./PaymentMethod.js";
import type { PaymentDetails, PaymentMethod } from "./PaymentMethod.js";

const WALLET_ID = /^[A-Za-z0-9_-]{3,64}$/;

export class WalletPayment implements PaymentMethod {
  readonly method = "WALLET";

  toPaymentInfo(details: PaymentDetails): PaymentInfo {
    return { method: this.method, token: requireDetail(details, "walletId", WALLET_ID, this.method) };
  }
}
