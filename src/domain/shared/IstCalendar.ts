import { AppError } from "./AppError.js";

export const MS_PER_MINUTE = 60_000;
export const MINUTES_PER_DAY = 1_440;

const MS_PER_DAY = MINUTES_PER_DAY * MS_PER_MINUTE;
const IST_OFFSET_MS = 330 * MS_PER_MINUTE;
const TIME_OF_DAY = /^(\d{2}):(\d{2})$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Day of week in IST, where 0 is Sunday and 6 is Saturday. */
export function istDayOfWeek(instant: Date): number {
  return new Date(instant.getTime() + IST_OFFSET_MS).getUTCDay();
}

/** The time at the given minute of the same IST day as `instant`. */
export function atIstMinute(instant: Date, minuteOfDay: number): Date {
  const istDayNumber = Math.floor((instant.getTime() + IST_OFFSET_MS) / MS_PER_DAY);
  return new Date(istDayNumber * MS_PER_DAY - IST_OFFSET_MS + minuteOfDay * MS_PER_MINUTE);
}

/** Safe for IST because it has no daylight saving changes. */
export function addDays(instant: Date, days: number): Date {
  return new Date(instant.getTime() + days * MS_PER_DAY);
}

/** Parses "HH:mm" into minutes after midnight. "24:00" means the end of the day. */
export function parseTimeOfDay(value: string): number {
  const match = TIME_OF_DAY.exec(value);
  const hours = Number(match?.[1]);
  const minutes = Number(match?.[2]);
  const total = hours * 60 + minutes;

  if (!match || minutes > 59 || total > MINUTES_PER_DAY) {
    throw new AppError("INVALID_TIME_OF_DAY", `Time must be HH:mm from 00:00 to 24:00: ${value}`);
  }
  return total;
}

export function formatTimeOfDay(minuteOfDay: number): string {
  const hours = String(Math.floor(minuteOfDay / 60)).padStart(2, "0");
  const minutes = String(minuteOfDay % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** Midnight IST at the start of a "YYYY-MM-DD" calendar date. */
export function istDateStart(value: string): Date {
  const date = new Date(`${value}T00:00:00+05:30`);

  if (!ISO_DATE.test(value) || Number.isNaN(date.getTime()) || formatIstDate(date) !== value) {
    throw new AppError("INVALID_DATE", `Date must be a real YYYY-MM-DD date: ${value}`);
  }
  return date;
}

export function formatIstDate(instant: Date): string {
  return new Date(instant.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}
