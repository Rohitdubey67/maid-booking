import { AppError } from "./AppError.js";

/** Lists, for each status, the statuses it may move to. Final statuses list none. */
export type AllowedStatusChanges<S extends string> = Readonly<Record<S, readonly S[]>>;

export function checkStatusChange<S extends string>(
  table: AllowedStatusChanges<S>,
  from: S,
  to: S,
  subject: string,
): void {
  if (!table[from].includes(to)) {
    throw new AppError("INVALID_STATUS_CHANGE", `${subject} cannot move from ${from} to ${to}`);
  }
}

export function isFinalStatus<S extends string>(table: AllowedStatusChanges<S>, status: S): boolean {
  return table[status].length === 0;
}
