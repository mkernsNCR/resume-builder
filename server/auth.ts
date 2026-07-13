import bcrypt from "bcrypt";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Request, Response, NextFunction } from "express";
import { env } from "./env";
import { pool, storage } from "./storage";
import { ApiError } from "./api-error";
import "./session-types";

const BCRYPT_ROUNDS = 12;

const PgSessionStore = connectPgSimple(session);

function getSessionSecret(): string {
  if (env.NODE_ENV === "test") {
    return "test-secret";
  }
  if (!env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required outside tests");
  }
  return env.SESSION_SECRET;
}

export const sessionMiddleware = session({
  store: new PgSessionStore({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: true,
  }),
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
});

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface AuthenticatedRequest extends Request {
  user?: { id: string; username: string };
}

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return next(ApiError.unauthorized("Authentication required", "AUTH_REQUIRED"));
  }
  next();
}

export async function attachUser(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (req.session?.userId) {
    const user = await storage.getUser(req.session.userId);
    if (user) {
      req.user = { id: user.id, username: user.username };
    }
  }
  next();
}
