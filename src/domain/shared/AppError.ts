export type AppErrorCode =
  | "INVALID_MONEY"
  | "INVALID_TIME_SLOT"
  | "INVALID_TIME_OF_DAY"
  | "INVALID_DATE"
  | "INVALID_AVAILABILITY"
  | "INVALID_MAID"
  | "SERVICE_NOT_OFFERED"
  | "OUTSIDE_WORKING_HOURS"
  | "INVALID_SEARCH"
  | "INVALID_BOOKING"
  | "INVALID_BOOKING_REQUEST"
  | "UNSUPPORTED_BOOKING_TYPE"
  | "INVALID_VISIT"
  | "INVALID_STATUS_CHANGE"
  | "INVALID_RESERVATION"
  | "SLOT_TAKEN"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_NOT_OVERDUE"
  | "VISIT_ALREADY_STARTED"
  | "VISIT_NOT_FINISHED"
  | "INVALID_PAYMENT"
  | "INVALID_REFUND"
  | "UNSUPPORTED_PAYMENT_METHOD"
  | "INVALID_PAYMENT_DETAILS"
  | "KEY_ALREADY_USED"
  | "NOTHING_TO_CANCEL"
  | "INVALID_REFUND_RULES"
  | "NOT_FOUND";

export class AppError extends Error {
  override readonly name = "AppError";
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
