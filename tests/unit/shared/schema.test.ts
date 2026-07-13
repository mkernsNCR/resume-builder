import { describe, it, expect } from "vitest";
import {
  insertResumeSchema,
  resumeContentSchema,
  contactInfoSchema,
  workExperienceSchema,
  educationSchema,
  skillSchema,
} from "../../../shared/schema";

describe("schema validation", () => {
  describe("contactInfoSchema", () => {
    it("accepts a valid contact info object", () => {
      const result = contactInfoSchema.safeParse({
        email: "test@example.com",
        phone: "+1 (555) 123-4567",
        location: "San Francisco, CA",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = contactInfoSchema.safeParse({
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("accepts empty string for email", () => {
      const result = contactInfoSchema.safeParse({ email: "" });
      expect(result.success).toBe(true);
    });
  });

  describe("workExperienceSchema", () => {
    it("accepts a valid work experience entry", () => {
      const result = workExperienceSchema.safeParse({
        id: "exp-1",
        company: "Tech Corp",
        position: "Engineer",
        startDate: "Jan 2020",
      });
      expect(result.success).toBe(true);
    });

    it.each(["id", "company", "position", "startDate"] as const)(
      "rejects missing required %s",
      (field) => {
        const validEntry = {
          id: "exp-1",
          company: "Tech Corp",
          position: "Engineer",
          startDate: "Jan 2020",
        };
        const entryWithoutField = Object.fromEntries(
          Object.entries(validEntry).filter(([key]) => key !== field),
        );

        const result = workExperienceSchema.safeParse(entryWithoutField);
        expect(result.success).toBe(false);
      },
    );
  });

  describe("educationSchema", () => {
    it("accepts a valid education entry", () => {
      const result = educationSchema.safeParse({
        id: "edu-1",
        institution: "MIT",
        degree: "BSc",
        startDate: "Sep 2016",
      });
      expect(result.success).toBe(true);
    });

    it.each(["id", "institution", "degree", "startDate"] as const)(
      "rejects missing required %s",
      (field) => {
        const validEntry = {
          id: "edu-1",
          institution: "MIT",
          degree: "BSc",
          startDate: "Sep 2016",
        };
        const entryWithoutField = Object.fromEntries(
          Object.entries(validEntry).filter(([key]) => key !== field),
        );

        const result = educationSchema.safeParse(entryWithoutField);
        expect(result.success).toBe(false);
      },
    );
  });

  describe("skillSchema", () => {
    it("accepts a valid skill with level", () => {
      const result = skillSchema.safeParse({
        id: "skill-1",
        name: "React",
        level: "expert",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a skill without level", () => {
      const result = skillSchema.safeParse({
        id: "skill-1",
        name: "React",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid level enum", () => {
      const result = skillSchema.safeParse({
        id: "skill-1",
        name: "React",
        level: "guru",
      });
      expect(result.success).toBe(false);
    });

    it.each(["id", "name"] as const)(
      "rejects missing required %s",
      (field) => {
        const validEntry = { id: "skill-1", name: "React" };
        const entryWithoutField = Object.fromEntries(
          Object.entries(validEntry).filter(([key]) => key !== field),
        );

        const result = skillSchema.safeParse(entryWithoutField);
        expect(result.success).toBe(false);
      },
    );
  });

  describe("resumeContentSchema", () => {
    it("accepts a full valid resume content", () => {
      const result = resumeContentSchema.safeParse({
        fullName: "John Doe",
        title: "Engineer",
        summary: "Experienced engineer",
        contact: { email: "john@example.com" },
        experience: [{ id: "e1", company: "Corp", position: "Dev", startDate: "2020" }],
        education: [{ id: "ed1", institution: "MIT", degree: "BSc", startDate: "2016" }],
        skills: [{ id: "s1", name: "React" }],
      });
      expect(result.success).toBe(true);
    });

    it("accepts minimal resume content with only fullName", () => {
      const result = resumeContentSchema.safeParse({ fullName: "Jane Doe" });
      expect(result.success).toBe(true);
    });

    it("rejects missing fullName", () => {
      const result = resumeContentSchema.safeParse({ title: "Engineer" });
      expect(result.success).toBe(false);
    });
  });

  describe("insertResumeSchema", () => {
    it("accepts a valid insert with title and content", () => {
      const result = insertResumeSchema.safeParse({
        title: "My Resume",
        content: { fullName: "John Doe" },
      });
      expect(result.success).toBe(true);
    });

    it("accepts with template specified", () => {
      const result = insertResumeSchema.safeParse({
        title: "My Resume",
        template: "classic",
        content: { fullName: "John Doe" },
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing title", () => {
      const result = insertResumeSchema.safeParse({
        content: { fullName: "John Doe" },
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing content", () => {
      const result = insertResumeSchema.safeParse({
        title: "My Resume",
      });
      expect(result.success).toBe(false);
    });
  });
});
