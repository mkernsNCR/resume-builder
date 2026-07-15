import PDFDocument from "pdfkit";
import type {
  Education,
  Project,
  ResumeContent,
  ResumeTemplate,
  WorkExperience,
} from "@shared/schema";

type PdfDoc = InstanceType<typeof PDFDocument>;

type PdfTheme = {
  bodyFont: string;
  boldFont: string;
  italicFont: string;
  nameFont: string;
  accent: string;
  text: string;
  muted: string;
  rule: string;
  nameAlign: "left" | "center";
  headerRule: "full" | "short" | "none";
  uppercaseSections: boolean;
};

type RenderState = {
  doc: PdfDoc;
  theme: PdfTheme;
  y: number;
  pageIndex: number;
  plannedPageCount: number;
  targetPageHeight: number;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const CONTENT_BOTTOM = PAGE_HEIGHT - 54;
const FULL_PAGE_CONTENT_HEIGHT = CONTENT_BOTTOM - MARGIN;
const DATE_WIDTH = 112;
const DATE_GAP = 14;
const ENTRY_WIDTH = CONTENT_WIDTH - DATE_WIDTH - DATE_GAP;
const SECTION_HEADER_HEIGHT = 27;
const ENTRY_GAP = 10;

const THEMES: Record<ResumeTemplate, PdfTheme> = {
  modern: {
    bodyFont: "Helvetica",
    boldFont: "Helvetica-Bold",
    italicFont: "Helvetica-Oblique",
    nameFont: "Helvetica-Bold",
    accent: "#1D4ED8",
    text: "#172033",
    muted: "#526077",
    rule: "#CBD5E1",
    nameAlign: "left",
    headerRule: "short",
    uppercaseSections: false,
  },
  classic: {
    bodyFont: "Times-Roman",
    boldFont: "Times-Bold",
    italicFont: "Times-Italic",
    nameFont: "Times-Bold",
    accent: "#273449",
    text: "#202938",
    muted: "#536071",
    rule: "#C8CED8",
    nameAlign: "center",
    headerRule: "full",
    uppercaseSections: true,
  },
  minimal: {
    bodyFont: "Helvetica",
    boldFont: "Helvetica-Bold",
    italicFont: "Helvetica-Oblique",
    nameFont: "Helvetica",
    accent: "#475569",
    text: "#1F2937",
    muted: "#64748B",
    rule: "#E2E8F0",
    nameAlign: "left",
    headerRule: "none",
    uppercaseSections: true,
  },
  creative: {
    bodyFont: "Helvetica",
    boldFont: "Helvetica-Bold",
    italicFont: "Helvetica-Oblique",
    nameFont: "Helvetica-Bold",
    accent: "#047857",
    text: "#16221F",
    muted: "#52645F",
    rule: "#A7D6C4",
    nameAlign: "left",
    headerRule: "short",
    uppercaseSections: false,
  },
};

export function generateResumePDF(
  content: ResumeContent,
  template: ResumeTemplate | string = "modern",
): PdfDoc {
  const theme = THEMES[template as ResumeTemplate] ?? THEMES.modern;
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: MARGIN, bottom: 54, left: MARGIN, right: MARGIN },
    bufferPages: true,
    info: {
      Title: `${content.fullName || "Resume"} - Resume`,
      Author: content.fullName || "Resume Builder",
      Creator: "Resume Builder",
    },
  });
  const state: RenderState = {
    doc,
    theme,
    y: MARGIN,
    pageIndex: 0,
    plannedPageCount: 1,
    targetPageHeight: FULL_PAGE_CONTENT_HEIGHT,
  };
  const estimatedHeight = estimateDocumentHeight(state, content);
  state.plannedPageCount = Math.max(
    1,
    Math.ceil(estimatedHeight / FULL_PAGE_CONTENT_HEIGHT),
  );
  state.targetPageHeight = Math.min(
    FULL_PAGE_CONTENT_HEIGHT,
    Math.max(
      FULL_PAGE_CONTENT_HEIGHT * 0.72,
      (estimatedHeight / state.plannedPageCount) * 1.08,
    ),
  );

  renderHeader(state, content);
  renderSummary(state, content);
  renderExperience(state, content.experience ?? []);
  renderEducation(state, content.education ?? []);
  renderSkills(state, content);
  renderProjects(state, content.projects ?? []);
  addPageNumbers(doc, theme);

  return doc;
}

function renderHeader(state: RenderState, content: ResumeContent): void {
  const { doc, theme } = state;
  const name = content.fullName.trim() || "Resume";

  doc
    .font(theme.nameFont)
    .fontSize(24)
    .fillColor(theme.text)
    .text(name, MARGIN, state.y, {
      width: CONTENT_WIDTH,
      align: theme.nameAlign,
      characterSpacing: theme.nameAlign === "center" ? 0.8 : 0,
    });
  state.y += doc.heightOfString(name, { width: CONTENT_WIDTH }) + 3;

  if (content.title?.trim()) {
    const title = content.title.trim();
    doc
      .font(theme.italicFont)
      .fontSize(12)
      .fillColor(theme.accent)
      .text(title, MARGIN, state.y, {
        width: CONTENT_WIDTH,
        align: theme.nameAlign,
      });
    state.y += doc.heightOfString(title, { width: CONTENT_WIDTH }) + 7;
  }

  const contactParts = [
    content.contact?.email,
    content.contact?.phone,
    content.contact?.location,
    content.contact?.linkedin,
    content.contact?.website,
  ].filter((value): value is string => Boolean(value?.trim()));

  if (contactParts.length > 0) {
    const contactText = contactParts.join("  |  ");
    doc
      .font(theme.bodyFont)
      .fontSize(8.5)
      .fillColor(theme.muted)
      .text(contactText, MARGIN, state.y, {
        width: CONTENT_WIDTH,
        align: theme.nameAlign,
        lineGap: 1,
      });
    state.y +=
      doc.heightOfString(contactText, { width: CONTENT_WIDTH, lineGap: 1 }) +
      10;
  } else {
    state.y += 3;
  }

  if (theme.headerRule !== "none") {
    const lineWidth = theme.headerRule === "full" ? CONTENT_WIDTH : 72;
    const lineX =
      theme.nameAlign === "center"
        ? MARGIN + (CONTENT_WIDTH - lineWidth) / 2
        : MARGIN;
    doc
      .moveTo(lineX, state.y)
      .lineTo(lineX + lineWidth, state.y)
      .strokeColor(theme.accent)
      .lineWidth(theme.headerRule === "full" ? 1.2 : 2.4)
      .stroke();
    state.y += 15;
  } else {
    state.y += 8;
  }
}

function renderSummary(state: RenderState, content: ResumeContent): void {
  const summary = content.summary?.trim();
  if (!summary) return;

  const summaryHeight = measureText(
    state.doc,
    summary,
    state.theme.bodyFont,
    9.5,
    CONTENT_WIDTH,
    2,
  );
  renderSectionHeader(state, "Professional Summary", summaryHeight);
  renderParagraph(state, summary, 9.5);
  state.y += 9;
}

function renderExperience(
  state: RenderState,
  experiences: WorkExperience[],
): void {
  if (experiences.length === 0) return;

  const firstHeight = measureExperience(state, experiences[0]);
  renderSectionHeader(state, "Professional Experience", firstHeight);

  experiences.forEach((experience) => {
    const entryHeight = measureExperience(state, experience);
    keepBlockTogether(state, entryHeight);
    renderDatedHeading(
      state,
      experience.position || experience.company || "Experience",
      formatDateRange(
        experience.startDate,
        experience.current ? undefined : experience.endDate,
        experience.current,
      ),
    );

    if (experience.position && experience.company) {
      renderSubheading(state, experience.company);
    }
    if (experience.description?.trim()) {
      renderParagraph(state, experience.description.trim(), 9.25);
      state.y += 3;
    }
    renderHighlights(state, experience.highlights ?? []);
    state.y += ENTRY_GAP;
  });
}

function renderEducation(state: RenderState, education: Education[]): void {
  if (education.length === 0) return;

  const firstHeight = measureEducation(state, education[0]);
  renderSectionHeader(state, "Education", firstHeight);

  education.forEach((item) => {
    const entryHeight = measureEducation(state, item);
    keepBlockTogether(state, entryHeight);
    const heading = item.degree || item.institution || "Education";
    renderDatedHeading(
      state,
      heading,
      formatDateRange(item.startDate, item.endDate),
    );
    if (item.degree && item.institution) {
      renderSubheading(state, item.institution);
    }
    if (item.field?.trim()) {
      renderParagraph(state, item.field.trim(), 9.25, state.theme.muted);
    }
    if (item.gpa?.trim()) {
      renderParagraph(
        state,
        `GPA: ${item.gpa.trim()}`,
        8.75,
        state.theme.muted,
      );
    }
    renderHighlights(state, item.highlights ?? []);
    state.y += ENTRY_GAP;
  });
}

function renderSkills(state: RenderState, content: ResumeContent): void {
  const skills = (content.skills ?? [])
    .map((skill) => skill.name.trim())
    .filter(Boolean);
  if (skills.length === 0) return;

  const skillText = skills.join("  •  ");
  const skillHeight = measureText(
    state.doc,
    skillText,
    state.theme.bodyFont,
    9.25,
    CONTENT_WIDTH,
    2,
  );
  renderSectionHeader(state, "Skills", skillHeight);
  renderParagraph(state, skillText, 9.25);
  state.y += 9;
}

function renderProjects(state: RenderState, projects: Project[]): void {
  if (projects.length === 0) return;

  const firstHeight = measureProject(state, projects[0]);
  renderSectionHeader(state, "Projects", firstHeight);

  projects.forEach((project) => {
    const entryHeight = measureProject(state, project);
    keepBlockTogether(state, entryHeight);
    renderDatedHeading(state, project.name || "Project", project.url ?? "");
    if (project.description?.trim()) {
      renderParagraph(state, project.description.trim(), 9.25);
      state.y += 3;
    }
    renderHighlights(state, project.highlights ?? []);
    state.y += ENTRY_GAP;
  });
}

function renderSectionHeader(
  state: RenderState,
  title: string,
  firstBlockHeight: number,
): void {
  const keepHeight =
    firstBlockHeight <= FULL_PAGE_CONTENT_HEIGHT
      ? firstBlockHeight
      : Math.min(firstBlockHeight, 72);
  keepBlockTogether(state, SECTION_HEADER_HEIGHT + keepHeight);

  const label = state.theme.uppercaseSections ? title.toUpperCase() : title;
  state.doc
    .font(state.theme.boldFont)
    .fontSize(11)
    .fillColor(state.theme.accent)
    .text(label, MARGIN, state.y, {
      width: CONTENT_WIDTH,
      characterSpacing: state.theme.uppercaseSections ? 0.9 : 0,
    });
  state.y += 15;
  state.doc
    .moveTo(MARGIN, state.y)
    .lineTo(PAGE_WIDTH - MARGIN, state.y)
    .strokeColor(state.theme.rule)
    .lineWidth(0.8)
    .stroke();
  state.y += 10;
}

function renderDatedHeading(
  state: RenderState,
  heading: string,
  date: string,
): void {
  const headingWidth = date ? ENTRY_WIDTH : CONTENT_WIDTH;
  const headingHeight = measureText(
    state.doc,
    heading,
    state.theme.boldFont,
    10.5,
    headingWidth,
    0,
  );
  const dateHeight = date
    ? measureText(state.doc, date, state.theme.italicFont, 8.75, DATE_WIDTH, 0)
    : 0;
  const rowHeight = Math.max(headingHeight, dateHeight);
  ensureSpace(state, rowHeight);

  state.doc
    .font(state.theme.boldFont)
    .fontSize(10.5)
    .fillColor(state.theme.text)
    .text(heading, MARGIN, state.y, { width: headingWidth, lineGap: 0 });
  if (date) {
    state.doc
      .font(state.theme.italicFont)
      .fontSize(8.75)
      .fillColor(state.theme.muted)
      .text(date, MARGIN + ENTRY_WIDTH + DATE_GAP, state.y, {
        width: DATE_WIDTH,
        align: "right",
        lineGap: 0,
      });
  }
  state.y += rowHeight + 2;
}

function renderSubheading(state: RenderState, text: string): void {
  const height = measureText(
    state.doc,
    text,
    state.theme.italicFont,
    9.25,
    CONTENT_WIDTH,
    0,
  );
  ensureSpace(state, height);
  state.doc
    .font(state.theme.italicFont)
    .fontSize(9.25)
    .fillColor(state.theme.accent)
    .text(text, MARGIN, state.y, { width: CONTENT_WIDTH, lineGap: 0 });
  state.y += height + 3;
}

function renderParagraph(
  state: RenderState,
  text: string,
  size: number,
  color = state.theme.text,
): void {
  const height = measureText(
    state.doc,
    text,
    state.theme.bodyFont,
    size,
    CONTENT_WIDTH,
    2,
  );
  ensureSpace(state, Math.min(height, FULL_PAGE_CONTENT_HEIGHT));
  state.doc
    .font(state.theme.bodyFont)
    .fontSize(size)
    .fillColor(color)
    .text(text, MARGIN, state.y, {
      width: CONTENT_WIDTH,
      lineGap: 2,
      align: "left",
    });
  syncRenderState(state);
}

function renderHighlights(state: RenderState, highlights: string[]): void {
  highlights
    .map((highlight) => highlight.trim())
    .filter(Boolean)
    .forEach((highlight) => {
      const textWidth = CONTENT_WIDTH - 14;
      const height = measureText(
        state.doc,
        highlight,
        state.theme.bodyFont,
        9.1,
        textWidth,
        1.5,
      );
      ensureSpace(state, height + 2);
      state.doc
        .font(state.theme.boldFont)
        .fontSize(9)
        .fillColor(state.theme.accent)
        .text("•", MARGIN, state.y, { width: 10, lineBreak: false });
      state.doc
        .font(state.theme.bodyFont)
        .fontSize(9.1)
        .fillColor(state.theme.text)
        .text(highlight, MARGIN + 14, state.y, {
          width: textWidth,
          lineGap: 1.5,
        });
      syncRenderState(state);
      state.y += 2;
    });
}

function measureExperience(
  state: RenderState,
  experience: WorkExperience,
): number {
  const heading = experience.position || experience.company || "Experience";
  let height = measureDatedHeading(
    state,
    heading,
    formatDateRange(
      experience.startDate,
      experience.current ? undefined : experience.endDate,
      experience.current,
    ),
  );
  if (experience.position && experience.company) {
    height +=
      measureText(
        state.doc,
        experience.company,
        state.theme.italicFont,
        9.25,
        CONTENT_WIDTH,
        0,
      ) + 3;
  }
  if (experience.description?.trim()) {
    height +=
      measureText(
        state.doc,
        experience.description.trim(),
        state.theme.bodyFont,
        9.25,
        CONTENT_WIDTH,
        2,
      ) + 3;
  }
  height += measureHighlights(state, experience.highlights ?? []);
  return height + ENTRY_GAP;
}

function estimateDocumentHeight(
  state: RenderState,
  content: ResumeContent,
): number {
  let height = measureHeader(state, content);

  const summary = content.summary?.trim();
  if (summary) {
    height +=
      SECTION_HEADER_HEIGHT +
      measureText(
        state.doc,
        summary,
        state.theme.bodyFont,
        9.5,
        CONTENT_WIDTH,
        2,
      ) +
      9;
  }

  if (content.experience?.length) {
    height +=
      SECTION_HEADER_HEIGHT +
      content.experience.reduce(
        (total, experience) => total + measureExperience(state, experience),
        0,
      );
  }

  if (content.education?.length) {
    height +=
      SECTION_HEADER_HEIGHT +
      content.education.reduce(
        (total, item) => total + measureEducation(state, item),
        0,
      );
  }

  const skills = (content.skills ?? [])
    .map((skill) => skill.name.trim())
    .filter(Boolean);
  if (skills.length > 0) {
    height +=
      SECTION_HEADER_HEIGHT +
      measureText(
        state.doc,
        skills.join("  •  "),
        state.theme.bodyFont,
        9.25,
        CONTENT_WIDTH,
        2,
      ) +
      9;
  }

  if (content.projects?.length) {
    height +=
      SECTION_HEADER_HEIGHT +
      content.projects.reduce(
        (total, project) => total + measureProject(state, project),
        0,
      );
  }

  return height;
}

function measureHeader(state: RenderState, content: ResumeContent): number {
  const name = content.fullName.trim() || "Resume";
  let height =
    measureText(state.doc, name, state.theme.nameFont, 24, CONTENT_WIDTH, 0) +
    3;

  if (content.title?.trim()) {
    height +=
      measureText(
        state.doc,
        content.title.trim(),
        state.theme.italicFont,
        12,
        CONTENT_WIDTH,
        0,
      ) + 7;
  }

  const contactParts = [
    content.contact?.email,
    content.contact?.phone,
    content.contact?.location,
    content.contact?.linkedin,
    content.contact?.website,
  ].filter((value): value is string => Boolean(value?.trim()));
  if (contactParts.length > 0) {
    height +=
      measureText(
        state.doc,
        contactParts.join("  |  "),
        state.theme.bodyFont,
        8.5,
        CONTENT_WIDTH,
        1,
      ) + 10;
  } else {
    height += 3;
  }

  return height + (state.theme.headerRule === "none" ? 8 : 15);
}

function measureEducation(state: RenderState, item: Education): number {
  let height = measureDatedHeading(
    state,
    item.degree || item.institution || "Education",
    formatDateRange(item.startDate, item.endDate),
  );
  if (item.degree && item.institution) {
    height +=
      measureText(
        state.doc,
        item.institution,
        state.theme.italicFont,
        9.25,
        CONTENT_WIDTH,
        0,
      ) + 3;
  }
  if (item.field?.trim()) {
    height += measureText(
      state.doc,
      item.field.trim(),
      state.theme.bodyFont,
      9.25,
      CONTENT_WIDTH,
      2,
    );
  }
  if (item.gpa?.trim()) {
    height += measureText(
      state.doc,
      `GPA: ${item.gpa.trim()}`,
      state.theme.bodyFont,
      8.75,
      CONTENT_WIDTH,
      2,
    );
  }
  height += measureHighlights(state, item.highlights ?? []);
  return height + ENTRY_GAP;
}

function measureProject(state: RenderState, project: Project): number {
  let height = measureDatedHeading(
    state,
    project.name || "Project",
    project.url ?? "",
  );
  if (project.description?.trim()) {
    height +=
      measureText(
        state.doc,
        project.description.trim(),
        state.theme.bodyFont,
        9.25,
        CONTENT_WIDTH,
        2,
      ) + 3;
  }
  height += measureHighlights(state, project.highlights ?? []);
  return height + ENTRY_GAP;
}

function measureDatedHeading(
  state: RenderState,
  heading: string,
  date: string,
): number {
  const headingWidth = date ? ENTRY_WIDTH : CONTENT_WIDTH;
  const headingHeight = measureText(
    state.doc,
    heading,
    state.theme.boldFont,
    10.5,
    headingWidth,
    0,
  );
  const dateHeight = date
    ? measureText(state.doc, date, state.theme.italicFont, 8.75, DATE_WIDTH, 0)
    : 0;
  return Math.max(headingHeight, dateHeight) + 2;
}

function measureHighlights(state: RenderState, highlights: string[]): number {
  return highlights
    .map((highlight) => highlight.trim())
    .filter(Boolean)
    .reduce(
      (height, highlight) =>
        height +
        measureText(
          state.doc,
          highlight,
          state.theme.bodyFont,
          9.1,
          CONTENT_WIDTH - 14,
          1.5,
        ) +
        2,
      0,
    );
}

function measureText(
  doc: PdfDoc,
  text: string,
  font: string,
  size: number,
  width: number,
  lineGap: number,
): number {
  doc.font(font).fontSize(size);
  return doc.heightOfString(text, { width, lineGap });
}

function keepBlockTogether(state: RenderState, height: number): void {
  const usedHeight = state.y - MARGIN;
  const shouldBalancePage =
    state.pageIndex < state.plannedPageCount - 1 &&
    usedHeight >= state.targetPageHeight * 0.45 &&
    usedHeight + height > state.targetPageHeight;
  if (
    height <= FULL_PAGE_CONTENT_HEIGHT &&
    (state.y + height > CONTENT_BOTTOM || shouldBalancePage)
  ) {
    addPage(state);
  }
}

function ensureSpace(state: RenderState, neededHeight: number): void {
  if (state.y + neededHeight > CONTENT_BOTTOM) {
    addPage(state);
  }
}

function syncRenderState(state: RenderState): void {
  const range = state.doc.bufferedPageRange();
  state.pageIndex = range.start + range.count - 1;
  state.y = state.doc.y;
}

function addPage(state: RenderState): void {
  state.doc.addPage();
  state.y = MARGIN;
  state.pageIndex += 1;
}

function formatDateRange(
  startDate?: string,
  endDate?: string,
  current = false,
): string {
  const start = startDate?.trim();
  const end = current ? "Present" : endDate?.trim();
  if (start && end) return `${start} - ${end}`;
  if (start) return current ? `${start} - Present` : start;
  return end || "";
}

function addPageNumbers(doc: PdfDoc, theme: PdfTheme): void {
  const range = doc.bufferedPageRange();
  for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
    doc.switchToPage(range.start + pageIndex);
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font(theme.bodyFont)
      .fontSize(7.5)
      .fillColor(theme.muted)
      .text(
        `Page ${pageIndex + 1} of ${range.count}`,
        MARGIN,
        PAGE_HEIGHT - 30,
        {
          width: CONTENT_WIDTH,
          align: "right",
          lineBreak: false,
        },
      );
    doc.page.margins.bottom = originalBottomMargin;
  }
}
