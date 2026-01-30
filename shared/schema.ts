import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Resume templates available
export const RESUME_TEMPLATES = ["modern", "classic", "minimal", "creative"] as const;
export type ResumeTemplate = typeof RESUME_TEMPLATES[number];

// Contact information schema
export const contactInfoSchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  website: z.string().optional(),
});
export type ContactInfo = z.infer<typeof contactInfoSchema>;

// Work experience schema
export const workExperienceSchema = z.object({
  id: z.string(),
  company: z.string(),
  position: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});
export type WorkExperience = z.infer<typeof workExperienceSchema>;

// Education schema
export const educationSchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string(),
  field: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  gpa: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});
export type Education = z.infer<typeof educationSchema>;

// Skill schema
export const skillSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
});
export type Skill = z.infer<typeof skillSchema>;

// Project schema
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  url: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});
export type Project = z.infer<typeof projectSchema>;

// Full resume content schema
export const resumeContentSchema = z.object({
  fullName: z.string(),
  title: z.string().optional(),
  summary: z.string().optional(),
  contact: contactInfoSchema.optional(),
  experience: z.array(workExperienceSchema).optional(),
  education: z.array(educationSchema).optional(),
  skills: z.array(skillSchema).optional(),
  projects: z.array(projectSchema).optional(),
});
export type ResumeContent = z.infer<typeof resumeContentSchema>;

// Database table for resumes
export const resumes = pgTable("resumes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  template: text("template").notNull().default("modern"),
  content: jsonb("content").notNull().$type<ResumeContent>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResumeSchema = createInsertSchema(resumes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResume = z.infer<typeof insertResumeSchema>;
export type Resume = typeof resumes.$inferSelect;

// Users table (keeping for potential future use)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
