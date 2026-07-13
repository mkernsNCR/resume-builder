import type { Express, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { storage } from "./storage";
import { ApiError } from "./api-error";
import { hashPassword, verifyPassword, type AuthenticatedRequest } from "./auth";
import { env } from "./env";

const BCRYPT_MAX_PASSWORD_BYTES = 72;
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DUMMY_PASSWORD_HASH =
  "$2b$12$ahyZK1czT5JOAY1ib10m4.bK5gDziAHIrJu15BJxhqVI4yyrxjMxG";

function isWithinBcryptLimit(password: string): boolean {
  return Buffer.byteLength(password, "utf8") <= BCRYPT_MAX_PASSWORD_BYTES;
}

function bcryptSafePassword(minLength: number) {
  return z
    .string()
    .min(minLength)
    .refine(isWithinBcryptLimit, {
      message: `Password must not exceed ${BCRYPT_MAX_PASSWORD_BYTES} bytes`,
    });
}

function isUsernameUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const databaseError = error as { code?: unknown; constraint?: unknown };
  return (
    databaseError.code === "23505" &&
    databaseError.constraint === "users_username_unique"
  );
}

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: bcryptSafePassword(8),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: bcryptSafePassword(1),
});

const registerLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: {
    code: "RATE_LIMITED",
    message: "Too many registration attempts, please try again later.",
  },
});

const loginLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: {
    code: "RATE_LIMITED",
    message: "Too many login attempts, please try again later.",
  },
});

async function establishAuthenticatedSession(
  req: AuthenticatedRequest,
  userId: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  req.session.userId = userId;
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", registerLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        throw ApiError.badRequest("Invalid registration data", "VALIDATION_ERROR");
      }

      const { username, password } = result.data;

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        throw ApiError.badRequest("Username already taken", "USERNAME_TAKEN");
      }

      const passwordHash = await hashPassword(password);
      let user;
      try {
        user = await storage.createUser({ username, passwordHash });
      } catch (error) {
        if (isUsernameUniqueViolation(error)) {
          throw ApiError.badRequest("Username already taken", "USERNAME_TAKEN");
        }
        throw error;
      }

      await establishAuthenticatedSession(req as AuthenticatedRequest, user.id);

      res.status(201).json({ id: user.id, username: user.username });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        throw ApiError.badRequest("Invalid login data", "VALIDATION_ERROR");
      }

      const { username, password } = result.data;

      const user = await storage.getUserByUsername(username);
      const valid = await verifyPassword(
        password,
        user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      );
      if (!user || !valid) {
        throw ApiError.badRequest("Invalid username or password", "INVALID_CREDENTIALS");
      }

      await establishAuthenticatedSession(req as AuthenticatedRequest, user.id);

      res.json({ id: user.id, username: user.username });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.session.userId) {
        return res.json(null);
      }

      const user = await storage.getUser(authReq.session.userId);
      if (!user) {
        return res.json(null);
      }

      res.json({ id: user.id, username: user.username });
    } catch (error) {
      next(error);
    }
  });
}
