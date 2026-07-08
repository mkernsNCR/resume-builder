import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { ApiError } from "./api-error";
import { hashPassword, verifyPassword, type AuthenticatedRequest } from "./auth";

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response, next: NextFunction) => {
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
      const user = await storage.createUser({ username, passwordHash });

      (req as AuthenticatedRequest).session.userId = user.id;

      res.status(201).json({ id: user.id, username: user.username });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        throw ApiError.badRequest("Invalid login data", "VALIDATION_ERROR");
      }

      const { username, password } = result.data;

      const user = await storage.getUserByUsername(username);
      if (!user) {
        throw ApiError.badRequest("Invalid username or password", "INVALID_CREDENTIALS");
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        throw ApiError.badRequest("Invalid username or password", "INVALID_CREDENTIALS");
      }

      (req as AuthenticatedRequest).session.userId = user.id;

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
