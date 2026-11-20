import type { Clock } from "../application/interfaces/Clock.js";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
