import type { AllowedStatusChanges } from "../shared/StatusRules.js";

export type VisitStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_IN_PROGRESS"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export const VISIT_STATUS_CHANGES: AllowedStatusChanges<VisitStatus> = {
  PENDING_PAYMENT: ["PAYMENT_IN_PROGRESS", "CANCELLED", "EXPIRED"],
  PAYMENT_IN_PROGRESS: ["CONFIRMED", "PENDING_PAYMENT"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
};
