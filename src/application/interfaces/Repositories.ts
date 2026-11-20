import type { Booking } from "../../domain/booking/Booking.js";
import type { Visit } from "../../domain/booking/Visit.js";
import type { Maid } from "../../domain/maid/Maid.js";
import type { Payment } from "../../domain/payment/Payment.js";

export interface MaidRepository {
  save(maid: Maid): Promise<void>;
  findById(id: string): Promise<Maid | undefined>;
  /** Matching ignores case and surrounding spaces. */
  findByLocalityAndService(locality: string, serviceType: string): Promise<Maid[]>;
}

export interface BookingRepository {
  save(booking: Booking): Promise<void>;
  findById(id: string): Promise<Booking | undefined>;
}

export interface VisitRepository {
  saveAll(visits: readonly Visit[]): Promise<void>;
  findById(id: string): Promise<Visit | undefined>;
  /** Sorted by start time. */
  findByBookingId(bookingId: string): Promise<Visit[]>;
  findPaymentOverdue(now: Date): Promise<Visit[]>;
}

export interface PaymentRepository {
  save(payment: Payment): Promise<void>;
  findByRequestKey(key: string): Promise<Payment | undefined>;
  /** The successful payment for a visit, which is the one a cancellation refunds. */
  findSucceededByVisitId(visitId: string): Promise<Payment | undefined>;
}
