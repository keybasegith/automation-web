import type { KeybaseAnswerErrorCode } from "@/lib/keybase-answer/types";

/**
 * The only error type this feature throws across a module boundary.
 *
 * `code` is what the API turns into a status and what analytics records.
 * `publicMessage` is the only string ever sent to a browser — provider
 * messages, stack traces, request ids, and configuration details stay in
 * `cause` and in the server log.
 */
export class KeybaseAnswerError extends Error {
  readonly code: KeybaseAnswerErrorCode;
  readonly publicMessage: string;
  readonly status: number;

  constructor(
    code: KeybaseAnswerErrorCode,
    publicMessage: string,
    options: { status?: number; cause?: unknown; detail?: string } = {},
  ) {
    super(options.detail ?? publicMessage, { cause: options.cause });
    this.name = "KeybaseAnswerError";
    this.code = code;
    this.publicMessage = publicMessage;
    this.status = options.status ?? defaultStatus(code);
  }
}

function defaultStatus(code: KeybaseAnswerErrorCode): number {
  switch (code) {
    case "invalid_request":
    case "question_empty":
    case "question_too_long":
      return 400;
    case "rate_limited":
      return 429;
    case "feature_disabled":
      return 404;
    case "index_unavailable":
    case "provider_unavailable":
    case "provider_failed":
      return 503;
    default:
      return 500;
  }
}

/** Wording shown to a visitor when generation fails for any provider reason. */
export const GENERIC_FAILURE_MESSAGE =
  "Something went wrong while preparing your answer.";

export function toKeybaseAnswerError(err: unknown): KeybaseAnswerError {
  if (err instanceof KeybaseAnswerError) return err;
  return new KeybaseAnswerError("internal", GENERIC_FAILURE_MESSAGE, {
    cause: err,
  });
}
