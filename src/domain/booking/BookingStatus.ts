import type { Visit } from "./Visit.js";

export type BookingStatus = "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED";

/** Worked out from the visits every time, so it can never disagree with them. */
export function getBookingStatus(visits: readonly Visit[]): BookingStatus {
  if (visits.some((visit) => !visit.isFinal)) {
    return "ACTIVE";
  }
  if (visits.some((visit) => visit.status === "COMPLETED")) {
    return "COMPLETED";
  }
  if (visits.every((visit) => visit.status === "EXPIRED")) {
    return "EXPIRED";
  }
  return "CANCELLED";
}
