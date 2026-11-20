import type { Maid } from "../../domain/maid/Maid.js";
import type { SearchCriteria, SearchFilter } from "./SearchFilter.js";

/** Unrated maids are excluded once a minimum rating is asked for. */
export class MinRatingFilter implements SearchFilter {
  matches(maid: Maid, { minRating }: SearchCriteria): boolean {
    return minRating === undefined || (maid.rating !== null && maid.rating >= minRating);
  }
}

export class MaxHourlyRateFilter implements SearchFilter {
  matches(maid: Maid, { maxHourlyRate, serviceType }: SearchCriteria): boolean {
    return maxHourlyRate === undefined || maid.hourlyRateFor(serviceType).paise <= maxHourlyRate.paise;
  }
}

/** The maid must have every requested skill. */
export class SkillsFilter implements SearchFilter {
  matches(maid: Maid, { skills }: SearchCriteria): boolean {
    return (skills ?? []).every((skill) => maid.hasSkill(skill));
  }
}

export class GenderFilter implements SearchFilter {
  matches(maid: Maid, { gender }: SearchCriteria): boolean {
    return gender === undefined || maid.gender === gender;
  }
}
