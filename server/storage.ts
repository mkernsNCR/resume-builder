import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  resumes,
  users,
  type Resume,
  type InsertResume,
  type User,
  type InsertUser,
} from "@shared/schema";
import { env } from "./env";
import { ApiError } from "./api-error";

export type CreateResume = InsertResume & { id?: string };

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Resume methods
  getAllResumes(ownerId: string): Promise<Resume[]>;
  getResume(id: string, ownerId: string): Promise<Resume | undefined>;
  createResume(resume: CreateResume, ownerId: string): Promise<Resume>;
  updateResume(
    id: string,
    updates: Partial<InsertResume>,
    ownerId: string,
  ): Promise<Resume | undefined>;
  deleteResume(id: string, ownerId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Resume methods
  async getAllResumes(ownerId: string): Promise<Resume[]> {
    return db
      .select()
      .from(resumes)
      .where(eq(resumes.ownerId, ownerId))
      .orderBy(desc(resumes.updatedAt));
  }

  async getResume(id: string, ownerId: string): Promise<Resume | undefined> {
    const result = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.ownerId, ownerId)));
    return result[0];
  }

  async createResume(resume: CreateResume, ownerId: string): Promise<Resume> {
    const conflictUpdates = {
      title: resume.title,
      content: resume.content,
      ...(resume.template !== undefined ? { template: resume.template } : {}),
      updatedAt: sql`now()`,
    };

    const result = await db
      .insert(resumes)
      .values({ ...resume, ownerId, template: resume.template ?? "modern" })
      .onConflictDoUpdate({
        target: resumes.id,
        set: conflictUpdates,
        setWhere: eq(resumes.ownerId, ownerId),
      })
      .returning();
    if (!result[0]) {
      throw new ApiError(
        409,
        "RESUME_ID_CONFLICT",
        "Resume ID is already in use",
      );
    }
    return result[0];
  }

  async updateResume(
    id: string,
    updates: Partial<InsertResume>,
    ownerId: string,
  ): Promise<Resume | undefined> {
    const result = await db
      .update(resumes)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(and(eq(resumes.id, id), eq(resumes.ownerId, ownerId)))
      .returning();
    return result[0];
  }

  async deleteResume(id: string, ownerId: string): Promise<boolean> {
    const result = await db
      .delete(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.ownerId, ownerId)))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
