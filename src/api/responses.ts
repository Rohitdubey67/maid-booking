import type { BookingDetails } from "../application/services/BookingService.js";
import type { VisitCancellation, SeriesCancellation } from "../application/services/CancellationService.js";
import type { SearchResult } from "../application/services/SearchService.js";
import type { Visit } from "../domain/booking/Visit.js";
import type { Maid } from "../domain/maid/Maid.js";
import type { Payment } from "../domain/payment/Payment.js";
import { formatTimeOfDay } from "../domain/shared/IstCalendar.js";
import type { TimeSlot } from "../domain/shared/TimeSlot.js";

// Amounts are in paise. Times are UTC, like 2026-12-08T04:30:00.000Z.

export function toMaidResponse(maid: Maid) {
  return {
    id: maid.id,
    name: maid.name,
    gender: maid.gender,
    locality: maid.locality,
    rating: maid.rating,
    skills: maid.skills,
    services: maid.services.map(({ serviceType, hourlyRate }) => ({
      serviceType,
      hourlyRatePaise: hourlyRate.paise,
    })),
    availability: maid.availability.windows.map(({ dayOfWeek, startMinute, endMinute }) => ({
      dayOfWeek,
      startTime: formatTimeOfDay(startMinute),
      endTime: formatTimeOfDay(endMinute),
    })),
  };
}

export function toSearchResultResponse({ maid, price }: SearchResult) {
  return { ...toMaidResponse(maid), pricePaise: price.paise };
}

export function toSlotResponse(slot: TimeSlot) {
  return { startAt: slot.start.toISOString(), endAt: slot.end.toISOString() };
}

function toVisitResponse(visit: Visit) {
  return {
    id: visit.id,
    status: visit.status,
    ...toSlotResponse(visit.slot),
    pricePaise: visit.price.paise,
    paymentDueAt: visit.paymentDueAt.toISOString(),
  };
}

export function toBookingResponse({ booking, visits, status }: BookingDetails) {
  return {
    id: booking.id,
    type: booking.type,
    status,
    customerId: booking.customerId,
    maidId: booking.maidId,
    serviceType: booking.serviceType,
    createdAt: booking.createdAt.toISOString(),
    visits: visits.map(toVisitResponse),
  };
}

export function toPaymentResponse(payment: Payment) {
  return {
    id: payment.id,
    visitId: payment.visitId,
    status: payment.status,
    method: payment.method,
    amountPaise: payment.amount.paise,
    transactionId: payment.transactionId,
    failureReason: payment.failureReason,
    refundAmountPaise: payment.refundAmount?.paise ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

export function toVisitCancellationResponse({ visitId, refundAmount, refundStatus }: VisitCancellation) {
  return { visitId, refundAmountPaise: refundAmount.paise, refundStatus };
}

export function toSeriesCancellationResponse({ bookingId, cancelled, skipped }: SeriesCancellation) {
  return { bookingId, cancelled: cancelled.map(toVisitCancellationResponse), skipped };
}
