import { describe, it, expect } from "vitest";
import { generateSuggestions } from "../../../server/content-suggestions";
import type { ResumeContent } from "../../../shared/schema";

const emptyContent: ResumeContent = {
  fullName: "John Doe",
  title: "Software Engineer",
  summary: "",
  contact: { email: "john@example.com", phone: "", location: "" },
  experience: [],
  education: [],
  skills: [],
  projects: [],
};

const fullContent: ResumeContent = {
  fullName: "John Doe",
  title: "Senior Software Engineer",
  summary: "Experienced engineer with 10+ years building scalable web apps.",
  contact: { email: "john@example.com", phone: "", location: "" },
  experience: [
    {
      id: "e1",
      company: "Tech Corp",
      position: "Senior Engineer",
      startDate: "2020",
      description: "Led platform team.",
      highlights: ["Reduced latency 40%", "Scaled to 1M users"],
    },
  ],
  education: [
    { id: "ed1", institution: "MIT", degree: "BSc", field: "CS", startDate: "2014" },
  ],
  skills: [
    { id: "s1", name: "React" },
    { id: "s2", name: "TypeScript", level: "expert" },
  ],
  projects: [
    { id: "p1", name: "Dashboard", description: "", highlights: [] },
  ],
};

describe("generateSuggestions", () => {
  it("suggests a summary for empty content", () => {
    const result = generateSuggestions(emptyContent);
    const summarySuggestion = result.find((s) => s.field === "summary");
    expect(summarySuggestion).toBeDefined();
    expect(summarySuggestion!.suggestedValue.length).toBeGreaterThan(50);
    expect(summarySuggestion!.suggestedValue).not.toContain("years of experience");
  });

  it("suggests expanding short summaries", () => {
    const shortSummary: ResumeContent = { ...fullContent, summary: "Short summary." };
    const result = generateSuggestions(shortSummary);
    const summarySuggestion = result.find((s) => s.field === "summary");
    expect(summarySuggestion).toBeDefined();
    expect(summarySuggestion!.suggestedValue.length).toBeGreaterThan(shortSummary.summary!.length);
  });

  it("suggests adding quantifiable metrics when summary lacks numbers", () => {
    const noNumbers: ResumeContent = { ...fullContent, summary: "Experienced engineer building web applications." };
    const result = generateSuggestions(noNumbers);
    const quantSuggestion = result.find((s) => s.reason.includes("measurable"));
    expect(quantSuggestion).toBeDefined();
    expect(result.filter((s) => s.field === "summary")).toHaveLength(1);
  });

  it("suggests highlights for experience entries without them", () => {
    const noHighlights: ResumeContent = {
      ...fullContent,
      experience: [{ id: "e1", company: "Tech Corp", position: "Engineer", startDate: "2020" }],
    };
    const result = generateSuggestions(noHighlights);
    const highlightSuggestion = result.find((s) => s.field === "highlights-e1");
    expect(highlightSuggestion).toBeDefined();
    expect(highlightSuggestion!.suggestedValue).toContain("Tech Corp");
  });

  it("suggests skill levels for skills without them", () => {
    const result = generateSuggestions(fullContent);
    const skillSuggestion = result.find((s) => s.field === "level-s1");
    expect(skillSuggestion).toBeDefined();
    expect(skillSuggestion!.suggestedValue).toContain("Choose:");
    expect(skillSuggestion!.suggestedValue).not.toBe("expert");
  });

  it("does not suggest skill levels when already set", () => {
    const result = generateSuggestions(fullContent);
    const skillSuggestion = result.find((s) => s.field === "level-s2");
    expect(skillSuggestion).toBeUndefined();
  });

  it("suggests project descriptions for projects without them", () => {
    const result = generateSuggestions(fullContent);
    const projectSuggestion = result.find((s) => s.field === "description-p1");
    expect(projectSuggestion).toBeDefined();
    expect(projectSuggestion!.suggestedValue).toContain("Dashboard");
  });

  it("returns empty suggestions for a perfect resume", () => {
    const perfect: ResumeContent = {
      ...fullContent,
      summary: "Experienced engineer with 10+ years building scalable web apps. Reduced latency by 40% and scaled to 1M users across global markets.",
      skills: [
        { id: "s1", name: "React", level: "expert" },
        { id: "s2", name: "TypeScript", level: "expert" },
      ],
      projects: [
        { id: "p1", name: "Dashboard", description: "Analytics dashboard with real-time data.", highlights: [] },
      ],
    };
    const result = generateSuggestions(perfect);
    expect(result.length).toBe(0);
  });
});
