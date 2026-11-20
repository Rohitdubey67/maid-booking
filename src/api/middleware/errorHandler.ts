import type { ErrorRequestHandler, RequestHandler } from "express";
import Joi from "joi";
import { SlotTakenError } from "../../domain/booking/SlotTakenError.js";
import { AppError } from "../../domain/shared/AppError.js";
import type { AppErrorCode } from "../../domain/shared/AppError.js";
import { toSlotResponse } from "../responses.js";

/** Every code must be listed, so adding a code without an HTTP status fails to compile. */
const STATUS_BY_CODE: Readonly<Record<AppErrorCode, number>> = {
  INVALID_MONEY: 400,
  INVALID_TIME_SLOT: 400,
  INVALID_TIME_OF_DAY: 400,
  INVALID_DATE: 400,
  INVALID_AVAILABILITY: 400,
  INVALID_MAID: 400,
  INVALID_SEARCH: 400,
  INVALID_BOOKING: 400,
  INVALID_BOOKING_REQUEST: 400,
  UNSUPPORTED_BOOKING_TYPE: 400,
  INVALID_VISIT: 400,
  INVALID_RESERVATION: 400,
  INVALID_PAYMENT: 400,
  INVALID_REFUND: 400,
  UNSUPPORTED_PAYMENT_METHOD: 400,
  INVALID_PAYMENT_DETAILS: 400,
  NOT_FOUND: 404,
  INVALID_STATUS_CHANGE: 409,
  SLOT_TAKEN: 409,
  PAYMENT_OVERDUE: 409,
  PAYMENT_NOT_OVERDUE: 409,
  VISIT_ALREADY_STARTED: 409,
  VISIT_NOT_FINISHED: 409,
  KEY_ALREADY_USED: 409,
  NOTHING_TO_CANCEL: 409,
  SERVICE_NOT_OFFERED: 422,
  OUTSIDE_WORKING_HOURS: 422,
  INVALID_REFUND_RULES: 500,
};

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ code: "ROUTE_NOT_FOUND", message: `No route for ${req.method} ${req.path}` });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (Joi.isError(error)) {
    res.status(400).json({
      code: "VALIDATION_ERROR",
      message: error.message,
      issues: error.details.map(({ path, message }) => ({ path: path.join("."), message })),
    });
    return;
  }
  if (error instanceof SlotTakenError) {
    res.status(409).json({ code: error.code, message: error.message, takenSlots: error.takenSlots.map(toSlotResponse) });
    return;
  }
  if (error instanceof AppError) {
    res.status(STATUS_BY_CODE[error.code]).json({ code: error.code, message: error.message });
    return;
  }
  if (isMalformedJson(error)) {
    res.status(400).json({ code: "INVALID_JSON", message: "Request body is not valid JSON" });
    return;
  }

  console.error(error);
  res.status(500).json({ code: "INTERNAL_ERROR", message: "Something went wrong" });
};

function isMalformedJson(error: unknown): boolean {
  return typeof error === "object" && error !== null && "type" in error && error.type === "entity.parse.failed";
}
