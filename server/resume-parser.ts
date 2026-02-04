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
    'architect', 'director', 'lead', 'senior', 'specialist', 'consultant', 'tester', 'intern'];
  
  // Only look in the header area (before major sections)
  // Use multiline-aware lookahead to match section markers at start of line
  const headerMatch = text.match(/^([\s\S]*?)(?=^\s*(?:EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|PROJECTS|EDUCATION|SKILLS|TECH STACK|SUMMARY|PROFILE)\b)/im);
  
  // Fall back to first 10 lines if no section marker found
  let headerText: string;
  if (headerMatch) {
    headerText = headerMatch[1];
  } else {
    const lines = text.split(/\n/).slice(0, 10);
    headerText = lines.join('\n');
  }
  const lines = headerText.split(/\n/).map(l => l.trim()).filter(l => l);
  
  // First pass: look for a standalone title line (short line with title keyword)
  for (const line of lines) {
    const lower = line.toLowerCase();
    // Skip section headers, contact info, names
    if (/^(experience|education|skills|summary|profile|tech)/i.test(line)) continue;
    if (/@|linkedin|\d{3}.*\d{4}|https?:/i.test(line)) continue;
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(line)) continue; // Skip names
    
    // A title line is typically short and contains a title keyword
    if (titleKeywords.some(kw => lower.includes(kw)) && line.length < 50 && line.length > 5) {
      return line.replace(/\s+/g, ' ').trim();
    }
  }
  
  // Second pass: extract title from summary text like "front-end engineer with..."
  const summaryText = headerText.toLowerCase();
  for (const kw of titleKeywords) {
    // SAFETY NOTE: kw originates from the hardcoded titleKeywords array (not user input),
    // so constructing new RegExp with kw interpolation is safe from ReDoS attacks.
    // titleKeywords contains simple lowercase strings like 'engineer', 'developer', etc.
    const titleMatch = summaryText.match(new RegExp(`((?:senior|junior|lead|staff|principal)?\\s*(?:front[- ]?end|back[- ]?end|full[- ]?stack|software|web|ui|ux)?\\s*${kw})`, 'i'));
    if (titleMatch) {
      // Capitalize properly
      return titleMatch[1].split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').replace(/-\s*/g, '-');
    }
  }
  
  return "";
}

function extractSummary(text: string): string {
  // Try to find a labeled summary/profile section first
  // Allow end-of-string as an alternative to following section
  const summaryMatch = text.match(/(?:SUMMARY|OBJECTIVE|PROFILE|ABOUT)\s*\n?\s*([\s\S]*?)(?=(?:^|\n)\s*(?:TECH STACK|EXPERIENCE|WORK EXPERIENCE|EDUCATION|SKILLS)\b|$)/i);
  if (summaryMatch) {
    // Extract summary content, removing contact info lines
    let content = summaryMatch[1];
    // Remove email lines
    content = content.replace(/.*@.*\.(com|org|net|edu).*\n?/gi, '');
    // Remove phone lines
    content = content.replace(/.*\d{3}[-.\s]?\d{3}[-.\s]?\d{4}.*\n?/g, '');
    // Remove URL lines  
    content = content.replace(/.*https?:\/\/.*\n?/gi, '');
    content = content.replace(/.*linkedin\.com.*\n?/gi, '');
    
    // Join remaining text
    const cleanSummary = content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanSummary.length > 50) {
      return cleanSummary.slice(0, 500);
    }
  }
  
  // Fallback: look for "Forward-thinking" or similar professional summary patterns
  const allText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const summaryPatterns = [
    /(Forward-thinking[^.]+(?:\.[^.]+){0,2}\.)/i,
    /(Experienced\s+\w+\s+(?:engineer|developer)[^.]+(?:\.[^.]+){0,2}\.)/i,
    /(Results-driven[^.]+(?:\.[^.]+){0,2}\.)/i,
  ];
  
  for (const pattern of summaryPatterns) {
    const match = allText.match(pattern);
    if (match && match[1].length > 80) {
      return match[1].trim().slice(0, 500);
    }
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
  // Match EXPERIENCE (or variations) followed by content until next section or end
  const expMatch = text.match(/(?:^|\n)\s*(?:EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE)\s*\n([\s\S]*?)(?=(?:^|\n)\s*(?:EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS)\s*(?:\n|$)|$)/i);
  if (!expMatch) return experiences;
  
  // Clean up the experience text - remove page break artifacts like "PROFILE" headers mid-section
  let expText = expMatch[1];
  // Remove stray page numbers, contact info, and PROFILE headers that appear due to PDF page breaks
  expText = expText.replace(/\+?1?[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g, ''); // Phone numbers
  expText = expText.replace(/https?:\/\/[^\s]+/gi, ''); // URLs
  expText = expText.replace(/\d+\s*\n?\s*PROFILE\s*\n?/gi, '\n'); // Page numbers + PROFILE header
  expText = expText.replace(/\n\s*PROFILE\s*\n/gi, '\n'); // Standalone PROFILE header
  
  // Find all date ranges (anchors for job entries)
  // Support formats with flexible spacing for PDF extraction issues
  const monthPattern = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?';
  const dateFormats = [
    // Month Year - Month Year or Present (handles multiple spaces)
    `(${monthPattern}\\s+\\d{4})\\s*[-–—]+\\s*((?:Present|Current|Now|${monthPattern}\\s+\\d{4}))`,
    // MM/YYYY format
    `(\\d{1,2}\\/\\d{4})\\s*[-–—]+\\s*((?:Present|Current|Now|\\d{1,2}\\/\\d{4}))`,
    // Year only format
    `(\\b\\d{4})\\s*[-–—]+\\s*((?:Present|Current|Now|\\d{4}))\\b`,
  ];
  const datePattern = new RegExp(dateFormats.join('|'), 'gi');
  
  let match;
  const dateMatches: { start: string; end: string; index: number; fullMatch: string }[] = [];
  while ((match = datePattern.exec(expText)) !== null) {
    // With alternation, capture groups vary by which format matched
    const start = (match[1] || match[3] || match[5] || "").replace(/\s+/g, ' ').trim();
    const end = (match[2] || match[4] || match[6] || "").replace(/\s+/g, ' ').trim();
    if (start && end) {
      dateMatches.push({ start, end, index: match.index, fullMatch: match[0] });
    }
  }
  
  // Extract job info around each date
  for (let i = 0; i < dateMatches.length && experiences.length < 10; i++) {
    const { start, end, index, fullMatch } = dateMatches[i];
    
    // Get text before this date (company name)
    // Look backwards from the date to find company name
    let searchStart = 0;
    if (i > 0) {
      // Start after the previous job's position/title line
      const prevEnd = dateMatches[i-1].index + dateMatches[i-1].fullMatch.length;
      // Find the next newline after previous date (end of position line)
      const afterPrevDate = expText.substring(prevEnd);
      const nextNewline = afterPrevDate.indexOf('\n');
      if (nextNewline > 0) {
        // Find the last bullet of previous job
        const searchArea = expText.substring(prevEnd + nextNewline, index);
        const lastBullet = searchArea.lastIndexOf('•');
        if (lastBullet > 0) {
          // Find end of that bullet line
          const bulletEnd = searchArea.substring(lastBullet).indexOf('\n');
          searchStart = prevEnd + nextNewline + lastBullet + (bulletEnd > 0 ? bulletEnd : 0);
        } else {
          searchStart = prevEnd + nextNewline;
        }
      }
    }
    
    const beforeDate = expText.substring(searchStart, index);
    // Company: look for capitalized words/phrases on last line before date
    const lines = beforeDate.trim().split('\n');
    const lastLine = lines[lines.length - 1] || '';
    // Clean up the company name
    let company = lastLine.replace(/[•\-–—]/g, '').trim();
    // Remove any trailing date fragments
    company = company.replace(/\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*$/i, '').trim();
    
    // Get text after date (position/title)
    const afterDateStart = index + fullMatch.length;
    const afterDate = expText.substring(afterDateStart);
    // Position is typically on same line or next line, before bullets
    const positionMatch = afterDate.match(/^[\s\n]*([A-Za-z][A-Za-z\s\-\/&]+?)(?=\s*\n|\s*•|$)/);
    let position = positionMatch ? positionMatch[1].trim() : "";
    // Clean up position - fix hyphenated titles
    position = position.replace(/\s+-/g, '-').replace(/-\s+/g, '-');
    
    if (company && company.length > 2 && !/^(experience|education|skills)/i.test(company)) {
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
    
    // Clean bullet text: remove any trailing company/date that got merged in
    // Pattern: company name followed by date at end of bullet
    const trailingJobPattern = /\s+[A-Z][a-zA-Z\s&]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\d\-–—]+(?:Present|Current|\d{4}).*$/i;
    bulletText = bulletText.replace(trailingJobPattern, '').trim();
    
    // Also remove trailing company names without dates (next job header)
    // Look for pattern like "Company Name\nTitle" at end
    bulletText = bulletText.replace(/\s+[A-Z][a-zA-Z\s&]{5,}\s*$/m, '').trim();
    
    bullets.push({ text: bulletText, index: bulletMatch.index });
  }
  
  for (let i = 0; i < experiences.length; i++) {
    const currentDateIdx = dateMatches[i]?.index ?? 0;
    const nextDateIdx = dateMatches[i + 1]?.index ?? expText.length;
    
    // Find bullets between this job's date and the next job's date
    for (const bullet of bullets) {
      const inRange = bullet.index > currentDateIdx && bullet.index < nextDateIdx;
      if (inRange && experiences[i].highlights.length < 5) {
        // Skip if bullet contains next job's info
        const hasNextJobInfo = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*[-–—]/i.test(bullet.text);
        // Minimum length of 10 chars to filter noise
        if (bullet.text.length > 10 && !hasNextJobInfo) {
          experiences[i].highlights.push(bullet.text.slice(0, 300));
        }
      }
    }
  }
  
  return experiences;
}

function extractEducation(text: string): Array<{ id: string; institution: string; degree: string; field: string; startDate: string; endDate?: string }> {
  const education: Array<{ id: string; institution: string; degree: string; field: string; startDate: string; endDate?: string }> = [];
  
  // Find education section - it may appear at the end of the document
  const eduMatch = text.match(/EDUCATION\s+([\s\S]*?)(?=EXPERIENCE|SKILLS|PROJECTS|PROFILE|$)/i);
  if (!eduMatch) return education;
  
  const eduText = eduMatch[1];
  
  // Split by lines and look for institution + degree patterns
  const lines = eduText.split('\n').map(l => l.trim()).filter(l => l);
  
  // Institution patterns - include common non-university institutions
  const institutionKeywords = ['university', 'college', 'institute', 'school', 'academy', 'assembly'];
  // Degree patterns - include certificates
  const degreeKeywords = ['b.s.', 'bs', 'b.a.', 'ba', 'm.s.', 'ms', 'm.a.', 'ma', 'mba', 'ph.d.', 'phd', 
    'bachelor', 'master', 'associate', 'certificate', 'diploma'];
  
  let currentEntry: { institution: string; degree: string; field: string; year: string } | null = null;
  
  for (const line of lines) {
    const lower = line.toLowerCase();
    const yearMatch = line.match(/\b(19|20)\d{2}\b/);
    
    // Check if this line contains an institution
    const hasInstitution = institutionKeywords.some(kw => lower.includes(kw));
    // Check if this line contains a degree
    const hasDegree = degreeKeywords.some(kw => lower.includes(kw));
    
    if (hasInstitution) {
      // Check if we have an incomplete entry (degree-first case with empty institution)
      if (currentEntry && !currentEntry.institution.trim()) {
        // Merge: fill in the missing institution instead of pushing incomplete entry
        currentEntry.institution = line;
        if (yearMatch) currentEntry.year = yearMatch[0];
      } else {
        // Save previous entry if it has both institution and degree
        if (currentEntry && currentEntry.institution.trim() && currentEntry.degree.trim()) {
          education.push({
            id: `edu-${education.length + 1}`,
            institution: currentEntry.institution,
            degree: currentEntry.degree,
            field: currentEntry.field,
            startDate: currentEntry.year,
          });
        }
        currentEntry = { institution: line, degree: '', field: '', year: yearMatch?.[0] || '' };
      }
    } else if (hasDegree) {
      if (currentEntry) {
        currentEntry.degree = line;
        if (yearMatch) currentEntry.year = yearMatch[0];
      } else {
        currentEntry = { institution: '', degree: line, field: '', year: yearMatch?.[0] || '' };
      }
    } else if (yearMatch && currentEntry) {
      currentEntry.year = yearMatch[0];
    }
  }
  
  // Don't forget the last entry - only push if both institution and degree are non-empty
  if (currentEntry && currentEntry.institution.trim() && currentEntry.degree.trim()) {
    education.push({
      id: `edu-${education.length + 1}`,
      institution: currentEntry.institution,
      degree: currentEntry.degree,
      field: currentEntry.field,
      startDate: currentEntry.year,
    });
  }
  
  return education;
}
