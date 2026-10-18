import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { ApiError } from "./api-error";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  next,
) => {
  if (res.headersSent) return next(error);

  let failure = error instanceof ApiError ? error : undefined;
  if (error instanceof multer.MulterError) {
    failure = new ApiError(
      error.code === "LIMIT_FILE_SIZE" ? 413 : 400,
      error.code === "LIMIT_FILE_SIZE" ? "FILE_TOO_LARGE" : "INVALID_UPLOAD",
      error.code === "LIMIT_FILE_SIZE"
        ? "File must not exceed 10MB"
        : "Upload exactly one PDF or DOCX file without extra fields",
    );
  }
  if (error && typeof error === "object" && "type" in error) {
    if (error.type === "entity.parse.failed") {
      failure = ApiError.badRequest("Invalid JSON body", "INVALID_JSON");
    } else if (error.type === "entity.too.large") {
      failure = new ApiError(
        413,
        "BODY_TOO_LARGE",
        "Request body must not exceed 1MB",
      );
    }
  }
  if (!failure || failure.statusCode >= 500)
    console.error("Request failed:", error);
  res.status(failure?.statusCode ?? 500).json({
    code: failure?.code ?? "INTERNAL_ERROR",
    message: failure?.message ?? "Internal server error",
  });
};
