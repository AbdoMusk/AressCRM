export type ErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "DB_ERROR"
  | "UNAUTHORIZED";

const STATUS_MAP: Record<ErrorCode, number> = {
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  DB_ERROR: 500,
  UNAUTHORIZED: 401,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_MAP[code];
  }

  toJSON() {
    return { code: this.code, message: this.message };
  }
}

/**
 * Type-safe result wrapper for service methods.
 * Avoids try/catch chains; callers pattern-match on success/error.
 */
export type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
