import type { VisitRepository } from "../application/interfaces/Repositories.js";
import type { Visit } from "../domain/booking/Visit.js";
import { InMemoryStore } from "./InMemoryStore.js";

export class InMemoryVisitRepository implements VisitRepository {
  private readonly store = new InMemoryStore<Visit>();

  async saveAll(visits: readonly Visit[]): Promise<void> {
    visits.forEach((visit) => this.store.save(visit));
  }

  async findById(id: string): Promise<Visit | undefined> {
    return this.store.findById(id);
  }

  async findByBookingId(bookingId: string): Promise<Visit[]> {
    return this.store
      .filter((visit) => visit.bookingId === bookingId)
      .sort((a, b) => a.slot.start.getTime() - b.slot.start.getTime());
  }

  async findPaymentOverdue(now: Date): Promise<Visit[]> {
    return this.store.filter((visit) => visit.isPaymentOverdue(now));
  }
}
