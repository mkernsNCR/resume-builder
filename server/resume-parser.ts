import type { ResumeContent } from "@shared/schema";

/**
 * Clean up text extracted from PDFs - fix broken words and normalize whitespace
 */
function cleanExtractedText(text: string): string {
  let cleaned = text;

  // Fix hyphenated words with spaces: "Front   -End" -> "Front-End", "Full  -Stack" -> "Full-Stack"
  cleaned = cleaned.replace(/([A-Za-z]+)\s+-([A-Za-z]+)/g, '$1-$2');

  // Fix specific known PDF word-split patterns
  // "t es ts" -> "tests", "t es t" -> "test"
  cleaned = cleaned.replace(/\bt\s+es\s+t(s?)\b/gi, 'test$1');

  // "Wro t e" -> "Wrote", "wro t e" -> "wrote"
  cleaned = cleaned.replace(/\b([Ww])ro\s+t\s+e\b/g, '$1rote');

  // "Bu il t" -> "Built", "bu il t" -> "built"
  cleaned = cleaned.replace(/\b([Bb])u\s+il\s+t\b/g, '$1uilt');

  // "Del i vered" -> "Delivered"
  cleaned = cleaned.replace(/\b([Dd])el\s+i\s+vered\b/g, '$1elivered');

  // "Imp le mented" -> "Implemented"
  cleaned = cleaned.replace(/\b([Ii])mp\s+le\s+mented\b/g, '$1mplemented');

  // "Spea r headed" -> "Spearheaded"
  cleaned = cleaned.replace(/\b([Ss])pea\s+r\s+headed\b/g, '$1pearheaded');

  // "Int e grated" -> "Integrated"
  cleaned = cleaned.replace(/\b([Ii])nt\s+e\s+grated\b/g, '$1ntegrated');

  // Normalize multiple spaces to single (but preserve newlines)
  cleaned = cleaned.replace(/ {2,}/g, ' ');

  return cleaned;
}

/**
 * Section header patterns - flexible matching for various resume formats.
 * Each key maps to an array of regex patterns that match that section type.
 * Patterns are tested against line-start-anchored text (case-insensitive).
 */
const SECTION_PATTERNS: Record<string, RegExp[]> = {
  experience: [
    /^(?:WORK\s+)?EXPERIENCE/i,
    /^PROFESSIONAL\s+EXPERIENCE/i,
    /^EMPLOYMENT(?:\s+HISTORY)?/i,
    /^WORK\s+HISTORY/i,
    /^CAREER\s+HISTORY/i,
    /^RELEVANT\s+EXPERIENCE/i,
  ],
  education: [
    /^EDUCATION(?:AL\s+BACKGROUND)?/i,
    /^ACADEMIC(?:\s+BACKGROUND)?/i,
    /^QUALIFICATIONS/i,
    /^DEGREES?/i,
  ],
  skills: [
    /^(?:TECHNICAL\s+)?SKILLS/i,
    /^TECH(?:NICAL)?\s+STACK/i,
    /^TECHNOLOGIES/i,
    /^TOOLS(?:\s+(?:AND|&)\s+TECHNOLOGIES)?/i,
    /^COMPETENC(?:IES|E)/i,
    /^CORE\s+COMPETENCIES/i,
    /^PROFICIENCIES/i,
    /^AREAS?\s+OF\s+EXPERTISE/i,
  ],
  projects: [
    /^(?:PERSONAL\s+|SELECTED\s+|KEY\s+)?PROJECTS/i,
    /^PORTFOLIO/i,
  ],
  summary: [
    /^(?:PROFESSIONAL\s+)?SUMMARY/i,
    /^(?:CAREER\s+)?OBJECTIVE/i,
    /^PROFILE/i,
    /^ABOUT(?:\s+ME)?/i,
    /^OVERVIEW/i,
  ],
  certifications: [
    /^CERTIFICATIONS?/i,
    /^LICENSES?(?:\s+(?:AND|&)\s+CERTIFICATIONS?)?/i,
  ],
  awards: [
    /^AWARDS?(?:\s+(?:AND|&)\s+HONORS?)?/i,
    /^HONORS?(?:\s+(?:AND|&)\s+AWARDS?)?/i,
    /^ACHIEVEMENTS?/i,
  ],
  volunteer: [
    /^VOLUNTEER(?:ING)?\s*(?:EXPERIENCE)?/i,
    /^COMMUNITY\s+(?:SERVICE|INVOLVEMENT)/i,
  ],
};

/**
 * Detect sections in the text by finding lines that match section header patterns.
 * Returns an ordered array of { type, startIndex, headerEndIndex } for each section found.
 */
function detectSections(text: string): Array<{ type: string; start: number; contentStart: number }> {
  const lines = text.split('\n');
  const sections: Array<{ type: string; start: number; contentStart: number }> = [];
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and very long lines (not headers)
    if (!trimmed || trimmed.length > 60) {
      offset += line.length + 1;
      continue;
    }

    // Check if this line matches any section header pattern
    for (const [type, patterns] of Object.entries(SECTION_PATTERNS)) {
      if (patterns.some(p => p.test(trimmed))) {
        sections.push({
          type,
          start: offset,
          contentStart: offset + line.length + 1,
        });
        break;
      }
    }

    offset += line.length + 1;
  }

  return sections;
}

/**
 * Extract the text content for a specific section type.
 * Returns the text between the section header and the next section header (or end of text).
 */
function getSectionText(text: string, sectionType: string, sections: Array<{ type: string; start: number; contentStart: number }>): string {
  const sectionEntries = sections.filter(s => s.type === sectionType);
  if (sectionEntries.length === 0) return "";

  // Use the first matching section
  const section = sectionEntries[0];
  const sectionIdx = sections.indexOf(section);

  // Find the next section to determine the end boundary
  const nextSection = sections[sectionIdx + 1];
  const endIdx = nextSection ? nextSection.start : text.length;

  return text.substring(section.contentStart, endIdx).trim();
}

/**
 * Get the header area (text before any section headers) for name/title extraction.
 */
function getHeaderArea(text: string, sections: Array<{ type: string; start: number; contentStart: number }>): string {
  if (sections.length === 0) {
    // No sections found, use first 15 lines
    return text.split('\n').slice(0, 15).join('\n');
  }
  return text.substring(0, sections[0].start).trim();
}

/**
 * Parse extracted resume text into structured ResumeContent
 */
export function parseResumeText(rawText: string): Partial<ResumeContent> {
  // Clean up the extracted text first
  const text = cleanExtractedText(rawText);
  const result: Partial<ResumeContent> = {
    fullName: "",
    title: "",
    summary: "",
    contact: { email: "", phone: "", location: "", linkedin: "", website: "" },
    experience: [],
    education: [],
    skills: [],
    projects: [],
  };

  // Detect sections dynamically
  const sections = detectSections(text);

  // Extract contact info (can appear anywhere, especially header area)
  result.contact = extractContact(text);

  // Extract name from header area (before first section)
  const headerArea = getHeaderArea(text, sections);
  result.fullName = extractName(headerArea);

  // Extract job title from header area
  result.title = extractTitle(headerArea);

  // Extract sections using detected boundaries
  const summaryText = getSectionText(text, 'summary', sections);
  result.summary = summaryText ? cleanSummary(summaryText) : extractSummaryFallback(headerArea);

  const skillsText = getSectionText(text, 'skills', sections);
  result.skills = extractSkills(skillsText || text, !!skillsText);

  const experienceText = getSectionText(text, 'experience', sections);
  result.experience = extractExperience(experienceText);

  const educationText = getSectionText(text, 'education', sections);
  result.education = extractEducation(educationText);

  return result;
}

function extractContact(text: string) {
  const contact = { email: "", phone: "", location: "", linkedin: "", website: "" };

  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) contact.email = emailMatch[0];

  // Phone - support various formats including international
  const phoneMatch = text.match(/(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) contact.phone = phoneMatch[0].trim();

  // LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/i);
  if (linkedinMatch) contact.linkedin = `linkedin.com/in/${linkedinMatch[1]}`;

  // GitHub
  const githubMatch = text.match(/github\.com\/([a-zA-Z0-9-]+)/i);
  if (githubMatch && !contact.website) contact.website = `github.com/${githubMatch[1]}`;

  // Location (City, ST format or City, State format)
  const locationMatch = text.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z]{2})\b/);
  if (locationMatch) contact.location = locationMatch[0];

  // Website (exclude email domains, social, tech terms, and work-related domains)
  const emailDomains = ['gmail', 'yahoo', 'hotmail', 'outlook', 'ymail', 'aol', 'icloud'];
  const techTerms = ['node.js', 'react.js', 'vue.js', 'next.js', 'express.js', 'd3.js', 'three.js'];
  const workDomains = ['va.gov', 'nasa.gov', 'usda.gov', 'dhs.gov', 'dod.gov', 'army.mil', 'navy.mil'];
  const urlMatches = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi) || [];
  const website = urlMatches.find(u => {
    const lower = u.toLowerCase();
    return !lower.includes('linkedin') && !lower.includes('github') &&
           !emailDomains.some(d => lower.includes(d + '.')) &&
           !techTerms.some(t => lower.includes(t) || lower.includes(t.replace(/\./g, ''))) &&
           !workDomains.some(d => lower.includes(d));
  });
  if (website) contact.website = website.replace(/^https?:\/\//, '').replace(/^www\./, '');

  return contact;
}

function extractName(headerText: string): string {
  const lines = headerText.split(/\n|\s{2,}/).map(l => l.trim()).filter(l => l);

  for (const line of lines.slice(0, 10)) {
    // Skip contact info, headers
    if (line.includes('@') || /\d{3}/.test(line) || /linkedin/i.test(line)) continue;
    if (/resume|curriculum|cv\b/i.test(line)) continue;
    if (/,\s*[A-Z]{2}\b/.test(line)) continue; // Skip locations

    // Match "FirstName LastName" pattern (including middle names/initials)
    const nameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)(?:\s|,|$)/);
    if (nameMatch) return nameMatch[1];

    // Also try ALL CAPS name: "JOHN DOE"
    const capsMatch = line.match(/^([A-Z]{2,}(?:\s+[A-Z]\.?)?\s+[A-Z]{2,})(?:\s|,|$)/);
    if (capsMatch) {
      // Convert to title case
      return capsMatch[1].split(/\s+/).map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
    }
  }
  return "";
}

function extractTitle(headerText: string): string {
  const titleKeywords = ['engineer', 'developer', 'designer', 'manager', 'analyst',
    'architect', 'director', 'lead', 'senior', 'specialist', 'consultant', 'tester', 'intern',
    'scientist', 'administrator', 'coordinator', 'strategist', 'researcher', 'technician',
    'officer', 'associate', 'professor', 'instructor', 'therapist', 'nurse', 'accountant'];

  const lines = headerText.split(/\n/).map(l => l.trim()).filter(l => l);

  // First pass: look for a standalone title line (short line with title keyword)
  for (const line of lines) {
    const lower = line.toLowerCase();
    // Skip section headers, contact info, names
    if (SECTION_PATTERNS.experience?.some(p => p.test(line)) ||
        SECTION_PATTERNS.education?.some(p => p.test(line)) ||
        SECTION_PATTERNS.skills?.some(p => p.test(line)) ||
        SECTION_PATTERNS.summary?.some(p => p.test(line))) continue;
    if (/@|linkedin|\d{3}.*\d{4}|https?:/i.test(line)) continue;
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(line)) continue; // Skip names

    // A title line is typically short and contains a title keyword
    if (titleKeywords.some(kw => lower.includes(kw)) && line.length < 60 && line.length > 5) {
      return line.replace(/\s+/g, ' ').trim();
    }
  }

  // Second pass: extract title from summary text like "front-end engineer with..."
  const summaryText = headerText.toLowerCase();
  for (const kw of titleKeywords) {
    // SAFETY NOTE: kw originates from the hardcoded titleKeywords array (not user input),
    // so constructing new RegExp with kw interpolation is safe from ReDoS attacks.
    const titleMatch = summaryText.match(new RegExp(`((?:senior|junior|lead|staff|principal)?\\s*(?:front[- ]?end|back[- ]?end|full[- ]?stack|software|web|ui|ux|data|product|project|program|devops|cloud|mobile|qa|security)?\\s*${kw})`, 'i'));
    if (titleMatch) {
      // Capitalize properly
      return titleMatch[1].split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').replace(/-\s*/g, '-');
    }
  }

  return "";
}

/**
 * Clean summary text extracted from a detected summary section
 */
function cleanSummary(summaryText: string): string {
  let content = summaryText;
  // Remove contact info lines
  content = content.replace(/.*@.*\.(com|org|net|edu).*\n?/gi, '');
  content = content.replace(/.*\d{3}[-.\s]?\d{3}[-.\s]?\d{4}.*\n?/g, '');
  content = content.replace(/.*https?:\/\/.*\n?/gi, '');
  content = content.replace(/.*linkedin\.com.*\n?/gi, '');

  const cleanText = content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  return cleanText.length > 30 ? cleanText.slice(0, 500) : "";
}

/**
 * Fallback summary extraction when no labeled section exists
 */
function extractSummaryFallback(headerText: string): string {
  const allText = headerText.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const summaryPatterns = [
    /(Forward-thinking[^.]+(?:\.[^.]+){0,2}\.)/i,
    /(Experienced\s+\w+\s+(?:engineer|developer|designer|manager|analyst|scientist)[^.]+(?:\.[^.]+){0,2}\.)/i,
    /(Results-driven[^.]+(?:\.[^.]+){0,2}\.)/i,
    /(Passionate\s+\w+[^.]+(?:\.[^.]+){0,2}\.)/i,
    /(Dedicated\s+\w+[^.]+(?:\.[^.]+){0,2}\.)/i,
    /(Highly\s+motivated[^.]+(?:\.[^.]+){0,2}\.)/i,
  ];

  for (const pattern of summaryPatterns) {
    const match = allText.match(pattern);
    if (match && match[1].length > 80) {
      return match[1].trim().slice(0, 500);
    }
  }

  return "";
}

function extractSkills(text: string, hasDedicatedSection: boolean): Array<{ id: string; name: string; level: 'beginner' | 'intermediate' | 'advanced' | 'expert' }> {
  const skills: Array<{ id: string; name: string; level: 'beginner' | 'intermediate' | 'advanced' | 'expert' }> = [];

  if (!hasDedicatedSection) {
    // Try to find an inline skills section using a broad pattern
    const skillsMatch = text.match(/(?:SKILLS|TECH STACK|TECHNOLOGIES|TOOLS)\s*[&\w]*\s+([\s\S]*?)(?=\n\s*(?:EXPERIENCE|WORK|EDUCATION|PROJECTS|CERTIF|AWARD|VOLUNT)\b|$)/i);
    if (!skillsMatch) return skills;
    text = skillsMatch[1];
  }

  // Remove sub-headers like "Languages:", "Frameworks:", "Tools:" but keep their content
  const cleanedText = text.replace(/^[ \t]*(?:languages|frameworks|libraries|tools|databases|platforms|methodologies|operating\s+systems|other|software|front[- ]?end|back[- ]?end|devops|cloud)[ \t]*[:：]\s*/gim, '');

  // Parse skills separated by bullets, commas, pipes, semicolons, or newlines
  const noiseWords = new Set(['and', 'or', 'the', 'a', 'an', 'in', 'of', 'for', 'to', 'with', 'etc', 'including']);
  const rawSkills = cleanedText
    .split(/[•●○◦▪▸►\-\*,|;\/]\s*|\n/)
    .map(s => s.trim())
    .filter(s => s.length > 1 && s.length < 40 && !/^\d+$/.test(s))
    .filter(s => !noiseWords.has(s.toLowerCase()));

  const seen = new Set<string>();
  for (const skill of rawSkills) {
    const lower = skill.toLowerCase();
    if (!seen.has(lower) && skills.length < 30) {
      seen.add(lower);
      skills.push({ id: `skill-${skills.length + 1}`, name: skill, level: 'intermediate' });
    }
  }

  return skills;
}

/**
 * Parse a date string into a normalized format.
 * Handles: "Jan 2020", "January 2020", "01/2020", "2020", "Present", "Current", etc.
 */
function normalizeDate(dateStr: string): string {
  const trimmed = dateStr.trim();
  if (/present|current|now|ongoing/i.test(trimmed)) return "Present";

  // Already in "Mon YYYY" format
  if (/^[A-Z][a-z]+\s+\d{4}$/.test(trimmed)) return trimmed;

  // Full month name: "January 2020"
  const fullMonthMatch = trimmed.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i);
  if (fullMonthMatch) {
    const abbr = fullMonthMatch[1].slice(0, 3);
    return `${abbr.charAt(0).toUpperCase()}${abbr.slice(1).toLowerCase()} ${fullMonthMatch[2]}`;
  }

  // MM/YYYY or MM-YYYY
  const numericMatch = trimmed.match(/^(\d{1,2})[/-](\d{4})$/);
  if (numericMatch) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIdx = parseInt(numericMatch[1]) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${months[monthIdx]} ${numericMatch[2]}`;
    }
  }

  // Year only
  if (/^\d{4}$/.test(trimmed)) return trimmed;

  return trimmed;
}

/**
 * Find all date ranges in text. Returns array of { start, end, index, length }.
 * Supports many date formats and separators.
 */
function findDateRanges(text: string): Array<{ startDate: string; endDate: string; index: number; length: number }> {
  const results: Array<{ startDate: string; endDate: string; index: number; length: number }> = [];

  const monthPattern = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?';
  const dateFormats = [
    // Month Year - Month Year or Present
    `(${monthPattern}\\s+\\d{4})\\s*[-–—~to]+\\s*((?:Present|Current|Now|${monthPattern}\\s+\\d{4}))`,
    // MM/YYYY or MM-YYYY format
    `(\\d{1,2}[/-]\\d{4})\\s*[-–—~to]+\\s*((?:Present|Current|Now|\\d{1,2}[/-]\\d{4}))`,
    // Year only format: 2020 - 2023 or 2020 - Present
    `(\\b\\d{4})\\s*[-–—~to]+\\s*((?:Present|Current|Now|\\d{4}))\\b`,
  ];
  const datePattern = new RegExp(dateFormats.join('|'), 'gi');

  let match;
  while ((match = datePattern.exec(text)) !== null) {
    const startRaw = (match[1] || match[3] || match[5] || "").replace(/\s+/g, ' ').trim();
    const endRaw = (match[2] || match[4] || match[6] || "").replace(/\s+/g, ' ').trim();
    if (startRaw && endRaw) {
      results.push({
        startDate: normalizeDate(startRaw),
        endDate: normalizeDate(endRaw),
        index: match.index,
        length: match[0].length,
      });
    }
  }

  return results;
}

/**
 * Extract bullet points from text. Handles various bullet styles: •, -, *, >, →, ▸, numbered lists.
 */
function extractBulletPoints(text: string): Array<{ text: string; index: number }> {
  const bulletPattern = /(?:^|\n)\s*(?:[•●○◦▪▸►→\-\*>]|\d+[.)]\s)\s*([^\n]+(?:\n(?!\s*(?:[•●○◦▪▸►→\-\*>]|\d+[.)]\s|\n))[^\n]+)*)/g;
  const bullets: Array<{ text: string; index: number }> = [];
  let match;

  while ((match = bulletPattern.exec(text)) !== null) {
    let bulletText = match[1].trim();

    // Clean up multi-line bullets (join continuation lines)
    bulletText = bulletText.replace(/\n\s*/g, ' ').trim();

    // Truncate at blank line or next job header
    const jobHeaderIdx = bulletText.search(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s*[-–—]/i);
    if (jobHeaderIdx > 0) {
      bulletText = bulletText.substring(0, jobHeaderIdx).trim();
    }

    if (bulletText.length > 10 && bulletText.length < 500) {
      bullets.push({ text: bulletText, index: match.index });
    }
  }

  return bullets;
}

function extractExperience(expText: string): Array<{ id: string; company: string; position: string; startDate: string; endDate: string; highlights: string[] }> {
  const experiences: Array<{ id: string; company: string; position: string; startDate: string; endDate: string; highlights: string[] }> = [];

  if (!expText) return experiences;

  // Clean up the experience text - remove page break artifacts
  let cleanedText = expText;
  cleanedText = cleanedText.replace(/\+?1?[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g, ''); // Phone numbers
  cleanedText = cleanedText.replace(/https?:\/\/[^\s]+/gi, ''); // URLs
  cleanedText = cleanedText.replace(/\d+\s*\n?\s*PROFILE\s*\n?/gi, '\n'); // Page numbers + PROFILE header
  cleanedText = cleanedText.replace(/\n\s*PROFILE\s*\n/gi, '\n'); // Standalone PROFILE header

  // Find all date ranges
  const dateRanges = findDateRanges(cleanedText);
  if (dateRanges.length === 0) return experiences;

  const experienceDateIndices: number[] = [];

  // Extract job info around each date
  for (let i = 0; i < dateRanges.length && experiences.length < 10; i++) {
    const { startDate, endDate, index: dateIndex, length: dateLength } = dateRanges[i];

    // Get text before this date (company name)
    let searchStart = 0;
    if (i > 0) {
      const prevEnd = dateRanges[i-1].index + dateRanges[i-1].length;
      const afterPrevDate = cleanedText.substring(prevEnd);
      const nextNewline = afterPrevDate.indexOf('\n');
      if (nextNewline > 0) {
        const searchArea = cleanedText.substring(prevEnd + nextNewline, dateIndex);
        const lastBullet = searchArea.search(/[•●○◦▪▸►→\-\*>]\s*[A-Z]/);
        if (lastBullet > 0) {
          // Find end of last bullet section
          const afterBullets = searchArea.substring(lastBullet);
          const nonBulletLine = afterBullets.search(/\n\s*(?![•●○◦▪▸►→\-\*>])[A-Z]/);
          if (nonBulletLine > 0) {
            searchStart = prevEnd + nextNewline + lastBullet + nonBulletLine;
          } else {
            searchStart = prevEnd + nextNewline;
          }
        } else {
          searchStart = prevEnd + nextNewline;
        }
      }
    }

    const beforeDate = cleanedText.substring(searchStart, dateIndex);
    const lines = beforeDate.trim().split('\n');
    const lastLine = lines[lines.length - 1] || '';
    let company = lastLine.replace(/[•●○◦▪▸►→\-–—]/g, '').trim();
    company = company.replace(/\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*$/i, '').trim();

    // Get text after date (position/title)
    const afterDateStart = dateIndex + dateLength;
    const afterDate = cleanedText.substring(afterDateStart);
    const positionMatch = afterDate.match(/^[\s\n]*([A-Za-z][A-Za-z\s\-\/&,]+?)(?=\s*\n|\s*[•●○◦▪▸►→\-\*>]|$)/);
    let position = positionMatch ? positionMatch[1].trim() : "";
    position = position.replace(/\s+-/g, '-').replace(/-\s+/g, '-');

    // Heuristic: if position looks like a company and company looks like a position, swap them
    const titleKeywords = /engineer|developer|designer|manager|analyst|architect|director|lead|senior|specialist|consultant|intern|scientist|administrator|coordinator/i;
    if (titleKeywords.test(company) && !titleKeywords.test(position) && position.length > 2) {
      const temp = company;
      company = position;
      position = temp;
    }

    if (company && company.length > 2 && !/^(experience|education|skills)/i.test(company)) {
      experienceDateIndices.push(i);
      experiences.push({
        id: `exp-${experiences.length + 1}`,
        company,
        position,
        startDate,
        endDate,
        highlights: [],
      });
    }
  }

  // Extract bullet points and distribute to experiences
  const bullets = extractBulletPoints(cleanedText);

  for (let i = 0; i < experiences.length; i++) {
    const dateIdx = experienceDateIndices[i];
    const currentDatePos = dateRanges[dateIdx]?.index ?? 0;
    const nextDatePos = dateIdx + 1 < dateRanges.length ? dateRanges[dateIdx + 1].index : cleanedText.length;

    for (const bullet of bullets) {
      if (bullet.index > currentDatePos && bullet.index < nextDatePos && experiences[i].highlights.length < 8) {
        const hasNextJobInfo = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*[-–—]/i.test(bullet.text);
        if (!hasNextJobInfo) {
          experiences[i].highlights.push(bullet.text.slice(0, 300));
        }
      }
    }
  }

  return experiences;
}

function extractEducation(eduText: string): Array<{ id: string; institution: string; degree: string; field: string; startDate: string; endDate?: string }> {
  const education: Array<{ id: string; institution: string; degree: string; field: string; startDate: string; endDate?: string }> = [];

  if (!eduText) return education;

  const lines = eduText.split('\n').map(l => l.trim()).filter(l => l);

  // Institution keywords (for keyword-based detection)
  const institutionKeywords = ['university', 'college', 'institute', 'school', 'academy',
    'polytechnic', 'conservatory', 'seminary'];

  // Degree keywords
  const degreeKeywords = ['b.s.', 'bs', 'b.a.', 'ba', 'm.s.', 'ms', 'm.a.', 'ma', 'mba', 'ph.d.', 'phd',
    'bachelor', 'master', 'associate', 'certificate', 'diploma', 'doctor', 'juris',
    'b.sc', 'bsc', 'm.sc', 'msc', 'b.eng', 'beng', 'm.eng', 'meng',
    'b.ed', 'bed', 'm.ed', 'med', 'b.tech', 'btech', 'm.tech', 'mtech',
    'a.s.', 'a.a.', 'aas', 'ged', 'high school diploma'];

  // Field of study keywords (to separate field from degree)
  const fieldKeywords = ['computer science', 'information technology', 'software engineering',
    'electrical engineering', 'mechanical engineering', 'business', 'mathematics', 'physics',
    'chemistry', 'biology', 'economics', 'psychology', 'english', 'history', 'art',
    'graphic design', 'data science', 'cybersecurity', 'marketing', 'finance', 'accounting',
    'management', 'communications', 'nursing', 'education', 'philosophy', 'political science',
    'sociology', 'anthropology', 'architecture', 'music', 'theater', 'film'];

  /**
   * Heuristic: detect whether a line is likely an institution name.
   * Uses keyword matching PLUS patterns like "of [Place]" or short uppercase-heavy lines.
   */
  function isInstitution(line: string): boolean {
    const lower = line.toLowerCase();
    // Direct keyword match
    if (institutionKeywords.some(kw => lower.includes(kw))) return true;
    // Pattern: "X of Y" where Y is a place (e.g., "Massachusetts Institute of Technology")
    if (/\bof\s+[A-Z][a-z]/.test(line) && line.length < 80 && !degreeKeywords.some(kw => lower.includes(kw))) return true;
    // Short line that is mostly capitalized words (likely an institution name)
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 8 && !degreeKeywords.some(kw => lower.includes(kw))) {
      const capitalizedWords = words.filter(w => /^[A-Z]/.test(w));
      if (capitalizedWords.length >= words.length * 0.7) return true;
    }
    return false;
  }

  function isDegree(line: string): boolean {
    const lower = line.toLowerCase();
    return degreeKeywords.some(kw => lower.includes(kw));
  }

  /**
   * Try to extract the field of study from a degree line.
   * E.g., "Bachelor of Science in Computer Science" → field: "Computer Science"
   */
  function extractField(degreeLine: string): { degree: string; field: string } {
    // Pattern: "Degree in Field"
    const inMatch = degreeLine.match(/^(.+?)\s+in\s+(.+)$/i);
    if (inMatch) {
      return { degree: inMatch[1].trim(), field: inMatch[2].trim() };
    }
    // Pattern: "Degree, Field" or "Degree - Field"
    const sepMatch = degreeLine.match(/^(.+?)\s*[,\-–—]\s*(.+)$/);
    if (sepMatch && degreeKeywords.some(kw => sepMatch[1].toLowerCase().includes(kw))) {
      return { degree: sepMatch[1].trim(), field: sepMatch[2].trim() };
    }
    return { degree: degreeLine, field: '' };
  }

  // Parse education entries using a state machine approach
  let currentEntry: { institution: string; degree: string; field: string; startDate: string; endDate?: string } | null = null;

  for (const line of lines) {
    // Check for date range in the line
    const dateRanges = findDateRanges(line);
    const yearMatch = line.match(/\b(19|20)\d{2}\b/);

    const lineIsInstitution = isInstitution(line);
    const lineIsDegree = isDegree(line);

    if (lineIsInstitution) {
      // Remove any inline dates from institution name
      let cleanInstitution = line;
      for (const dr of dateRanges) {
        cleanInstitution = cleanInstitution.replace(line.substring(dr.index, dr.index + dr.length), '').trim();
      }
      cleanInstitution = cleanInstitution.replace(/\s*[-–—,]\s*$/, '').trim();

      if (currentEntry && !currentEntry.institution) {
        // Fill in missing institution for a degree-first entry
        currentEntry.institution = cleanInstitution;
        if (dateRanges.length > 0) {
          currentEntry.startDate = dateRanges[0].startDate;
          currentEntry.endDate = dateRanges[0].endDate;
        } else if (yearMatch) {
          currentEntry.startDate = currentEntry.startDate || yearMatch[0];
        }
      } else {
        // Save previous entry if complete
        if (currentEntry && currentEntry.institution && currentEntry.degree) {
          education.push({
            id: `edu-${education.length + 1}`,
            ...currentEntry,
          });
        }
        currentEntry = {
          institution: cleanInstitution,
          degree: '',
          field: '',
          startDate: dateRanges.length > 0 ? dateRanges[0].startDate : (yearMatch?.[0] || ''),
          endDate: dateRanges.length > 0 ? dateRanges[0].endDate : undefined,
        };
      }
    } else if (lineIsDegree) {
      // Remove any inline dates from degree line
      let cleanDegree = line;
      for (const dr of dateRanges) {
        cleanDegree = cleanDegree.replace(line.substring(dr.index, dr.index + dr.length), '').trim();
      }
      cleanDegree = cleanDegree.replace(/\s*[-–—,]\s*$/, '').trim();

      const { degree, field } = extractField(cleanDegree);

      if (currentEntry) {
        currentEntry.degree = degree;
        if (field) currentEntry.field = field;
        if (dateRanges.length > 0) {
          currentEntry.startDate = dateRanges[0].startDate;
          currentEntry.endDate = dateRanges[0].endDate;
        } else if (yearMatch && !currentEntry.startDate) {
          currentEntry.startDate = yearMatch[0];
        }
      } else {
        currentEntry = {
          institution: '',
          degree,
          field,
          startDate: dateRanges.length > 0 ? dateRanges[0].startDate : (yearMatch?.[0] || ''),
          endDate: dateRanges.length > 0 ? dateRanges[0].endDate : undefined,
        };
      }
    } else if (dateRanges.length > 0 && currentEntry) {
      // Line with only dates - update current entry
      currentEntry.startDate = dateRanges[0].startDate;
      currentEntry.endDate = dateRanges[0].endDate;
    } else if (yearMatch && currentEntry) {
      if (!currentEntry.startDate) {
        currentEntry.startDate = yearMatch[0];
      } else if (!currentEntry.endDate) {
        currentEntry.endDate = yearMatch[0];
      }
    } else if (currentEntry && !currentEntry.field && line.length < 60 && !line.includes(':')) {
      // Possible field of study on its own line (e.g., "Computer Science")
      const lower = line.toLowerCase();
      if (fieldKeywords.some(kw => lower.includes(kw))) {
        currentEntry.field = line;
      } else if (currentEntry.degree && !currentEntry.institution && isInstitution(line)) {
        // Catch institutions that were missed by keyword heuristics
        currentEntry.institution = line;
      }
    }
  }

  // Push the last entry
  if (currentEntry && currentEntry.institution && currentEntry.degree) {
    education.push({
      id: `edu-${education.length + 1}`,
      ...currentEntry,
    });
  }

  // If no entries found with strict matching, try a more lenient approach:
  // Look for any line pair where one has a degree keyword and the other looks like a name
  if (education.length === 0 && lines.length >= 1) {
    let degLine = '';
    let instLine = '';
    let date = '';

    for (const line of lines) {
      if (isDegree(line)) {
        degLine = line;
      } else if (!degLine && line.length < 80 && /^[A-Z]/.test(line) && !/^\d/.test(line)) {
        instLine = line;
      } else if (degLine && !instLine && line.length < 80 && /^[A-Z]/.test(line)) {
        instLine = line;
      }
      const ym = line.match(/\b((?:19|20)\d{2})\b/);
      if (ym && !date) date = ym[1];
    }

    if (degLine || instLine) {
      const { degree, field } = degLine ? extractField(degLine) : { degree: '', field: '' };
      education.push({
        id: 'edu-1',
        institution: instLine || 'Unknown',
        degree: degree || instLine || 'Unknown',
        field,
        startDate: date,
      });
    }
  }

  return education;
}
