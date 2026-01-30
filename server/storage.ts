import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import {
  resumes,
  users,
  type Resume,
  type InsertResume,
  type User,
  type InsertUser,
  type ResumeContent,
} from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Resume methods
  getAllResumes(): Promise<Resume[]>;
  getResume(id: string): Promise<Resume | undefined>;
  createResume(resume: InsertResume): Promise<Resume>;
  updateResume(id: string, updates: Partial<InsertResume>): Promise<Resume | undefined>;
  deleteResume(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Resume methods
  async getAllResumes(): Promise<Resume[]> {
    return db.select().from(resumes).orderBy(resumes.updatedAt);
  }

  async getResume(id: string): Promise<Resume | undefined> {
    const result = await db.select().from(resumes).where(eq(resumes.id, id));
    return result[0];
  }

  async createResume(resume: InsertResume): Promise<Resume> {
    const result = await db.insert(resumes).values(resume).returning();
    return result[0];
  }

  async updateResume(id: string, updates: Partial<InsertResume>): Promise<Resume | undefined> {
    const result = await db
      .update(resumes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resumes.id, id))
      .returning();
    return result[0];
  }

  async deleteResume(id: string): Promise<boolean> {
    const result = await db.delete(resumes).where(eq(resumes.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();

// Seed data function
export async function seedDatabase() {
  const existingResumes = await storage.getAllResumes();
  
  if (existingResumes.length === 0) {
    const sampleResumes: InsertResume[] = [
      {
        title: "John Smith - Software Engineer",
        template: "modern",
        content: {
          fullName: "John Smith",
          title: "Senior Software Engineer",
          summary: "Passionate software engineer with 8+ years of experience building scalable web applications. Expertise in React, Node.js, and cloud technologies. Strong track record of leading teams and delivering high-impact projects.",
          contact: {
            email: "john.smith@example.com",
            phone: "+1 (555) 123-4567",
            location: "San Francisco, CA",
            linkedin: "linkedin.com/in/johnsmith",
            website: "johnsmith.dev",
          },
          experience: [
            {
              id: "exp-1",
              company: "Tech Corp",
              position: "Senior Software Engineer",
              startDate: "Jan 2021",
              endDate: "",
              current: true,
              description: "Lead developer for the core platform team, responsible for architecture decisions and mentoring junior developers.",
              highlights: [
                "Reduced page load time by 40% through performance optimizations",
                "Designed and implemented microservices architecture serving 1M+ users",
                "Led migration from monolith to microservices, improving deployment frequency by 300%",
              ],
            },
            {
              id: "exp-2",
              company: "StartupXYZ",
              position: "Full Stack Developer",
              startDate: "Jun 2018",
              endDate: "Dec 2020",
              current: false,
              description: "Built and maintained multiple customer-facing applications using React and Node.js.",
              highlights: [
                "Developed real-time collaboration features using WebSocket",
                "Implemented CI/CD pipeline reducing deployment time by 60%",
              ],
            },
          ],
          education: [
            {
              id: "edu-1",
              institution: "University of California, Berkeley",
              degree: "Bachelor of Science",
              field: "Computer Science",
              startDate: "Sep 2014",
              endDate: "May 2018",
              gpa: "3.8/4.0",
            },
          ],
          skills: [
            { id: "skill-1", name: "React", level: "expert" },
            { id: "skill-2", name: "TypeScript", level: "expert" },
            { id: "skill-3", name: "Node.js", level: "advanced" },
            { id: "skill-4", name: "PostgreSQL", level: "advanced" },
            { id: "skill-5", name: "AWS", level: "intermediate" },
            { id: "skill-6", name: "Docker", level: "intermediate" },
          ],
          projects: [
            {
              id: "proj-1",
              name: "Open Source Dashboard",
              description: "A customizable analytics dashboard built with React and D3.js",
              url: "github.com/johnsmith/dashboard",
              highlights: ["500+ GitHub stars", "Used by 50+ companies"],
            },
          ],
        } as ResumeContent,
      },
      {
        title: "Emily Chen - Product Designer",
        template: "creative",
        content: {
          fullName: "Emily Chen",
          title: "Senior Product Designer",
          summary: "Creative product designer with 6 years of experience crafting user-centered digital experiences. Skilled in design systems, user research, and cross-functional collaboration.",
          contact: {
            email: "emily.chen@example.com",
            phone: "+1 (555) 987-6543",
            location: "New York, NY",
            linkedin: "linkedin.com/in/emilychen",
            website: "emilychen.design",
          },
          experience: [
            {
              id: "exp-1",
              company: "Design Studio Inc",
              position: "Senior Product Designer",
              startDate: "Mar 2020",
              endDate: "",
              current: true,
              description: "Lead designer for enterprise SaaS products, managing design systems and user experience strategy.",
              highlights: [
                "Created comprehensive design system used across 5 products",
                "Increased user engagement by 35% through UX improvements",
              ],
            },
          ],
          education: [
            {
              id: "edu-1",
              institution: "Rhode Island School of Design",
              degree: "Master of Fine Arts",
              field: "Graphic Design",
              startDate: "Sep 2016",
              endDate: "May 2018",
            },
          ],
          skills: [
            { id: "skill-1", name: "Figma", level: "expert" },
            { id: "skill-2", name: "User Research", level: "expert" },
            { id: "skill-3", name: "Prototyping", level: "advanced" },
            { id: "skill-4", name: "Design Systems", level: "advanced" },
          ],
          projects: [],
        } as ResumeContent,
      },
      {
        title: "Michael Johnson - Data Scientist",
        template: "minimal",
        content: {
          fullName: "Michael Johnson",
          title: "Data Scientist",
          summary: "Data scientist with expertise in machine learning, statistical modeling, and data visualization. Passionate about turning complex data into actionable insights.",
          contact: {
            email: "michael.johnson@example.com",
            phone: "+1 (555) 456-7890",
            location: "Boston, MA",
            linkedin: "linkedin.com/in/michaeljohnson",
          },
          experience: [
            {
              id: "exp-1",
              company: "Analytics Corp",
              position: "Data Scientist",
              startDate: "Jul 2019",
              endDate: "",
              current: true,
              description: "Develop machine learning models for customer behavior prediction and business optimization.",
              highlights: [
                "Built ML model that increased revenue predictions accuracy by 25%",
                "Automated data pipeline processing 10TB of data daily",
              ],
            },
          ],
          education: [
            {
              id: "edu-1",
              institution: "MIT",
              degree: "Master of Science",
              field: "Data Science",
              startDate: "Sep 2017",
              endDate: "May 2019",
              gpa: "3.9/4.0",
            },
          ],
          skills: [
            { id: "skill-1", name: "Python", level: "expert" },
            { id: "skill-2", name: "Machine Learning", level: "expert" },
            { id: "skill-3", name: "SQL", level: "advanced" },
            { id: "skill-4", name: "TensorFlow", level: "advanced" },
          ],
          projects: [],
        } as ResumeContent,
      },
    ];

    for (const resume of sampleResumes) {
      await storage.createResume(resume);
    }
    
    console.log("Database seeded with sample resumes");
  }
}
