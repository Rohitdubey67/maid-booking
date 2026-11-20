import { AppError } from "../shared/AppError.js";
import { atIstMinute, istDayOfWeek, MINUTES_PER_DAY } from "../shared/IstCalendar.js";
import { TimeSlot } from "../shared/TimeSlot.js";

export interface WeeklyWindowProps {
  /** 0 is Sunday and 6 is Saturday. */
  dayOfWeek: number;
  /** Minutes after midnight IST, so 540 is 9:00. */
  startMinute: number;
  /** Not part of the window. At most 1440, because a window cannot cross midnight. */
  endMinute: number;
}

/** A recurring block of working time on one day of the week, in IST. */
export class WeeklyWindow {
  readonly dayOfWeek: number;
  readonly startMinute: number;
  readonly endMinute: number;

  private constructor({ dayOfWeek, startMinute, endMinute }: WeeklyWindowProps) {
    this.dayOfWeek = dayOfWeek;
    this.startMinute = startMinute;
    this.endMinute = endMinute;
  }

  static of(props: WeeklyWindowProps): WeeklyWindow {
    const { dayOfWeek, startMinute, endMinute } = props;

    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new AppError("INVALID_AVAILABILITY", `Day of week must be from 0 to 6: ${dayOfWeek}`);
    }
    if (!Number.isInteger(startMinute) || !Number.isInteger(endMinute)) {
      throw new AppError("INVALID_AVAILABILITY", "Window times must be whole minutes");
    }
    if (startMinute < 0 || endMinute > MINUTES_PER_DAY || startMinute >= endMinute) {
      throw new AppError("INVALID_AVAILABILITY", "Window must start before it ends, within one day");
    }
    return new WeeklyWindow(props);
  }

  contains(slot: TimeSlot): boolean {
    if (istDayOfWeek(slot.start) !== this.dayOfWeek) {
      return false;
    }
    const windowOnSlotDay = TimeSlot.of(
      atIstMinute(slot.start, this.startMinute),
      atIstMinute(slot.start, this.endMinute),
    );
    return windowOnSlotDay.contains(slot);
  }
}
