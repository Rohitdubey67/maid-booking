import { Maid } from "../../domain/maid/Maid.js";
import type { Gender } from "../../domain/maid/Maid.js";
import { WeeklyAvailability } from "../../domain/maid/WeeklyAvailability.js";
import { WeeklyWindow } from "../../domain/maid/WeeklyWindow.js";
import { parseTimeOfDay } from "../../domain/shared/IstCalendar.js";
import { Money } from "../../domain/shared/Money.js";
import type { IdGenerator } from "../interfaces/IdGenerator.js";
import type { MaidRepository } from "../interfaces/Repositories.js";
import { findOrThrow } from "./findOrThrow.js";

export interface OnboardMaidCommand {
  name: string;
  gender: Gender;
  locality: string;
  services: { serviceType: string; hourlyRatePaise: number }[];
  /** Each window uses "HH:mm" in IST. An end of "24:00" means midnight. */
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
  skills?: string[];
  rating?: number | null;
}

interface MaidServiceDeps {
  maids: MaidRepository;
  ids: IdGenerator;
}

export class MaidService {
  private readonly deps: MaidServiceDeps;

  constructor(deps: MaidServiceDeps) {
    this.deps = deps;
  }

  async onboard(command: OnboardMaidCommand): Promise<Maid> {
    const maid = Maid.create({
      id: this.deps.ids.next(),
      name: command.name,
      gender: command.gender,
      locality: command.locality,
      services: command.services.map(({ serviceType, hourlyRatePaise }) => ({
        serviceType,
        hourlyRate: Money.ofPaise(hourlyRatePaise),
      })),
      availability: toAvailability(command.availability),
      skills: command.skills ?? [],
      rating: command.rating ?? null,
    });

    await this.deps.maids.save(maid);
    return maid;
  }

  async get(id: string): Promise<Maid> {
    return findOrThrow(this.deps.maids.findById(id), "Maid", id);
  }
}

function toAvailability(windows: OnboardMaidCommand["availability"]): WeeklyAvailability {
  return WeeklyAvailability.of(
    windows.map(({ dayOfWeek, startTime, endTime }) =>
      WeeklyWindow.of({
        dayOfWeek,
        startMinute: parseTimeOfDay(startTime),
        endMinute: parseTimeOfDay(endTime),
      }),
    ),
  );
}
