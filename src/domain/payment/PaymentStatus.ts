import type { AllowedStatusChanges } from "../shared/StatusRules.js";

export type PaymentStatus = "INITIATED" | "SUCCEEDED" | "FAILED" | "REFUND_PENDING" | "REFUNDED";

export const PAYMENT_STATUS_CHANGES: AllowedStatusChanges<PaymentStatus> = {
  INITIATED: ["SUCCEEDED", "FAILED"],
  SUCCEEDED: ["REFUND_PENDING"],
  REFUND_PENDING: ["REFUNDED"],
  FAILED: [],
  REFUNDED: [],
};
