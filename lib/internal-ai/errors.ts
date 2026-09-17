/**
 * Errors for Internal AI.
 *
 * Every failure the browser can see is one of these. `publicMessage` is what
 * the user reads; anything diagnostic stays in `detail`, which is logged
 * server-side and never serialised into a response.
 */

export type InternalAiErrorCode =
  | "invalid_request"
  | "unauthorized"
  | "disabled"
  | "model_unavailable"
  | "internal_error";

const STATUS_BY_CODE: Record<InternalAiErrorCode, number> = {
  invalid_request: 400,
  unauthorized: 401,
  disabled: 404,
  model_unavailable: 503,
  internal_error: 500,
};

export class InternalAiError extends Error {
  readonly code: InternalAiErrorCode;
  readonly publicMessage: string;
  readonly status: number;
  readonly detail?: string;

  constructor(
    code: InternalAiErrorCode,
    publicMessage: string,
    options: { detail?: string; cause?: unknown } = {}
  ) {
    super(publicMessage, { cause: options.cause });
    this.name = "InternalAiError";
    this.code = code;
    this.publicMessage = publicMessage;
    this.status = STATUS_BY_CODE[code];
    this.detail = options.detail;
  }
}

/** Narrow an unknown throw to an InternalAiError without leaking its message. */
export function toInternalAiError(error: unknown): InternalAiError {
  if (error instanceof InternalAiError) return error;
  return new InternalAiError(
    "internal_error",
    "Something went wrong. Please try again.",
    { cause: error }
  );
}
