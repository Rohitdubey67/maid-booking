/** Fields every booking type needs. Each type adds its own. */
export interface BookingRequestBase {
  type: string;
  customerId: string;
  maidId: string;
  serviceType: string;
  durationMinutes: number;
}

export interface InstantBookingRequest extends BookingRequestBase {
  type: "INSTANT";
}

export interface ScheduledBookingRequest extends BookingRequestBase {
  type: "SCHEDULED";
  startAt: Date;
}

export interface RecurringBookingRequest extends BookingRequestBase {
  type: "RECURRING";
  /** 0 is Sunday and 6 is Saturday. */
  daysOfWeek: number[];
  /** "HH:mm" in IST. */
  startTime: string;
  /** "YYYY-MM-DD" in IST. Defaults to today. */
  startDate?: string;
  /** "YYYY-MM-DD" in IST, inclusive. */
  endDate: string;
}

export type BookingRequest = InstantBookingRequest | ScheduledBookingRequest | RecurringBookingRequest;
