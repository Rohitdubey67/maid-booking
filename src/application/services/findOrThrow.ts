import { AppError } from "../../domain/shared/AppError.js";

export async function findOrThrow<T>(lookup: Promise<T | undefined>, label: string, id: string): Promise<T> {
  const found = await lookup;

  if (found === undefined) {
    throw new AppError("NOT_FOUND", `${label} not found: ${id}`);
  }
  return found;
}
