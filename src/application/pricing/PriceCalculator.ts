import type { Maid } from "../../domain/maid/Maid.js";
import type { Money } from "../../domain/shared/Money.js";
import type { TimeSlot } from "../../domain/shared/TimeSlot.js";

export interface PriceCalculator {
  price(maid: Maid, serviceType: string, slot: TimeSlot): Money;
}
