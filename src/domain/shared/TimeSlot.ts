import { DomainError } from "./DomainError.js";

const MS_PER_MINUTE = 60_000;

/** Immutable half-open time range [start, end), lasting a whole number of minutes. */
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
      throw new DomainError("INVALID_TIME_SLOT", "Slot start and end must be valid dates");
    }
    if (startMs >= endMs) {
      throw new DomainError("INVALID_TIME_SLOT", "Slot start must be before its end");
    }
    if ((endMs - startMs) % MS_PER_MINUTE !== 0) {
      throw new DomainError("INVALID_TIME_SLOT", "Slot duration must be a whole number of minutes");
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
