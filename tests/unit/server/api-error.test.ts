import { describe, it, expect } from "vitest";
import { ApiError } from "../../../server/api-error";

describe("ApiError", () => {
  it("creates an instance with correct properties", () => {
    const err = new ApiError(400, "BAD_REQUEST", "Invalid input");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("BAD_REQUEST");
    expect(err.message).toBe("Invalid input");
    expect(err.name).toBe("ApiError");
  });

  it("badRequest() creates a 400 error", () => {
    const err = ApiError.badRequest();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("BAD_REQUEST");
    expect(err.message).toBe("Bad request");
  });

  it("badRequest() accepts custom message and code", () => {
    const err = ApiError.badRequest("Custom message", "CUSTOM_CODE");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("CUSTOM_CODE");
    expect(err.message).toBe("Custom message");
  });

  it("notFound() creates a 404 error", () => {
    const err = ApiError.notFound();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Resource not found");
  });

  it("notFound() accepts custom message and code", () => {
    const err = ApiError.notFound("Resume not found", "RESUME_NOT_FOUND");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("RESUME_NOT_FOUND");
    expect(err.message).toBe("Resume not found");
  });

  it("internal() creates a 500 error", () => {
    const err = ApiError.internal();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("INTERNAL_ERROR");
    expect(err.message).toBe("Internal server error");
  });

  it("can be caught with instanceof in error middleware", () => {
    const err: unknown = ApiError.badRequest("test");
    expect(err instanceof ApiError).toBe(true);
    if (err instanceof ApiError) {
      expect(err.statusCode).toBe(400);
    }
  });
});
