import { AppError } from "./AppError.js";
import { MS_PER_MINUTE } from "./IstCalendar.js";

/**
 * A start and end time that can't be changed, lasting whole minutes.
 * The end time is not part of the slot, so 9-10 and 10-11 don't overlap.
 */
export class TimeSlot {
  private readonly startMs: number;
  private readonly endMs: number;

  private constructor(startMs: number, endMs: number) {
    this.startMs = startMs;
    this.endMs = endMs;
  }

  static of(start: Date, end: Date): TimeSlot {
    const startMs = start.getTime();
    const endMs = end.getTime();

    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      throw new AppError("INVALID_TIME_SLOT", "Slot start and end must be valid dates");
    }
    if (startMs >= endMs) {
      throw new AppError("INVALID_TIME_SLOT", "Slot start must be before its end");
    }
    if ((endMs - startMs) % MS_PER_MINUTE !== 0) {
      throw new AppError("INVALID_TIME_SLOT", "Slot duration must be a whole number of minutes");
    }
    return new TimeSlot(startMs, endMs);
  }

  static ofDuration(start: Date, durationMinutes: number): TimeSlot {
    return TimeSlot.of(start, new Date(start.getTime() + durationMinutes * MS_PER_MINUTE));
  }

  get start(): Date {
    return new Date(this.startMs);
  }

  get end(): Date {
    return new Date(this.endMs);
  }

  get durationMinutes(): number {
    return (this.endMs - this.startMs) / MS_PER_MINUTE;
  }

  overlaps(other: TimeSlot): boolean {
    return this.startMs < other.endMs && other.startMs < this.endMs;
  }

  contains(other: TimeSlot): boolean {
    return this.startMs <= other.startMs && other.endMs <= this.endMs;
  }

  equals(other: TimeSlot): boolean {
    return this.startMs === other.startMs && this.endMs === other.endMs;
  }
}
