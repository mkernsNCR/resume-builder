import type { RequestHandler } from "express";
import { ApiError } from "./api-error";

// SameSite cookies alone do not protect login or same-site subdomain requests.
// Non-browser API clients may omit Origin; browsers must match the public origin.
export const requireSameOrigin: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (
    req.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== `${req.protocol}://${req.get("host")}`)
  ) {
    return next(
      new ApiError(
        403,
        "INVALID_ORIGIN",
        "Cross-origin requests are not allowed",
      ),
    );
  }
  next();
};
