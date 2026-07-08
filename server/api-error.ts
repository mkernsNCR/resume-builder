export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message = "Bad request", code = "BAD_REQUEST"): ApiError {
    return new ApiError(400, code, message);
  }

  static notFound(message = "Resource not found", code = "NOT_FOUND"): ApiError {
    return new ApiError(404, code, message);
  }

  static internal(message = "Internal server error", code = "INTERNAL_ERROR"): ApiError {
    return new ApiError(500, code, message);
  }
}
