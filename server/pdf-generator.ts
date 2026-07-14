import PDFDocument from "pdfkit";
import type { ResumeContent } from "@shared/schema";

const PAGE_WIDTH = 612; // US Letter in points (8.5 * 72)
const PAGE_HEIGHT = 792; // 11 * 72
const MARGIN = 50;

export function generateResumePDF(
  content: ResumeContent,
): InstanceType<typeof PDFDocument> {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
  });

  let y = MARGIN;

  // Full Name
  if (content.fullName) {
    doc.fontSize(22).font("Helvetica-Bold");
    doc.text(content.fullName, MARGIN, y);
    y += 28;
  }

  // Title
  if (content.title) {
    doc.fontSize(13).font("Helvetica");
    doc.fillColor("#555555");
    doc.text(content.title, MARGIN, y);
    y += 18;
  }

  // Contact info
  const contact = content.contact;
  if (contact) {
    const contactParts: string[] = [];
    if (contact.email) contactParts.push(contact.email);
    if (contact.phone) contactParts.push(contact.phone);
    if (contact.location) contactParts.push(contact.location);
    if (contact.linkedin) contactParts.push(contact.linkedin);
    if (contact.website) contactParts.push(contact.website);

    if (contactParts.length > 0) {
      doc.fontSize(9).font("Helvetica");
      doc.fillColor("#777777");
      doc.text(contactParts.join("  |  "), MARGIN, y);
      y += 16;
    }
  }

  doc.fillColor("#000000");

  // Summary
  if (content.summary && content.summary.trim()) {
    y = addSectionHeader(doc, "Professional Summary", y);
    doc.fontSize(10).font("Helvetica");
    const summaryHeight = doc.heightOfString(content.summary, {
      width: PAGE_WIDTH - 2 * MARGIN,
    });
    y = checkPageBreak(doc, y, summaryHeight);
    doc.text(content.summary, MARGIN, y, { width: PAGE_WIDTH - 2 * MARGIN });
    y += summaryHeight + 12;
  }

  // Experience
  if (content.experience && content.experience.length > 0) {
    y = addSectionHeader(doc, "Work Experience", y);
    for (const exp of content.experience) {
      if (exp.company) {
        doc.fontSize(11).font("Helvetica-Bold");
        const expHeader = `${exp.position || ""}${exp.position && exp.company ? " — " : ""}${exp.company}`;
        y = checkPageBreak(doc, y, 14);
        doc.text(expHeader, MARGIN, y);
        y += 14;
      }
      if (exp.startDate || exp.endDate) {
        doc.fontSize(9).font("Helvetica-Oblique");
        doc.fillColor("#777777");
        const dateRange = formatDateRange(exp.startDate, exp.endDate);
        y = checkPageBreak(doc, y, 12);
        doc.text(dateRange, MARGIN, y);
        y += 12;
        doc.fillColor("#000000");
      }
      if (exp.description) {
        doc.fontSize(10).font("Helvetica");
        const descHeight = doc.heightOfString(exp.description, {
          width: PAGE_WIDTH - 2 * MARGIN,
        });
        y = checkPageBreak(doc, y, descHeight);
        doc.text(exp.description, MARGIN, y, {
          width: PAGE_WIDTH - 2 * MARGIN,
        });
        y += descHeight + 4;
      }
      if (exp.highlights && exp.highlights.length > 0) {
        y = renderHighlights(doc, exp.highlights, y);
      }
      y += 8;
    }
  }

  // Education
  if (content.education && content.education.length > 0) {
    y = addSectionHeader(doc, "Education", y);
    for (const edu of content.education) {
      doc.fontSize(11).font("Helvetica-Bold");
      const eduHeader = `${edu.degree || ""}${edu.field ? ` in ${edu.field}` : ""}`;
      y = checkPageBreak(doc, y, 14);
      doc.text(eduHeader, MARGIN, y);
      y += 14;
      if (edu.institution) {
        doc.fontSize(10).font("Helvetica");
        y = checkPageBreak(doc, y, 12);
        doc.text(edu.institution, MARGIN, y);
        y += 12;
      }
      if (edu.startDate || edu.endDate) {
        doc.fontSize(9).font("Helvetica-Oblique");
        doc.fillColor("#777777");
        const dateRange = formatDateRange(edu.startDate, edu.endDate);
        y = checkPageBreak(doc, y, 12);
        doc.text(dateRange, MARGIN, y);
        y += 12;
        doc.fillColor("#000000");
      }
      y += 6;
    }
  }

  // Skills
  if (content.skills && content.skills.length > 0) {
    y = addSectionHeader(doc, "Skills", y);
    doc.fontSize(10).font("Helvetica");
    const skillText = content.skills
      .map((s) => `${s.name}${s.level ? ` (${s.level})` : ""}`)
      .join("  •  ");
    const skillHeight = doc.heightOfString(skillText, {
      width: PAGE_WIDTH - 2 * MARGIN,
    });
    y = checkPageBreak(doc, y, skillHeight);
    doc.text(skillText, MARGIN, y, { width: PAGE_WIDTH - 2 * MARGIN });
    y += skillHeight + 12;
  }

  // Projects
  if (content.projects && content.projects.length > 0) {
    y = addSectionHeader(doc, "Projects", y);
    for (const project of content.projects) {
      if (project.name) {
        doc.fontSize(11).font("Helvetica-Bold");
        y = checkPageBreak(doc, y, 14);
        doc.text(project.name, MARGIN, y);
        y += 14;
      }
      if (project.description) {
        doc.fontSize(10).font("Helvetica");
        const pHeight = doc.heightOfString(project.description, {
          width: PAGE_WIDTH - 2 * MARGIN,
        });
        y = checkPageBreak(doc, y, pHeight);
        doc.text(project.description, MARGIN, y, {
          width: PAGE_WIDTH - 2 * MARGIN,
        });
        y += pHeight + 4;
      }
      if (project.highlights && project.highlights.length > 0) {
        y = renderHighlights(doc, project.highlights, y);
      }
      y += 8;
    }
  }

  return doc;
}

function formatDateRange(startDate?: string, endDate?: string): string {
  if (startDate && endDate) return `${startDate} — ${endDate}`;
  if (startDate) return `${startDate} — Present`;
  return endDate || "";
}

function renderHighlights(
  doc: InstanceType<typeof PDFDocument>,
  highlights: string[],
  y: number,
): number {
  doc.fontSize(10).font("Helvetica");
  for (const highlight of highlights) {
    const bulletText = `• ${highlight}`;
    const highlightHeight = doc.heightOfString(bulletText, {
      width: PAGE_WIDTH - 2 * MARGIN,
    });
    y = checkPageBreak(doc, y, highlightHeight);
    doc.text(bulletText, MARGIN, y, { width: PAGE_WIDTH - 2 * MARGIN });
    y += highlightHeight + 2;
  }
  return y;
}

function addSectionHeader(
  doc: InstanceType<typeof PDFDocument>,
  title: string,
  y: number,
): number {
  y = checkPageBreak(doc, y, 20);
  doc.fontSize(13).font("Helvetica-Bold");
  doc.text(title, MARGIN, y);
  y += 16;
  doc
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .strokeColor("#cccccc")
    .lineWidth(1)
    .stroke();
  y += 8;
  return y;
}

function checkPageBreak(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
  neededHeight: number,
): number {
  if (y + neededHeight > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}
