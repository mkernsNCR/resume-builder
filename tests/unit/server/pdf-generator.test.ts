import { describe, it, expect } from "vitest";
import { PDFParse } from "pdf-parse";
import { generateResumePDF } from "../../../server/pdf-generator";
import type { ResumeContent, ResumeTemplate } from "../../../shared/schema";

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
    {
      id: "ed1",
      institution: "MIT",
      degree: "BSc",
      field: "Computer Science",
      startDate: "2014",
    },
  ],
  skills: [
    { id: "s1", name: "React", level: "expert" },
    { id: "s2", name: "TypeScript", level: "expert" },
  ],
  projects: [
    {
      id: "p1",
      name: "Dashboard",
      description: "Analytics dashboard.",
      highlights: ["500 stars"],
    },
  ],
};

async function renderPdf(
  resumeContent: ResumeContent,
  template: ResumeTemplate = "modern",
): Promise<Buffer> {
  const doc = generateResumePDF(resumeContent, template);
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.end();
  });
}

async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: pdfBuffer });
  try {
    const result = await parser.getText();
    return result.pages.map((page) => page.text).join("\n");
  } finally {
    await parser.destroy();
  }
}

async function extractPdfPages(pdfBuffer: Buffer): Promise<string[]> {
  const parser = new PDFParse({ data: pdfBuffer });
  try {
    const result = await parser.getText();
    return result.pages.map((page) => page.text);
  } finally {
    await parser.destroy();
  }
}

describe("generateResumePDF", () => {
  it("produces a PDF document with content", async () => {
    const pdfBuffer = await renderPdf(content);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(pdfBuffer.length).toBeLessThan(100_000);
    expect(pdfBuffer.toString("latin1").startsWith("%PDF")).toBe(true);
  });

  it.each<ResumeTemplate>(["modern", "classic", "minimal", "creative"])(
    "renders selectable text with the %s theme",
    async (template) => {
      const pdfText = await extractPdfText(await renderPdf(content, template));
      expect(pdfText).toContain("John Doe");
      expect(pdfText.toLowerCase()).toContain("professional experience");
      expect(pdfText).toContain("Tech Corp");
    },
  );

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
    const pdfBuffer = await renderPdf(emptyContent);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(pdfBuffer.toString("latin1").startsWith("%PDF")).toBe(true);
  });

  it("produces a larger PDF with more content", async () => {
    const smallPdf = renderPdf({
      ...content,
      experience: [],
      education: [],
      skills: [],
      projects: [],
    });
    const fullPdf = renderPdf(content);
    const [smallSize, fullSize] = (await Promise.all([smallPdf, fullPdf])).map(
      (pdf) => pdf.length,
    );
    expect(fullSize).toBeGreaterThan(smallSize);
  });

  it("creates additional pages for overflowing content", async () => {
    const longContent: ResumeContent = {
      ...content,
      experience: [
        {
          ...content.experience![0],
          highlights: Array.from(
            { length: 100 },
            (_, index) => `Achievement ${index + 1}`,
          ),
        },
      ],
    };

    const pages = await extractPdfPages(await renderPdf(longContent));
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every((page) => page.trim().length > 0)).toBe(true);
  });

  it("separates open-ended dates from Present", async () => {
    const pdfText = await extractPdfText(await renderPdf(content));

    expect(pdfText).toContain("2020 - Present");
    expect(pdfText).toContain("2014 - Present");
  });

  it("packs entry-sized content without creating a sparse first page", async () => {
    const denseContent: ResumeContent = {
      ...content,
      experience: Array.from({ length: 7 }, (_, index) => ({
        id: `experience-${index}`,
        company: `Company ${index + 1}`,
        position: "Front-End Engineer",
        startDate: `${2018 + index}`,
        endDate: `${2019 + index}`,
        highlights: [
          "Built accessible React interfaces for complex public workflows.",
          "Improved automated test coverage and release confidence.",
          "Partnered with design and product teams to ship measurable results.",
        ],
      })),
    };

    const pages = await extractPdfPages(
      await renderPdf(denseContent, "classic"),
    );
    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0]).toContain("PROFESSIONAL EXPERIENCE");
    expect(pages[0]).toContain("Company 1");
    expect(pages.every((page) => page.trim().length > 100)).toBe(true);
  });
});
