import type { SlotCalendar, SlotReservation } from "../application/interfaces/SlotCalendar.js";
import { SlotTakenError } from "../domain/booking/SlotTakenError.js";
import { AppError } from "../domain/shared/AppError.js";
import type { TimeSlot } from "../domain/shared/TimeSlot.js";

export class InMemorySlotCalendar implements SlotCalendar {
  private readonly reservationsByMaid = new Map<string, readonly SlotReservation[]>();

  /**
   * Contains no `await`, so Node runs the check and the write without letting
   * another request in between. Adding an `await` here would allow double-booking.
   */
  async reserveAll(maidId: string, reservations: readonly SlotReservation[]): Promise<void> {
    const held = this.reservationsFor(maidId);

    assertValidRequest(held, reservations);

    const takenSlots = findTakenSlots(held, reservations);
    if (takenSlots.length > 0) {
      throw new SlotTakenError(maidId, takenSlots);
    }
    this.reservationsByMaid.set(maidId, [...held, ...reservations]);
  }

  async release(maidId: string, visitId: string): Promise<void> {
    const remaining = this.reservationsFor(maidId).filter(
      (reservation) => reservation.visitId !== visitId,
    );
    this.reservationsByMaid.set(maidId, remaining);
  }

  async isFree(maidId: string, slot: TimeSlot): Promise<boolean> {
    return !this.reservationsFor(maidId).some((reservation) => reservation.slot.overlaps(slot));
  }

  private reservationsFor(maidId: string): readonly SlotReservation[] {
    return this.reservationsByMaid.get(maidId) ?? [];
  }
}

function assertValidRequest(
  held: readonly SlotReservation[],
  requested: readonly SlotReservation[],
): void {
  if (requested.length === 0) {
    throw new AppError("INVALID_RESERVATION", "At least one slot must be requested");
  }

  const seenIds = new Set(held.map((reservation) => reservation.visitId));

  for (const { visitId } of requested) {
    if (seenIds.has(visitId)) {
      throw new AppError("INVALID_RESERVATION", `Visit already has a slot: ${visitId}`);
    }
    seenIds.add(visitId);
  }
}

/** Also catches requested slots that overlap each other. */
function findTakenSlots(
  held: readonly SlotReservation[],
  requested: readonly SlotReservation[],
): TimeSlot[] {
  const accepted = [...held];
  const takenSlots: TimeSlot[] = [];

  for (const reservation of requested) {
    if (accepted.some(({ slot }) => slot.overlaps(reservation.slot))) {
      takenSlots.push(reservation.slot);
    } else {
      accepted.push(reservation);
    }
  }
  return takenSlots;
}
