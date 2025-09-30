import { ResponseType, ErrorResponse } from "../types";

export enum WorkerErrorCode {
  // Model loading errors
  MODEL_LOAD_FAILED = "MODEL_LOAD_FAILED",
  MODEL_NOT_FOUND = "MODEL_NOT_FOUND",
  MODEL_UNSUPPORTED = "MODEL_UNSUPPORTED",

  // Prompt processing errors
  PROMPT_TOO_LONG = "PROMPT_TOO_LONG",
  PROMPT_INVALID = "PROMPT_INVALID",
  GENERATION_FAILED = "GENERATION_FAILED",

  // Token/Cache errors
  MAX_TOTAL_TOKENS_EXCEEDED = "MAX_TOTAL_TOKENS_EXCEEDED",
  MAX_NEW_TOKENS_EXCEEDED = "MAX_NEW_TOKENS_EXCEEDED",
  CACHE_ERROR = "CACHE_ERROR",

  // General errors
  HANDLER_ERROR = "HANDLER_ERROR",
  NO_HANDLER = "NO_HANDLER",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",

  // Resource errors
  OUT_OF_MEMORY = "OUT_OF_MEMORY",
  NETWORK_ERROR = "NETWORK_ERROR",
}

export class WorkerError extends Error {
  public readonly code: WorkerErrorCode;
  public readonly details?: unknown;

  constructor(code: WorkerErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "WorkerError";
    this.code = code;
    this.details = details;
  }

  static fromError(
    error: unknown,
    fallbackCode: WorkerErrorCode = WorkerErrorCode.UNKNOWN_ERROR,
  ): WorkerError {
    if (error instanceof WorkerError) {
      return error;
    }

    if (error instanceof Error) {
      // Try to map common error types to specific codes
      if (error.message.includes("Max token exceeded")) {
        return new WorkerError(
          WorkerErrorCode.MAX_TOTAL_TOKENS_EXCEEDED,
          error.message,
          error,
        );
      }
      if (
        error.message.includes("out of memory") ||
        error.message.includes("OOM")
      ) {
        return new WorkerError(
          WorkerErrorCode.OUT_OF_MEMORY,
          error.message,
          error,
        );
      }
      if (
        error.message.includes("network") ||
        error.message.includes("fetch")
      ) {
        return new WorkerError(
          WorkerErrorCode.NETWORK_ERROR,
          error.message,
          error,
        );
      }

      return new WorkerError(fallbackCode, error.message, error);
    }

    return new WorkerError(fallbackCode, String(error), error);
  }

  toErrorResponse(requestId: string): ErrorResponse {
    return {
      id: requestId,
      type: ResponseType.ERROR,
      error: {
        message: this.message,
        code: this.code,
        details: this.details,
      },
    };
  }
}
