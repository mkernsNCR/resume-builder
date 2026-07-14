import type { ResumeContent } from "@shared/schema";

export interface ResumeScore {
  total: number;
  sections: SectionScore[];
}

export interface SectionScore {
  section: string;
  score: number;
  maxScore: number;
  feedback: string[];
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function scoreResume(content: ResumeContent): ResumeScore {
  const sections: SectionScore[] = [
    scorePersonalInfo(content),
    scoreSummary(content),
    scoreExperience(content),
    scoreEducation(content),
    scoreSkills(content),
    scoreProjects(content),
  ];

  const total = sections.reduce((sum, s) => sum + s.score, 0);
  return { total, sections };
}

function scorePersonalInfo(content: ResumeContent): SectionScore {
  const feedback: string[] = [];
  let score = 0;
  const maxScore = 20;

  if (hasText(content.fullName)) {
    score += 5;
  } else {
    feedback.push("Add your full name.");
  }

  if (hasText(content.title)) {
    score += 3;
  } else {
    feedback.push("Add a professional title (e.g., 'Senior Software Engineer').");
  }

  const contact = content.contact;
  if (contact) {
    if (hasText(contact.email)) score += 3;
    else feedback.push("Add an email address.");

    if (hasText(contact.phone)) score += 2;
    else feedback.push("Add a phone number.");

    if (hasText(contact.location)) score += 2;
    else feedback.push("Add your location.");

    if (hasText(contact.linkedin)) score += 3;
    else feedback.push("Add a LinkedIn profile URL.");

    if (hasText(contact.website)) score += 2;
    else feedback.push("Consider adding a personal website or portfolio.");
  } else {
    feedback.push("Add contact information including email, phone, and location.");
  }

  return { section: "Personal Information", score, maxScore, feedback };
}

function scoreSummary(content: ResumeContent): SectionScore {
  const feedback: string[] = [];
  let score = 0;
  const maxScore = 15;

  const summary = hasText(content.summary) ? content.summary.trim() : "";

  if (summary.length === 0) {
    feedback.push("Add a professional summary to highlight your value proposition.");
    return { section: "Professional Summary", score, maxScore, feedback };
  }

  score += 5;

  if (summary.length >= 50) {
    score += 5;
  } else {
    feedback.push("Expand your summary to at least 50 characters for more impact.");
    score += 2;
  }

  if (summary.length >= 150) {
    score += 5;
  } else if (summary.length >= 100) {
    score += 3;
  } else {
    feedback.push("Consider expanding your summary to 150+ characters for a stronger narrative.");
    score += 1;
  }

  if (summary.length > 500) {
    feedback.push("Your summary is quite long — consider trimming to under 500 characters.");
  }

  return { section: "Professional Summary", score, maxScore, feedback };
}

function scoreExperience(content: ResumeContent): SectionScore {
  const feedback: string[] = [];
  let score = 0;
  const maxScore = 30;

  const experience = content.experience || [];

  if (experience.length === 0) {
    feedback.push("Add at least one work experience entry.");
    return { section: "Work Experience", score, maxScore, feedback };
  }

  score += 5;

  if (experience.length >= 2) {
    score += 5;
  } else {
    feedback.push("Add more work experience entries to show career progression.");
    score += 2;
  }

  let entriesWithHighlights = 0;
  let entriesWithDescription = 0;

  for (const exp of experience) {
    if (exp.highlights && exp.highlights.length > 0) entriesWithHighlights++;
    if (hasText(exp.description)) entriesWithDescription++;
  }

  if (entriesWithHighlights === experience.length) {
    score += 10;
  } else if (entriesWithHighlights > 0) {
    score += 5;
    feedback.push("Add bullet-point highlights to all experience entries for stronger impact.");
  } else {
    feedback.push("Add quantifiable highlights (e.g., 'Increased revenue by 25%') to each role.");
  }

  if (entriesWithDescription === experience.length) {
    score += 5;
  } else {
    feedback.push("Add a description for each role to provide context.");
    score += 2;
  }

  if (experience.length >= 3) {
    score += 5;
  }

  return { section: "Work Experience", score, maxScore, feedback };
}

function scoreEducation(content: ResumeContent): SectionScore {
  const feedback: string[] = [];
  let score = 0;
  const maxScore = 10;

  const education = content.education || [];

  if (education.length === 0) {
    feedback.push("Add at least one education entry.");
    return { section: "Education", score, maxScore, feedback };
  }

  score += 5;

  if (education.length >= 2) {
    score += 3;
  } else {
    score += 1;
    feedback.push("Add another education entry to strengthen this section.");
  }

  const allHaveField = education.every((e) => hasText(e.field));
  if (allHaveField) {
    score += 2;
  } else {
    feedback.push("Add your field of study for each education entry.");
  }

  return { section: "Education", score, maxScore, feedback };
}

function scoreSkills(content: ResumeContent): SectionScore {
  const feedback: string[] = [];
  let score = 0;
  const maxScore = 15;

  const skills = content.skills || [];

  if (skills.length === 0) {
    feedback.push("Add relevant skills to showcase your expertise.");
    return { section: "Skills", score, maxScore, feedback };
  }

  score += 5;

  if (skills.length >= 5) {
    score += 5;
  } else {
    feedback.push("Add at least 5 skills to strengthen your profile.");
    score += 2;
  }

  if (skills.length >= 10) {
    score += 3;
  } else {
    score += 1;
    if (skills.length >= 5) {
      feedback.push("Add at least 10 skills to demonstrate broader expertise.");
    }
  }

  const skillsWithLevel = skills.filter((s) => s.level);
  if (skillsWithLevel.length === skills.length) {
    score += 2;
  } else {
    feedback.push("Add proficiency levels to all skills for better clarity.");
    score += 1;
  }

  return { section: "Skills", score, maxScore, feedback };
}

function scoreProjects(content: ResumeContent): SectionScore {
  const feedback: string[] = [];
  let score = 0;
  const maxScore = 10;

  const projects = content.projects || [];

  if (projects.length === 0) {
    feedback.push("Consider adding projects to demonstrate practical experience.");
    return { section: "Projects", score, maxScore, feedback };
  }

  score += 5;

  if (projects.length >= 2) {
    score += 3;
  } else {
    score += 1;
    feedback.push("Add another project to strengthen this section.");
  }

  const withDescription = projects.filter((p) => hasText(p.description));
  if (withDescription.length === projects.length) {
    score += 2;
  } else {
    feedback.push("Add descriptions to all projects.");
    score += 1;
  }

  return { section: "Projects", score, maxScore, feedback };
}
