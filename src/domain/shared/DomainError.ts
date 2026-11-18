export type DomainErrorCode = "INVALID_MONEY" | "INVALID_TIME_SLOT";

export class DomainError extends Error {
  override readonly name = "DomainError";
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
