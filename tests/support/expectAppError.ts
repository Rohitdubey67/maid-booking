import { expect } from "vitest";
import { AppError } from "../../src/domain/shared/AppError.js";
import type { AppErrorCode } from "../../src/domain/shared/AppError.js";

export function expectAppError(code: AppErrorCode, action: () => unknown): void {
  expect(action).toThrow(AppError);
  expect(action).toThrow(expect.objectContaining({ code }));
}

export async function expectRejection(code: AppErrorCode, attempt: Promise<unknown>): Promise<void> {
  const error = await attempt.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ code });
}
