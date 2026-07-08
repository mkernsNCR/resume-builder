import { describe, it, expect } from "vitest";
import { generateResumePDF } from "../../../server/pdf-generator";
import type { ResumeContent } from "../../../shared/schema";

const content: ResumeContent = {
  fullName: "John Doe",
  title: "Senior Software Engineer",
  summary: "Experienced engineer with 10+ years building scalable web apps.",
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
  ],
  education: [
    { id: "ed1", institution: "MIT", degree: "BSc", field: "Computer Science", startDate: "2014" },
  ],
  skills: [
    { id: "s1", name: "React", level: "expert" },
    { id: "s2", name: "TypeScript", level: "expert" },
  ],
  projects: [
    { id: "p1", name: "Dashboard", description: "Analytics dashboard.", highlights: ["500 stars"] },
  ],
};

describe("generateResumePDF", () => {
  it("produces a PDF document with content", async () => {
    const doc = generateResumePDF(content);
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve) => {
      doc.on("end", () => resolve());
    });

    const pdfBuffer = Buffer.concat(chunks);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(pdfBuffer.toString("latin1").startsWith("%PDF")).toBe(true);
  });

  it("produces a valid PDF with empty content", async () => {
    const emptyContent: ResumeContent = {
      fullName: "",
      title: "",
      summary: "",
      contact: { email: "", phone: "", location: "" },
      experience: [],
      education: [],
      skills: [],
      projects: [],
    };
    const doc = generateResumePDF(emptyContent);
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve) => {
      doc.on("end", () => resolve());
    });

    const pdfBuffer = Buffer.concat(chunks);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(pdfBuffer.toString("latin1").startsWith("%PDF")).toBe(true);
  });

  it("produces a larger PDF with more content", async () => {
    const smallDoc = generateResumePDF({
      ...content,
      experience: [],
      education: [],
      skills: [],
      projects: [],
    });
    const fullDoc = generateResumePDF(content);

    const smallChunks: Buffer[] = [];
    const fullChunks: Buffer[] = [];
    smallDoc.on("data", (c: Buffer) => smallChunks.push(c));
    fullDoc.on("data", (c: Buffer) => fullChunks.push(c));

    await Promise.all([
      new Promise<void>((r) => smallDoc.on("end", () => r())),
      new Promise<void>((r) => fullDoc.on("end", () => r())),
    ]);

    const smallSize = Buffer.concat(smallChunks).length;
    const fullSize = Buffer.concat(fullChunks).length;
    expect(fullSize).toBeGreaterThan(smallSize);
  });
});
