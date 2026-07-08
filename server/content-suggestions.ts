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
    const expYears = (content.experience || []).length;
    const topSkill = (content.skills || [])[0]?.name || "your core skill";
    const suggested = `Results-driven ${content.title || "professional"} with ${expYears > 0 ? `${expYears}+ year${expYears > 1 ? "s" : ""} of experience` : "proven expertise"} in ${topSkill}. Proven track record of delivering high-impact solutions and driving team success.`;
    suggestions.push({
      section: "Professional Summary",
      field: "summary",
      currentValue: "",
      suggestedValue: suggested,
      reason: "A professional summary helps recruiters quickly understand your value. This template uses your title and top skill.",
    });
  } else if (summary.length < 100) {
    suggestions.push({
      section: "Professional Summary",
      field: "summary",
      currentValue: summary,
      suggestedValue: `${summary} ${generateSummaryExtension(content)}`,
      reason: "Your summary is brief. Expanding it with quantifiable achievements makes it more compelling.",
    });
  }

  if (summary.length > 0 && !/\d/.test(summary)) {
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
  return "Proven track record of improving efficiency and delivering measurable results.";
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
        suggestedValue: guessSkillLevel(skill.name),
        reason: `Adding a proficiency level for ${skill.name} helps recruiters gauge your expertise at a glance.`,
      });
    }
  }

  return suggestions;
}

function guessSkillLevel(skillName: string): string {
  const expertSkills = ["react", "javascript", "typescript", "python", "java", "node", "sql"];
  const advancedSkills = ["aws", "docker", "kubernetes", "graphql", "redis", "mongodb"];
  const lower = skillName.toLowerCase();

  if (expertSkills.some((s) => lower.includes(s))) return "expert";
  if (advancedSkills.some((s) => lower.includes(s))) return "advanced";
  return "intermediate";
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
