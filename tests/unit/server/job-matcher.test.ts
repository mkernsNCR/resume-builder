import { describe, it, expect } from "vitest";
import { matchJobDescription } from "../../../server/job-matcher";
import type { ResumeContent } from "../../../shared/schema";

const content: ResumeContent = {
  fullName: "John Doe",
  title: "Senior Software Engineer",
  summary: "Experienced engineer specializing in React, TypeScript, and Node.js.",
  contact: { email: "john@example.com", phone: "", location: "" },
  experience: [
    {
      id: "e1",
      company: "Tech Corp",
      position: "Senior Engineer",
      startDate: "2020",
      description: "Built scalable web applications using React and Node.js.",
      highlights: ["Reduced latency 40%"],
    },
  ],
  education: [
    { id: "ed1", institution: "MIT", degree: "BSc", field: "Computer Science", startDate: "2014" },
  ],
  skills: [
    { id: "s1", name: "React" },
    { id: "s2", name: "TypeScript" },
    { id: "s3", name: "Node.js" },
    { id: "s4", name: "PostgreSQL" },
    { id: "s5", name: "AWS" },
  ],
  projects: [],
};

describe("matchJobDescription", () => {
  it("returns 0 score for empty job description", () => {
    const result = matchJobDescription(content, "");
    expect(result.matchScore).toBe(0);
  });

  it("returns high score when resume matches most keywords", () => {
    const jobDesc = "Looking for a Senior Software Engineer with React, TypeScript, and Node.js experience.";
    const result = matchJobDescription(content, jobDesc);
    expect(result.matchScore).toBeGreaterThan(50);
    expect(result.matchedKeywords).toContain("react");
    expect(result.matchedKeywords).toContain("typescript");
    expect(result.matchedKeywords).toContain("node");
  });

  it("returns missing keywords not found in resume", () => {
    const jobDesc = "Looking for a Senior Software Engineer with React, Kubernetes, and Python experience.";
    const result = matchJobDescription(content, jobDesc);
    expect(result.missingKeywords).toContain("kubernetes");
    expect(result.missingKeywords).toContain("python");
    expect(result.matchedKeywords).toContain("react");
  });

  it("includes suggestions based on match quality", () => {
    const jobDesc = "Looking for a Senior Software Engineer with React, TypeScript, and Node.js experience.";
    const result = matchJobDescription(content, jobDesc);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("suggests adding more skills when fewer than 5", () => {
    const sparseContent: ResumeContent = {
      ...content,
      skills: [{ id: "s1", name: "React" }],
    };
    const result = matchJobDescription(sparseContent, "React developer needed");
    expect(result.suggestions.some((s) => s.includes("skills"))).toBe(true);
  });

  it("suggests adding summary when missing or too short", () => {
    const noSummary: ResumeContent = { ...content, summary: "" };
    const result = matchJobDescription(noSummary, "React developer needed");
    expect(result.suggestions.some((s) => s.includes("summary"))).toBe(true);
  });

  it("filters stop words from keyword matching", () => {
    const jobDesc = "We are looking for a senior engineer with React experience and the ability to work in a team.";
    const result = matchJobDescription(content, jobDesc);
    expect(result.matchedKeywords).not.toContain("the");
    expect(result.matchedKeywords).not.toContain("are");
    expect(result.matchedKeywords).not.toContain("and");
  });

  it("extracts keywords from experience descriptions and highlights", () => {
    const jobDesc = "Need someone who reduced latency in web applications.";
    const result = matchJobDescription(content, jobDesc);
    expect(result.matchedKeywords).toContain("latency");
    expect(result.matchedKeywords).toContain("web");
    expect(result.matchedKeywords).toContain("applications");
  });
});
