import { AppError } from "../shared/AppError.js";
import type { TimeSlot } from "../shared/TimeSlot.js";

export class SlotTakenError extends AppError {
  readonly takenSlots: readonly TimeSlot[];

  constructor(maidId: string, takenSlots: readonly TimeSlot[]) {
    super("SLOT_TAKEN", `Maid ${maidId} is not free for ${takenSlots.length} requested slot(s)`);
    this.takenSlots = takenSlots;
  }
}
