import { AppError } from "../shared/AppError.js";
import type { TimeSlot } from "../shared/TimeSlot.js";
import { WeeklyWindow } from "./WeeklyWindow.js";

/**
 * A maid's regular working hours. Overlapping or touching windows are merged,
 * so 9-12 and 12-17 can hold a booking from 11 to 13.
 */
export class WeeklyAvailability {
  readonly windows: readonly WeeklyWindow[];

  private constructor(windows: readonly WeeklyWindow[]) {
    this.windows = windows;
  }

  static of(windows: readonly WeeklyWindow[]): WeeklyAvailability {
    if (windows.length === 0) {
      throw new AppError("INVALID_AVAILABILITY", "At least one availability window is required");
    }
    return new WeeklyAvailability(mergeWindows(windows));
  }

  covers(slot: TimeSlot): boolean {
    return this.windows.some((window) => window.contains(slot));
  }
}

function mergeWindows(windows: readonly WeeklyWindow[]): WeeklyWindow[] {
  const sorted = [...windows].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute,
  );

  return sorted.reduce<WeeklyWindow[]>((merged, window) => {
    const previous = merged.at(-1);

    if (previous?.dayOfWeek !== window.dayOfWeek || previous.endMinute < window.startMinute) {
      return [...merged, window];
    }
    const combined = WeeklyWindow.of({
      dayOfWeek: previous.dayOfWeek,
      startMinute: previous.startMinute,
      endMinute: Math.max(previous.endMinute, window.endMinute),
    });
    return [...merged.slice(0, -1), combined];
  }, []);
}
