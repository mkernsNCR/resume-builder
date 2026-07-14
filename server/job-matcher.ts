import type { ResumeContent } from "@shared/schema";

export interface MatchResult {
  matchScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "must", "shall", "can", "need",
  "this", "that", "these", "those", "i", "you", "he", "she", "it",
  "we", "they", "what", "which", "who", "when", "where", "why", "how",
  "all", "each", "every", "both", "few", "more", "most", "other",
  "some", "such", "no", "nor", "not", "only", "own", "same", "so",
  "than", "too", "very", "just", "also", "as", "if", "then", "else",
  "about", "into", "through", "during", "before", "after", "above",
  "below", "up", "down", "out", "off", "over", "under", "again",
  "further", "here", "there", "your", "our", "their", "its",
  "you'll", "we're", "they're", "you're", "it's", "that's",
  "etc", "eg", "ie", "per", "via", "vs",
]);

const PROTECTED_TECH_TERMS = new Set([
  "c#",
  "c++",
  "go",
  "ai",
  "ui",
  "ux",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s#+-]/g, " ")
    .split(/\s+/)
    .map((token) =>
      PROTECTED_TECH_TERMS.has(token)
        ? token
        : token.replace(/^[#+-]+|[#+-]+$/g, ""),
    )
    .filter(
      (token) =>
        (token.length > 2 || PROTECTED_TECH_TERMS.has(token)) &&
        !STOP_WORDS.has(token),
    );
}

function extractKeywords(text: string): Set<string> {
  const tokens = tokenize(text);
  const keywords = new Set<string>();

  for (const token of tokens) {
    keywords.add(token);
  }

  return keywords;
}

function extractResumeText(content: ResumeContent): string {
  const parts: string[] = [];

  if (content.title) parts.push(content.title);
  if (content.summary) parts.push(content.summary);

  for (const exp of content.experience || []) {
    if (exp.position) parts.push(exp.position);
    if (exp.description) parts.push(exp.description);
    for (const h of exp.highlights || []) parts.push(h);
  }

  for (const edu of content.education || []) {
    if (edu.degree) parts.push(edu.degree);
    if (edu.field) parts.push(edu.field);
  }

  for (const skill of content.skills || []) {
    if (skill.name) parts.push(skill.name);
  }

  for (const project of content.projects || []) {
    if (project.name) parts.push(project.name);
    if (project.description) parts.push(project.description);
    for (const h of project.highlights || []) parts.push(h);
  }

  return parts.join(" ");
}

export function matchJobDescription(
  content: ResumeContent,
  jobDescription: string,
): MatchResult {
  const jobKeywords = extractKeywords(jobDescription);
  const resumeText = extractResumeText(content);
  const resumeKeywords = extractKeywords(resumeText);

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const keyword of Array.from(jobKeywords)) {
    if (resumeKeywords.has(keyword)) {
      matchedKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  }

  const matchScore =
    jobKeywords.size === 0
      ? 0
      : Math.round((matchedKeywords.length / jobKeywords.size) * 100);

  const suggestions: string[] = [];

  if (missingKeywords.length > 0) {
    const topMissing = missingKeywords.slice(0, 5);
    suggestions.push(
      `Consider adding these keywords from the job description: ${topMissing.join(", ")}.`,
    );
  }

  if (matchScore < 50) {
    suggestions.push(
      "Your resume has a low keyword match with this job description. Tailor your content to better align with the role.",
    );
  } else if (matchScore < 75) {
    suggestions.push(
      "Decent match. Adding a few more relevant keywords could improve your chances.",
    );
  } else if (matchScore < 90) {
    suggestions.push(
      "Good match! Your resume aligns well with this job description.",
    );
  } else {
    suggestions.push(
      "Excellent match! Your resume strongly aligns with this job description.",
    );
  }

  if ((content.skills?.length ?? 0) < 5) {
    suggestions.push("Add more skills to your resume to improve keyword matching.");
  }

  if (!content.summary || content.summary.trim().length < 50) {
    suggestions.push("Add a detailed professional summary that incorporates relevant keywords.");
  }

  return {
    matchScore,
    matchedKeywords: matchedKeywords.sort(),
    missingKeywords: missingKeywords.sort(),
    suggestions,
  };
}
