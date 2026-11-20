import type {
  ChargeRequest,
  ChargeResult,
  PaymentGateway,
  RefundRequest,
  RefundResult,
} from "../application/interfaces/PaymentGateway.js";

/** Stands in for a real provider. Any token containing "fail", such as fail@upi, is declined. */
export class MockPaymentGateway implements PaymentGateway {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    if (request.paymentInfo.token.includes("fail")) {
      return { status: "FAILED", reason: "Declined by mock gateway" };
    }
    return { status: "SUCCEEDED", transactionId: `txn_${request.reference}` };
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    return { status: "SUCCEEDED", refundId: `rfnd_${request.reference}` };
  }
}
