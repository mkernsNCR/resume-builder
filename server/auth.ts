import bcrypt from "bcrypt";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import type { Request, Response, NextFunction } from "express";
import { env } from "./env";
import { storage } from "./storage";
import { ApiError } from "./api-error";
import "./session-types";

const BCRYPT_ROUNDS = 12;

const pgPool = new Pool({ connectionString: env.DATABASE_URL });

const PgSessionStore = connectPgSimple(session);

export const sessionMiddleware = session({
  store: new PgSessionStore({
    pool: pgPool,
    tableName: "user_sessions",
    createTableIfMissing: true,
  }),
  secret: env.NODE_ENV === "test" ? "test-secret" : process.env.SESSION_SECRET || "dev-secret-change-in-production",
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
    return next(ApiError.notFound("Authentication required", "AUTH_REQUIRED"));
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
