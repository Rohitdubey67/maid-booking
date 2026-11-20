import { AppError } from "../shared/AppError.js";
import type { Money } from "../shared/Money.js";
import { requireNonBlank } from "../shared/requireNonBlank.js";
import type { TimeSlot } from "../shared/TimeSlot.js";
import type { WeeklyAvailability } from "./WeeklyAvailability.js";

export type Gender = "FEMALE" | "MALE" | "OTHER";

export interface ServiceOffering {
  serviceType: string;
  hourlyRate: Money;
}

export interface MaidProps {
  id: string;
  name: string;
  gender: Gender;
  locality: string;
  services: readonly ServiceOffering[];
  availability: WeeklyAvailability;
  skills?: readonly string[];
  /** From 0 to 5. Null means the maid has not been rated yet. */
  rating?: number | null;
}

const MAX_RATING = 5;

export class Maid {
  readonly id: string;
  readonly name: string;
  readonly gender: Gender;
  readonly locality: string;
  readonly availability: WeeklyAvailability;
  readonly rating: number | null;

  private readonly ratesByService: ReadonlyMap<string, Money>;
  private readonly skillSet: ReadonlySet<string>;

  private constructor(props: MaidProps) {
    this.id = requireText(props.id, "Maid id");
    this.name = requireText(props.name, "Maid name");
    this.gender = props.gender;
    this.locality = cleanLabel(props.locality, "Locality");
    this.availability = props.availability;
    this.rating = validateRating(props.rating ?? null);
    this.ratesByService = buildRates(props.services);
    this.skillSet = new Set((props.skills ?? []).map((skill) => cleanLabel(skill, "Skill")));
  }

  static create(props: MaidProps): Maid {
    return new Maid(props);
  }

  get services(): ServiceOffering[] {
    return [...this.ratesByService].map(([serviceType, hourlyRate]) => ({ serviceType, hourlyRate }));
  }

  get skills(): string[] {
    return [...this.skillSet];
  }

  offers(serviceType: string): boolean {
    return this.ratesByService.has(cleanLabel(serviceType, "Service type"));
  }

  hourlyRateFor(serviceType: string): Money {
    const rate = this.ratesByService.get(cleanLabel(serviceType, "Service type"));

    if (!rate) {
      throw new AppError("SERVICE_NOT_OFFERED", `Maid ${this.id} does not offer ${serviceType}`);
    }
    return rate;
  }

  hasSkill(skill: string): boolean {
    return this.skillSet.has(cleanLabel(skill, "Skill"));
  }

  /** Checks regular working hours only. Existing bookings are tracked separately. */
  worksDuring(slot: TimeSlot): boolean {
    return this.availability.covers(slot);
  }
}

function requireText(value: string, label: string): string {
  return requireNonBlank(value, label, "INVALID_MAID");
}

function cleanLabel(value: string, label: string): string {
  return requireText(value, label).toLowerCase();
}

function validateRating(rating: number | null): number | null {
  if (rating !== null && !(rating >= 0 && rating <= MAX_RATING)) {
    throw new AppError("INVALID_MAID", `Rating must be from 0 to ${MAX_RATING}: ${rating}`);
  }
  return rating;
}

function buildRates(services: readonly ServiceOffering[]): ReadonlyMap<string, Money> {
  if (services.length === 0) {
    throw new AppError("INVALID_MAID", "At least one service is required");
  }

  const rates = new Map<string, Money>();

  for (const { serviceType, hourlyRate } of services) {
    const key = cleanLabel(serviceType, "Service type");

    if (rates.has(key)) {
      throw new AppError("INVALID_MAID", `Duplicate service: ${key}`);
    }
    if (hourlyRate.paise === 0) {
      throw new AppError("INVALID_MAID", `Hourly rate must be above zero: ${key}`);
    }
    rates.set(key, hourlyRate);
  }
  return rates;
}
