import type { TimeSlot } from "../../domain/shared/TimeSlot.js";

export interface SlotReservation {
  visitId: string;
  slot: TimeSlot;
}

/** Keeps track of which times each maid is already booked for. */
export interface SlotCalendar {
  /**
   * Books every slot, or none of them.
   * Checking and saving must happen in one step, with nothing able to run in between.
   *
   * @throws SlotTakenError when any slot overlaps a held or requested slot.
   * @throws AppError with code INVALID_RESERVATION for an empty or duplicate request.
   */
  reserveAll(maidId: string, reservations: readonly SlotReservation[]): Promise<void>;

  /** Frees a visit's slot. Releasing an unknown visit does nothing. */
  release(maidId: string, visitId: string): Promise<void>;

  isFree(maidId: string, slot: TimeSlot): Promise<boolean>;
}
