import type { ResumeContent } from "@shared/schema";

export interface Suggestion {
  section: string;
  field: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
}

export function generateSuggestions(content: ResumeContent): Suggestion[] {
  const suggestions: Suggestion[] = [];

  suggestions.push(...suggestSummaryImprovements(content));
  suggestions.push(...suggestExperienceHighlights(content));
  suggestions.push(...suggestSkillLevels(content));
  suggestions.push(...suggestProjectDescriptions(content));

  return suggestions;
}

function suggestSummaryImprovements(content: ResumeContent): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const summary = content.summary?.trim() || "";

  if (summary.length === 0) {
    const roleCount = (content.experience || []).length;
    const topSkill = (content.skills || [])[0]?.name || "your core skill";
    const experience = roleCount > 0
      ? `experience across ${roleCount} role${roleCount > 1 ? "s" : ""}`
      : "experience";
    const suggested = `Results-driven ${content.title || "professional"} with ${experience} and a focus on ${topSkill}. Add your most relevant accomplishments and measurable impact.`;
    suggestions.push({
      section: "Professional Summary",
      field: "summary",
      currentValue: "",
      suggestedValue: suggested,
      reason: "A professional summary helps recruiters quickly understand your value. This template uses your title and top skill.",
    });
  } else if (summary.length < 100) {
    const needsMetrics = !/\d/.test(summary);
    const metricAddition = needsMetrics ? ` ${getQuantifiableAddition(content)}` : "";
    suggestions.push({
      section: "Professional Summary",
      field: "summary",
      currentValue: summary,
      suggestedValue: `${summary} ${generateSummaryExtension(content)}${metricAddition}`,
      reason: needsMetrics
        ? "Your summary is brief and lacks measurable results. Expand it and add a verified metric from your experience."
        : "Your summary is brief. Expanding it with relevant achievements makes it more compelling.",
    });
  } else if (!/\d/.test(summary)) {
    suggestions.push({
      section: "Professional Summary",
      field: "summary",
      currentValue: summary,
      suggestedValue: `${summary} ${getQuantifiableAddition(content)}`,
      reason: "Adding quantifiable metrics (numbers, percentages) to your summary makes it more impactful.",
    });
  }

  return suggestions;
}

function generateSummaryExtension(content: ResumeContent): string {
  const skillCount = (content.skills || []).length;
  const expCount = (content.experience || []).length;
  if (expCount > 0 && skillCount > 0) {
    return `With ${expCount} role${expCount > 1 ? "s" : ""} across diverse projects and expertise in ${skillCount}+ technologies, I consistently deliver results that exceed expectations.`;
  }
  return "Passionate about leveraging technology to solve complex problems and drive business growth.";
}

function getQuantifiableAddition(content: ResumeContent): string {
  const highlights = (content.experience || []).flatMap((e) => e.highlights || []);
  const quantifiable = highlights.find((h) => /\d/.test(h));
  if (quantifiable) {
    return `Key achievement: ${quantifiable}.`;
  }
  return "[Add a verified metric from your experience, such as time saved, revenue influenced, or performance improved.]";
}

function suggestExperienceHighlights(content: ResumeContent): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const experiences = content.experience || [];

  for (const exp of experiences) {
    if (!exp.highlights || exp.highlights.length === 0) {
      const suggested = generateHighlightSuggestions(exp.position || "the role", exp.company || "the company");
      suggestions.push({
        section: "Work Experience",
        field: `highlights-${exp.id}`,
        currentValue: "(none)",
        suggestedValue: suggested.join("\n"),
        reason: `Add quantifiable bullet points for your role at ${exp.company || "this company"} to showcase your impact.`,
      });
    }
  }

  return suggestions;
}

function generateHighlightSuggestions(position: string, company: string): string[] {
  return [
    `Spearheaded key initiatives as ${position} at ${company}, delivering measurable improvements in performance and reliability.`,
    `Collaborated cross-functionally with product and design teams to ship high-quality features on time.`,
    `Optimized existing systems and processes, resulting in improved efficiency and reduced technical debt.`,
  ];
}

function suggestSkillLevels(content: ResumeContent): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const skills = content.skills || [];

  for (const skill of skills) {
    if (!skill.level) {
      suggestions.push({
        section: "Skills",
        field: `level-${skill.id}`,
        currentValue: "(not set)",
        suggestedValue: "Choose: beginner, intermediate, advanced, or expert",
        reason: `Choose the proficiency level that accurately reflects your experience with ${skill.name}.`,
      });
    }
  }

  return suggestions;
}

function suggestProjectDescriptions(content: ResumeContent): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const projects = content.projects || [];

  for (const project of projects) {
    if (!project.description || project.description.trim().length === 0) {
      suggestions.push({
        section: "Projects",
        field: `description-${project.id}`,
        currentValue: "",
        suggestedValue: `${project.name || "This project"} demonstrates practical application of key technologies and problem-solving skills. Built to solve a real-world challenge with a focus on performance and user experience.`,
        reason: `Add a description for ${project.name || "this project"} to give context on its purpose and impact.`,
      });
    }
  }

  return suggestions;
}
