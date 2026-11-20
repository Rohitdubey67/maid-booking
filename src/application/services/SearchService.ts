import type { Gender, Maid } from "../../domain/maid/Maid.js";
import { AppError } from "../../domain/shared/AppError.js";
import { Money } from "../../domain/shared/Money.js";
import { TimeSlot } from "../../domain/shared/TimeSlot.js";
import type { Clock } from "../interfaces/Clock.js";
import type { MaidRepository } from "../interfaces/Repositories.js";
import type { SlotCalendar } from "../interfaces/SlotCalendar.js";
import type { PriceCalculator } from "../pricing/PriceCalculator.js";
import type { SearchCriteria, SearchFilter } from "../search/SearchFilter.js";

export interface SearchQuery {
  locality: string;
  serviceType: string;
  /** Defaults to now, which finds maids for an instant booking. */
  startAt?: Date;
  durationMinutes: number;
  minRating?: number;
  maxHourlyRatePaise?: number;
  skills?: string[];
  gender?: Gender;
}

export interface SearchResult {
  maid: Maid;
  /** What this slot would cost with this maid. */
  price: Money;
}

interface SearchServiceDeps {
  maids: MaidRepository;
  calendar: SlotCalendar;
  filters: readonly SearchFilter[];
  pricing: PriceCalculator;
  clock: Clock;
}

export class SearchService {
  private readonly deps: SearchServiceDeps;

  constructor(deps: SearchServiceDeps) {
    this.deps = deps;
  }

  /** Returns maids who match every filter and are free for the whole slot, best rated first. */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const criteria = this.toCriteria(query);
    const candidates = await this.deps.maids.findByLocalityAndService(criteria.locality, criteria.serviceType);
    const matching = candidates.filter((maid) => this.deps.filters.every((filter) => filter.matches(maid, criteria)));
    const available = await Promise.all(matching.map((maid) => this.isAvailable(maid, criteria.slot)));

    return matching
      .filter((_, index) => available[index])
      .map((maid) => ({ maid, price: this.deps.pricing.price(maid, criteria.serviceType, criteria.slot) }))
      .sort(byRatingThenPrice);
  }

  private toCriteria(query: SearchQuery): SearchCriteria {
    const now = this.deps.clock.now();
    const startAt = query.startAt ?? now;

    if (startAt < now) {
      throw new AppError("INVALID_SEARCH", "Search start cannot be in the past");
    }
    return {
      locality: query.locality,
      serviceType: query.serviceType,
      slot: TimeSlot.ofDuration(startAt, query.durationMinutes),
      minRating: query.minRating,
      maxHourlyRate: query.maxHourlyRatePaise === undefined ? undefined : Money.ofPaise(query.maxHourlyRatePaise),
      skills: query.skills,
      gender: query.gender,
    };
  }

  /** Always checked, so it is not one of the optional filters. */
  private async isAvailable(maid: Maid, slot: TimeSlot): Promise<boolean> {
    return maid.worksDuring(slot) && (await this.deps.calendar.isFree(maid.id, slot));
  }
}

function byRatingThenPrice(a: SearchResult, b: SearchResult): number {
  const UNRATED = -1;

  return (
    (b.maid.rating ?? UNRATED) - (a.maid.rating ?? UNRATED) ||
    a.price.paise - b.price.paise ||
    a.maid.id.localeCompare(b.maid.id)
  );
}
