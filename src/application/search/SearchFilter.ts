import type { Gender, Maid } from "../../domain/maid/Maid.js";
import type { Money } from "../../domain/shared/Money.js";
import type { TimeSlot } from "../../domain/shared/TimeSlot.js";

export interface SearchCriteria {
  locality: string;
  serviceType: string;
  slot: TimeSlot;
  minRating?: number;
  maxHourlyRate?: Money;
  skills?: readonly string[];
  gender?: Gender;
}

/**
 * One optional search rule. It must return true when the customer didn't ask for it,
 * so filters can be added or removed without affecting each other.
 */
export interface SearchFilter {
  matches(maid: Maid, criteria: SearchCriteria): boolean;
}
