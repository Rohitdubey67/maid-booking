import type { MaidService, OnboardMaidCommand } from "./application/services/MaidService.js";
import type { Maid } from "./domain/maid/Maid.js";

const MONDAY_TO_SATURDAY = [1, 2, 3, 4, 5, 6];
const MONDAY_TO_FRIDAY = [1, 2, 3, 4, 5];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

const hours = (days: number[], startTime: string, endTime: string) =>
  days.map((dayOfWeek) => ({ dayOfWeek, startTime, endTime }));

const SAMPLE_MAIDS: OnboardMaidCommand[] = [
  {
    name: "Asha Kumari",
    gender: "FEMALE",
    locality: "Koramangala",
    services: [
      { serviceType: "cleaning", hourlyRatePaise: 20_000 },
      { serviceType: "dishwashing", hourlyRatePaise: 15_000 },
    ],
    skills: ["deep cleaning"],
    rating: 4.6,
    availability: hours(MONDAY_TO_SATURDAY, "08:00", "20:00"),
  },
  {
    name: "Ravi Kumar",
    gender: "MALE",
    locality: "Koramangala",
    services: [
      { serviceType: "cooking", hourlyRatePaise: 35_000 },
      { serviceType: "cleaning", hourlyRatePaise: 18_000 },
    ],
    skills: ["north indian"],
    rating: 4.2,
    availability: hours(EVERY_DAY, "07:00", "14:00"),
  },
  {
    name: "Meena Devi",
    gender: "FEMALE",
    locality: "Indiranagar",
    services: [{ serviceType: "cooking", hourlyRatePaise: 30_000 }],
    skills: ["south indian"],
    availability: hours(MONDAY_TO_FRIDAY, "09:00", "18:00"),
  },
];

/** Sample maids so the API can be tried straight away. */
export async function addSampleMaids(maidService: MaidService): Promise<Maid[]> {
  const maids: Maid[] = [];
  for (const command of SAMPLE_MAIDS) {
    maids.push(await maidService.onboard(command));
  }
  return maids;
}
