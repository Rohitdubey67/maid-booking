import { AppError } from "./AppError.js";
import type { AppErrorCode } from "./AppError.js";

export function requireNonBlank(value: string, label: string, code: AppErrorCode): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new AppError(code, `${label} is required`);
  }
  return trimmed;
}
