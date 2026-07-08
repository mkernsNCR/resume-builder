import { describe, it, expect } from "vitest";
import { scoreResume } from "../../../server/resume-scoring";
import type { ResumeContent } from "../../../shared/schema";

const emptyContent: ResumeContent = {
  fullName: "",
  title: "",
  summary: "",
  contact: { email: "", phone: "", location: "", linkedin: "", website: "" },
  experience: [],
  education: [],
  skills: [],
  projects: [],
};

const fullContent: ResumeContent = {
  fullName: "John Doe",
  title: "Senior Software Engineer",
  summary: "Passionate engineer with 10+ years building scalable web apps. Expert in React, Node.js, and cloud architecture. Led teams of 15+ engineers.",
  contact: {
    email: "john@example.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/johndoe",
    website: "johndoe.dev",
  },
  experience: [
    {
      id: "e1",
      company: "Tech Corp",
      position: "Senior Engineer",
      startDate: "2020",
      description: "Led platform team.",
      highlights: ["Reduced latency 40%", "Scaled to 1M users"],
    },
    {
      id: "e2",
      company: "StartupXYZ",
      position: "Full Stack Dev",
      startDate: "2018",
      endDate: "2020",
      description: "Built customer apps.",
      highlights: ["Shipped 20+ features", "Improved CI by 60%"],
    },
  ],
  education: [
    { id: "ed1", institution: "UC Berkeley", degree: "BSc", field: "Computer Science", startDate: "2014" },
  ],
  skills: [
    { id: "s1", name: "React", level: "expert" },
    { id: "s2", name: "TypeScript", level: "expert" },
    { id: "s3", name: "Node.js", level: "advanced" },
    { id: "s4", name: "PostgreSQL", level: "advanced" },
    { id: "s5", name: "AWS", level: "intermediate" },
  ],
  projects: [
    { id: "p1", name: "Dashboard", description: "Analytics dashboard", highlights: ["500 stars"] },
  ],
};

describe("scoreResume", () => {
  it("returns a total score of 0 for empty content", () => {
    const result = scoreResume(emptyContent);
    expect(result.total).toBe(0);
    expect(result.sections).toHaveLength(6);
  });

  it("returns a high score for complete content", () => {
    const result = scoreResume(fullContent);
    expect(result.total).toBeGreaterThan(70);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("includes feedback for empty content", () => {
    const result = scoreResume(emptyContent);
    const allFeedback = result.sections.flatMap((s) => s.feedback);
    expect(allFeedback.length).toBeGreaterThan(5);
  });

  it("has 6 sections with correct max scores", () => {
    const result = scoreResume(emptyContent);
    expect(result.sections.map((s) => s.section)).toEqual([
      "Personal Information",
      "Professional Summary",
      "Work Experience",
      "Education",
      "Skills",
      "Projects",
    ]);
    const totalMax = result.sections.reduce((sum, s) => sum + s.maxScore, 0);
    expect(totalMax).toBe(100);
  });

  it("scores personal info correctly with all fields", () => {
    const result = scoreResume(fullContent);
    const personal = result.sections.find((s) => s.section === "Personal Information")!;
    expect(personal.score).toBe(personal.maxScore);
    expect(personal.feedback).toHaveLength(0);
  });

  it("scores summary with length-based scoring", () => {
    const shortContent = { ...fullContent, summary: "Short." };
    const result = scoreResume(shortContent);
    const summary = result.sections.find((s) => s.section === "Professional Summary")!;
    expect(summary.score).toBeLessThan(summary.maxScore);
  });

  it("penalizes missing highlights in experience", () => {
    const noHighlights = {
      ...fullContent,
      experience: fullContent.experience!.map((e) => ({ ...e, highlights: undefined })),
    };
    const result = scoreResume(noHighlights);
    const exp = result.sections.find((s) => s.section === "Work Experience")!;
    expect(exp.score).toBeLessThan(exp.maxScore);
    expect(exp.feedback.some((f) => f.includes("highlights"))).toBe(true);
  });

  it("scores projects as 0 when empty with feedback", () => {
    const result = scoreResume(emptyContent);
    const projects = result.sections.find((s) => s.section === "Projects")!;
    expect(projects.score).toBe(0);
    expect(projects.feedback.length).toBeGreaterThan(0);
  });
});
