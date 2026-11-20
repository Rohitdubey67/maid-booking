import type { Maid } from "../../domain/maid/Maid.js";
import type { Money } from "../../domain/shared/Money.js";
import type { TimeSlot } from "../../domain/shared/TimeSlot.js";
import type { PriceCalculator } from "./PriceCalculator.js";

const MINUTES_PER_HOUR = 60;

/** The maid's hourly rate for the service, charged per minute. */
export class HourlyPricing implements PriceCalculator {
  price(maid: Maid, serviceType: string, slot: TimeSlot): Money {
    return maid.hourlyRateFor(serviceType).portion(slot.durationMinutes, MINUTES_PER_HOUR);
  }
}
