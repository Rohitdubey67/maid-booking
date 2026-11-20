import { Booking } from "../../domain/booking/Booking.js";
import { getBookingStatus } from "../../domain/booking/BookingStatus.js";
import type { BookingStatus } from "../../domain/booking/BookingStatus.js";
import { Visit } from "../../domain/booking/Visit.js";
import { paymentDeadlineFor } from "../../domain/booking/paymentDeadline.js";
import type { Maid } from "../../domain/maid/Maid.js";
import { AppError } from "../../domain/shared/AppError.js";
import type { TimeSlot } from "../../domain/shared/TimeSlot.js";
import type { BookingRequestBase } from "../booking/BookingRequest.js";
import type { BookingType } from "../booking/BookingType.js";
import type { Clock } from "../interfaces/Clock.js";
import type { IdGenerator } from "../interfaces/IdGenerator.js";
import type { BookingRepository, MaidRepository, VisitRepository } from "../interfaces/Repositories.js";
import type { SlotCalendar } from "../interfaces/SlotCalendar.js";
import type { PriceCalculator } from "../pricing/PriceCalculator.js";
import type { Lookup } from "../Lookup.js";
import { findOrThrow } from "./findOrThrow.js";

export interface BookingDetails {
  booking: Booking;
  visits: Visit[];
  status: BookingStatus;
}

interface BookingServiceDeps {
  maids: MaidRepository;
  bookings: BookingRepository;
  visits: VisitRepository;
  calendar: SlotCalendar;
  bookingTypes: Lookup<BookingType>;
  pricing: PriceCalculator;
  clock: Clock;
  ids: IdGenerator;
}

export class BookingService {
  private readonly deps: BookingServiceDeps;

  constructor(deps: BookingServiceDeps) {
    this.deps = deps;
  }

  /** Works the same for every booking type once that type has planned the visits. */
  async book(request: BookingRequestBase): Promise<BookingDetails> {
    const bookingType = this.deps.bookingTypes.get(request.type);
    const maid = await findOrThrow(this.deps.maids.findById(request.maidId), "Maid", request.maidId);
    const now = this.deps.clock.now();
    const slots = bookingType.planSlots(request, now);

    assertBookable(maid, request.serviceType, slots);

    const booking = Booking.create({
      id: this.deps.ids.next(),
      customerId: request.customerId,
      maidId: maid.id,
      serviceType: request.serviceType,
      type: bookingType.type,
      createdAt: now,
    });
    const visits = slots.map((slot, index) =>
      Visit.create({
        id: this.deps.ids.next(),
        bookingId: booking.id,
        maidId: maid.id,
        slot,
        price: this.deps.pricing.price(maid, request.serviceType, slot),
        paymentDueAt: paymentDeadlineFor(slot, index, now),
      }),
    );

    await this.deps.calendar.reserveAll(
      maid.id,
      visits.map(({ id, slot }) => ({ visitId: id, slot })),
    );
    await this.persist(booking, visits);

    return { booking, visits, status: getBookingStatus(visits) };
  }

  async getBooking(bookingId: string): Promise<BookingDetails> {
    const booking = await findOrThrow(this.deps.bookings.findById(bookingId), "Booking", bookingId);
    const visits = await this.deps.visits.findByBookingId(bookingId);

    return { booking, visits, status: getBookingStatus(visits) };
  }

  /** Gives the slots back if saving fails, so a failed booking never blocks the maid. */
  private async persist(booking: Booking, visits: readonly Visit[]): Promise<void> {
    try {
      await this.deps.bookings.save(booking);
      await this.deps.visits.saveAll(visits);
    } catch (error) {
      await Promise.all(visits.map(({ maidId, id }) => this.deps.calendar.release(maidId, id)));
      throw error;
    }
  }
}

function assertBookable(maid: Maid, serviceType: string, slots: readonly TimeSlot[]): void {
  if (!maid.offers(serviceType)) {
    throw new AppError("SERVICE_NOT_OFFERED", `Maid ${maid.id} does not offer ${serviceType}`);
  }

  const outsideHours = slots.filter((slot) => !maid.worksDuring(slot));
  const [first] = outsideHours;

  if (first) {
    throw new AppError(
      "OUTSIDE_WORKING_HOURS",
      `${outsideHours.length} visit(s) fall outside maid ${maid.id}'s working hours, first at ${first.start.toISOString()}`,
    );
  }
}
