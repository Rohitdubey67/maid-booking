import type { BookingRepository } from "../application/interfaces/Repositories.js";
import type { Booking } from "../domain/booking/Booking.js";
import { InMemoryStore } from "./InMemoryStore.js";

export class InMemoryBookingRepository implements BookingRepository {
  private readonly store = new InMemoryStore<Booking>();

  async save(booking: Booking): Promise<void> {
    this.store.save(booking);
  }

  async findById(id: string): Promise<Booking | undefined> {
    return this.store.findById(id);
  }
}
