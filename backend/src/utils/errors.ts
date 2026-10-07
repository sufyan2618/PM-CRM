export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONVERSION_IN_PROGRESS"
  | "DUPLICATE_TRANSCRIPT"
  | "DRAFT_INVALID"
  | "AI_FAILURE"
  | "INTERNAL_ERROR";

export class HttpError extends Error {
  statusCode: number;
  code: ErrorCode;
  details?: unknown;

  constructor(statusCode: number, message: string, code?: ErrorCode, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code ?? mapStatusToCode(statusCode);
    this.details = details;
  }
}

function mapStatusToCode(statusCode: number): ErrorCode {
  switch (statusCode) {
    case 400:
      return "VALIDATION_ERROR";
    case 401:
      return "UNAUTHENTICATED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONVERSION_IN_PROGRESS";
    case 422:
      return "DRAFT_INVALID";
    case 502:
      return "AI_FAILURE";
    default:
      return "INTERNAL_ERROR";
  }
}
