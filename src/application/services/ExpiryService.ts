import type { Clock } from "../interfaces/Clock.js";
import type { VisitRepository } from "../interfaces/Repositories.js";
import type { SlotCalendar } from "../interfaces/SlotCalendar.js";

interface ExpiryServiceDeps {
  visits: VisitRepository;
  calendar: SlotCalendar;
  clock: Clock;
}

/** Releases slots held by visits that were not paid in time. Meant to run on a timer. */
export class ExpiryService {
  private readonly deps: ExpiryServiceDeps;

  constructor(deps: ExpiryServiceDeps) {
    this.deps = deps;
  }

  /** Returns the ids of the visits it expired. */
  async expireUnpaid(): Promise<string[]> {
    const now = this.deps.clock.now();
    const overdue = await this.deps.visits.findPaymentOverdue(now);
    const expired: string[] = [];

    for (const visit of overdue) {
      // Checked again because a payment may have started since the list was loaded.
      if (!visit.isPaymentOverdue(now)) {
        continue;
      }
      visit.expire(now);
      await this.deps.visits.saveAll([visit]);
      await this.deps.calendar.release(visit.maidId, visit.id);
      expired.push(visit.id);
    }
    return expired;
  }
}
