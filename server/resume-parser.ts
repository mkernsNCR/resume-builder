import type { ResumeContent } from "@shared/schema";

/**
 * Parse extracted resume text into structured ResumeContent
 */
export function parseResumeText(text: string): Partial<ResumeContent> {
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

  // Extract contact info
  result.contact = extractContact(text);
  
  // Extract name from beginning of text
  result.fullName = extractName(text);
  
  // Extract job title
  result.title = extractTitle(text);
  
  // Extract sections
  result.summary = extractSummary(text);
  result.skills = extractSkills(text);
  result.experience = extractExperience(text);
  result.education = extractEducation(text);

  return result;
}

function extractContact(text: string) {
  const contact = { email: "", phone: "", location: "", linkedin: "", website: "" };
  
  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) contact.email = emailMatch[0];
  
  // Phone
  const phoneMatch = text.match(/(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) contact.phone = phoneMatch[0].trim();
  
  // LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/i);
  if (linkedinMatch) contact.linkedin = `linkedin.com/in/${linkedinMatch[1]}`;
  
  // Location (City, ST format)
  const locationMatch = text.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z]{2})\b/);
  if (locationMatch) contact.location = locationMatch[0];
  
  // Website (exclude email domains, social, and tech terms that look like domains)
  const emailDomains = ['gmail', 'yahoo', 'hotmail', 'outlook', 'ymail', 'aol', 'icloud'];
  const techTerms = ['node.js', 'react.js', 'vue.js', 'next.js', 'express.js', 'd3.js', 'three.js'];
  const urlMatches = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi) || [];
  const website = urlMatches.find(u => {
    const lower = u.toLowerCase();
    return !lower.includes('linkedin') && !lower.includes('github') && 
           !emailDomains.some(d => lower.includes(d + '.')) &&
           !techTerms.some(t => lower.includes(t) || lower.includes(t.replace(/\./g, '')));
  });
  if (website) contact.website = website.replace(/^https?:\/\//, '').replace(/^www\./, '');
  
  return contact;
}

function extractName(text: string): string {
  const lines = text.split(/\n|\s{2,}/).map(l => l.trim()).filter(l => l);
  
  for (const line of lines.slice(0, 10)) {
    // Skip contact info, headers
    if (line.includes('@') || /\d{3}/.test(line) || /linkedin/i.test(line)) continue;
    if (/resume|curriculum|cv\b/i.test(line)) continue;
    if (/,\s*[A-Z]{2}\b/.test(line)) continue; // Skip locations
    
    // Match "FirstName LastName" pattern
    const nameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)(?:\s|$)/);
    if (nameMatch) return nameMatch[1];
  }
  return "";
}

function extractTitle(text: string): string {
  const titleKeywords = ['engineer', 'developer', 'designer', 'manager', 'analyst', 
    'architect', 'director', 'lead', 'senior', 'specialist', 'consultant'];
  
  const lines = text.split(/\n|\s{2,}/).map(l => l.trim()).filter(l => l);
  
  for (const line of lines.slice(0, 15)) {
    const lower = line.toLowerCase();
    if (titleKeywords.some(kw => lower.includes(kw)) && line.length < 60) {
      return line;
    }
  }
  return "";
}

function extractSummary(text: string): string {
  const summaryMatch = text.match(/(?:SUMMARY|OBJECTIVE|PROFILE|ABOUT)\s+([\s\S]*?)(?=EXPERIENCE|EDUCATION|SKILLS|TECH STACK|$)/i);
  if (summaryMatch) {
    return summaryMatch[1].trim().slice(0, 500);
  }
  return "";
}

function extractSkills(text: string): Array<{ id: string; name: string; level: 'beginner' | 'intermediate' | 'advanced' | 'expert' }> {
  const skills: Array<{ id: string; name: string; level: 'beginner' | 'intermediate' | 'advanced' | 'expert' }> = [];
  
  // Find skills section
  const skillsMatch = text.match(/(?:SKILLS|TECH STACK|TECHNOLOGIES|TOOLS)\s*[&\w]*\s+([\s\S]*?)(?=EXPERIENCE|EDUCATION|PROJECTS|$)/i);
  if (!skillsMatch) return skills;
  
  const skillsText = skillsMatch[1];
  
  // Parse skills separated by bullets, commas, or pipes
  const sectionHeaders = ['tools', 'technologies', 'skills', 'tech stack', 'frameworks', 'languages'];
  const rawSkills = skillsText.split(/[•,|]/g)
    .map(s => s.trim())
    .filter(s => s.length > 1 && s.length < 40 && !/^\d+$/.test(s))
    .filter(s => !sectionHeaders.includes(s.toLowerCase()));
  
  const seen = new Set<string>();
  for (const skill of rawSkills) {
    const lower = skill.toLowerCase();
    if (!seen.has(lower) && skills.length < 20) {
      seen.add(lower);
      skills.push({ id: `skill-${skills.length + 1}`, name: skill, level: 'intermediate' });
    }
  }
  
  return skills;
}

function extractExperience(text: string): Array<{ id: string; company: string; position: string; startDate: string; endDate: string; highlights: string[] }> {
  const experiences: Array<{ id: string; company: string; position: string; startDate: string; endDate: string; highlights: string[] }> = [];
  
  // Find experience section
  const expMatch = text.match(/EXPERIENCE\s+([\s\S]*?)(?=EDUCATION|$)/i);
  if (!expMatch) return experiences;
  
  const expText = expMatch[1];
  
  // Find all date ranges (anchors for job entries)
  const datePattern = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\s*[-–—]\s*((?:Present|Current|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}))/gi;
  
  let match;
  const dateMatches: { start: string; end: string; index: number; fullMatch: string }[] = [];
  while ((match = datePattern.exec(expText)) !== null) {
    dateMatches.push({ start: match[1], end: match[2], index: match.index, fullMatch: match[0] });
  }
  
  // Extract job info around each date
  for (let i = 0; i < dateMatches.length && experiences.length < 10; i++) {
    const { start, end, index, fullMatch } = dateMatches[i];
    
    // Get text before this date range (from end of previous job's bullets to this date)
    // For first job, start from beginning; for others, find a good boundary
    let searchStart = 0;
    if (i > 0) {
      // Find the last bullet point before this date
      const prevSection = expText.substring(0, index);
      const lastBulletIdx = prevSection.lastIndexOf('•');
      if (lastBulletIdx > dateMatches[i-1].index) {
        // Find end of that bullet (next bullet or next company)
        const afterBullet = prevSection.substring(lastBulletIdx);
        const nextBreak = afterBullet.search(/\s{2,}[A-Z][A-Za-z]/);
        searchStart = lastBulletIdx + (nextBreak > 0 ? nextBreak : 50);
      } else {
        searchStart = dateMatches[i-1].index + dateMatches[i-1].fullMatch.length;
      }
    }
    
    const beforeDate = expText.substring(searchStart, index).trim();
    // Company is usually the last capitalized phrase before the date
    const companyMatch = beforeDate.match(/([A-Z][A-Za-z\s&,\.]+?)\s*$/);
    const company = companyMatch ? companyMatch[1].trim() : "";
    
    // Get text after date (for position) - look for text before first bullet
    const afterDateStart = index + fullMatch.length;
    const afterDate = expText.substring(afterDateStart, afterDateStart + 100);
    const positionMatch = afterDate.match(/^\s*([A-Za-z\s\-\/]+?)(?=\s{2,}•|\s*$)/);
    const position = positionMatch ? positionMatch[1].trim() : "";
    
    if (company && !/^(experience|education|skills)/i.test(company)) {
      experiences.push({
        id: `exp-${experiences.length + 1}`,
        company,
        position,
        startDate: start,
        endDate: end,
        highlights: [],
      });
    }
  }
  
  // Extract bullet points and distribute to experiences based on position in text
  const bulletPattern = /•\s*([^•]+)/g;
  const bullets: { text: string; index: number }[] = [];
  let bulletMatch;
  while ((bulletMatch = bulletPattern.exec(expText)) !== null) {
    let bulletText = bulletMatch[1].trim();
    
    // Clean bullet text - remove trailing company names and dates that bled in
    // Pattern: "...text. Company Name Month Year - Month Year Title"
    const bleedPattern = /\s+[A-Z][A-Za-z\s&,\.]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*[-–—].*$/i;
    bulletText = bulletText.replace(bleedPattern, '').trim();
    
    // Also remove if it ends with a company-like pattern followed by date
    const trailingCompany = /\s+[A-Z][A-Za-z\s&]+(?:Inc|LLC|Corp|Technology|Solutions|Systems|Services)\s*$/i;
    bulletText = bulletText.replace(trailingCompany, '').trim();
    
    bullets.push({ text: bulletText, index: bulletMatch.index });
  }
  
  for (let i = 0; i < experiences.length; i++) {
    const currentDateIdx = dateMatches[i]?.index ?? 0;
    const nextDateIdx = dateMatches[i + 1]?.index ?? expText.length;
    
    // Find bullets between this job's date and the next job's date
    for (const bullet of bullets) {
      if (bullet.index > currentDateIdx && 
          bullet.index < nextDateIdx &&
          experiences[i].highlights.length < 5) {
        if (bullet.text.length > 20) {
          experiences[i].highlights.push(bullet.text.slice(0, 300));
        }
      }
    }
  }
  
  return experiences;
}

function extractEducation(text: string): Array<{ id: string; institution: string; degree: string; field: string; startDate: string; endDate?: string }> {
  const education: Array<{ id: string; institution: string; degree: string; field: string; startDate: string; endDate?: string }> = [];
  
  // Find education section
  const eduMatch = text.match(/EDUCATION\s+([\s\S]*?)(?=EXPERIENCE|SKILLS|PROJECTS|$)/i);
  if (!eduMatch) return education;
  
  const eduText = eduMatch[1];
  
  // Find all institution matches
  const uniPattern = /([A-Z][A-Za-z\s]+(?:University|College|Institute|School)[A-Za-z\s,]*)/gi;
  const degreePattern = /((?:B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|MBA|Ph\.?D\.?|Bachelor|Master|Associate)[A-Za-z\s,\.in]*)/gi;
  const yearPattern = /\b(19|20)\d{2}\b/g;
  
  const institutions: string[] = [];
  const degrees: string[] = [];
  const years: string[] = [];
  
  let match;
  while ((match = uniPattern.exec(eduText)) !== null) {
    institutions.push(match[1].trim());
  }
  while ((match = degreePattern.exec(eduText)) !== null) {
    degrees.push(match[1].trim());
  }
  while ((match = yearPattern.exec(eduText)) !== null) {
    years.push(match[0]);
  }
  
  // Create education entries - pair institutions with degrees where possible
  const entryCount = Math.max(institutions.length, degrees.length, 1);
  for (let i = 0; i < entryCount && (institutions[i] || degrees[i]); i++) {
    education.push({
      id: `edu-${i + 1}`,
      institution: institutions[i] || "",
      degree: degrees[i] || "",
      field: "",
      startDate: years[i * 2] || years[i] || "",
      endDate: years[i * 2 + 1] || undefined,
    });
  }
  
  return education;
}
