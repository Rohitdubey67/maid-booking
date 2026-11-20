import { AppError } from "../domain/shared/AppError.js";
import type { AppErrorCode } from "../domain/shared/AppError.js";

/** Finds an option, like a booking type or payment method, by its name. Ignores case. */
export class Lookup<T> {
  private readonly entries = new Map<string, T>();
  private readonly missingCode: AppErrorCode;
  private readonly label: string;

  constructor(entries: readonly T[], keyOf: (entry: T) => string, missingCode: AppErrorCode, label: string) {
    this.missingCode = missingCode;
    this.label = label;

    for (const entry of entries) {
      const key = keyOf(entry).toUpperCase();
      if (this.entries.has(key)) {
        throw new Error(`Duplicate ${label} registered: ${key}`);
      }
      this.entries.set(key, entry);
    }
  }

  get(key: string): T {
    const entry = this.entries.get(key.trim().toUpperCase());

    if (!entry) {
      const supported = [...this.entries.keys()].join(", ");
      throw new AppError(this.missingCode, `Unsupported ${this.label}: ${key}. Supported: ${supported}`);
    }
    return entry;
  }
}
