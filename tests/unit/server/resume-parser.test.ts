import { describe, it, expect } from 'vitest';
import { parseResumeText } from '../../../server/resume-parser';

describe('parseResumeText', () => {
  describe('basic extraction', () => {
    it('should extract full name from header', () => {
      const text = `Matthew Kerns
Front-end Engineer
matthewkerns@email.com

EXPERIENCE
Company ABC  Apr 2023 - Present
Software Developer`;

      const result = parseResumeText(text);
      expect(result.fullName).toBe('Matthew Kerns');
    });

    it('should extract professional title', () => {
      const text = `John Smith
Senior Software Engineer
john@email.com

EXPERIENCE
Tech Corp  Jan 2020 - Present`;

      const result = parseResumeText(text);
      expect(result.title).toBe('Senior Software Engineer');
    });

    it('should extract title from summary text', () => {
      const text = `Jane Doe
jane@email.com

Forward-thinking front-end engineer with 8+ years of experience building web apps.

EXPERIENCE
Company XYZ  Jan 2020 - Present`;

      const result = parseResumeText(text);
      expect(result.title?.toLowerCase()).toContain('front-end engineer');
    });
  });

  describe('contact extraction', () => {
    it('should extract email address', () => {
      const text = `John Doe
test@example.com
555-123-4567

EXPERIENCE`;

      const result = parseResumeText(text);
      expect(result.contact?.email).toBe('test@example.com');
    });

    it('should extract phone number', () => {
      const text = `John Doe
john@email.com
+1-240-423-6684

EXPERIENCE`;

      const result = parseResumeText(text);
      expect(result.contact?.phone).toMatch(/240.*423.*6684/);
    });

    it('should extract LinkedIn URL', () => {
      const text = `John Doe
linkedin.com/in/johndoe
john@email.com

EXPERIENCE`;

      const result = parseResumeText(text);
      expect(result.contact?.linkedin).toContain('johndoe');
    });

    it('should extract location', () => {
      const text = `John Doe
Winter Haven, FL
john@email.com

EXPERIENCE`;

      const result = parseResumeText(text);
      expect(result.contact?.location).toContain('Winter Haven');
    });
  });

  describe('summary extraction', () => {
    it('should extract labeled SUMMARY section', () => {
      const text = `John Doe
john@email.com

SUMMARY
Experienced software engineer with expertise in React and TypeScript.

EXPERIENCE
Company ABC  Jan 2020 - Present`;

      const result = parseResumeText(text);
      expect(result.summary).toContain('Experienced software engineer');
      expect(result.summary).toContain('React');
    });

    it('should extract labeled PROFILE section', () => {
      const text = `John Doe
john@email.com

PROFILE
Forward-thinking developer focused on building accessible web applications.

EXPERIENCE
Company ABC  Jan 2020 - Present`;

      const result = parseResumeText(text);
      expect(result.summary).toContain('Forward-thinking developer');
    });

    it.todo('should extract summary at end of document - currently unsupported', () => {
      // TODO: Parser currently only extracts SUMMARY before EXPERIENCE
      const text = `John Doe
john@email.com

EXPERIENCE
Company ABC  Jan 2020 - Present
Developer

SUMMARY
Passionate engineer with 10 years of experience.`;

      const result = parseResumeText(text);
      expect(result.summary).toContain('Passionate engineer');
    });
  });

  describe('experience extraction', () => {
    it('should extract single job with company and dates', () => {
      const text = `John Doe

EXPERIENCE
Agile Six  Apr 2023 - May 2025
Front-end Engineer
• Built accessible web components using React

SKILLS
JavaScript`;

      const result = parseResumeText(text);
      expect(result.experience).toBeDefined();
      expect(result.experience?.length).toBeGreaterThanOrEqual(1);
      expect(result.experience?.[0].company).toContain('Agile Six');
      expect(result.experience?.[0].startDate).toContain('Apr 2023');
      expect(result.experience?.[0].endDate).toContain('May 2025');
    });

    it('should extract job position/title', () => {
      const text = `John Doe

EXPERIENCE
Tech Corp  Jan 2020 - Present
Senior Software Engineer
• Led team of 5 developers

EDUCATION`;

      const result = parseResumeText(text);
      expect(result.experience?.[0].position).toContain('Senior Software Engineer');
    });

    it('should extract multiple jobs', () => {
      const text = `John Doe

EXPERIENCE
Company A  Jan 2022 - Present
Developer
• Built features

Company B  Jun 2019 - Dec 2021
Junior Developer
• Fixed bugs

SKILLS`;

      const result = parseResumeText(text);
      expect(result.experience?.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract bullet point highlights', () => {
      const text = `John Doe

EXPERIENCE
Tech Corp  Jan 2020 - Present
Developer
• Implemented new authentication system reducing login time by 50%
• Built responsive dashboard with React and TypeScript
• Mentored 3 junior developers

SKILLS`;

      const result = parseResumeText(text);
      expect(result.experience?.[0].highlights?.length).toBeGreaterThanOrEqual(1);
      expect(result.experience?.[0].highlights?.[0]).toContain('authentication');
    });

    it('should handle Present/Current as end date', () => {
      const text = `John Doe

EXPERIENCE
Current Corp  Mar 2021 - Present
Developer

SKILLS`;

      const result = parseResumeText(text);
      expect(result.experience?.[0].endDate).toMatch(/present/i);
    });

    it('should handle various date formats', () => {
      const text = `John Doe

EXPERIENCE
Company A  January 2020 - December 2022
Developer

Company B  2018 - 2020
Engineer

SKILLS`;

      const result = parseResumeText(text);
      expect(result.experience?.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('skills extraction', () => {
    it('should extract skills from SKILLS section', () => {
      const text = `John Doe

EXPERIENCE
Company  Jan 2020 - Present

SKILLS
React, TypeScript, JavaScript, Node.js, PostgreSQL`;

      const result = parseResumeText(text);
      expect(result.skills).toBeDefined();
      expect(result.skills?.length).toBeGreaterThan(0);
    });

    it.todo('should extract skills from TECH STACK section - needs regex fix for section order');
  });

  describe('education extraction', () => {
    it('should extract education with institution and degree', () => {
      const text = `John Doe

EXPERIENCE
Company  Jan 2020 - Present

EDUCATION
University of Florida
Bachelor of Science in Computer Science  2018`;

      const result = parseResumeText(text);
      expect(result.education).toBeDefined();
      expect(result.education?.length).toBeGreaterThanOrEqual(1);
      expect(result.education?.[0].institution).toContain('University');
      expect(result.education?.[0].degree).toContain('Bachelor');
    });
  });

  describe('regression: pdf-parse v2 format', () => {
    it('should handle text without explicit section newlines', () => {
      const text = `Matthew Kerns
Winter Haven, FL
matthewkerns@ymail.com
Forward-thinking front-end engineer with 8+ years of experience building accessible, high-impact web applications for federal agencies and health-tech teams. Adept at delivering modern, scalable UIs using React 18, TypeScript, and WCAG 2.1-compliant practices.
EXPERIENCE
Agile Six  Apr 2023 - May 2025
Front-end Engineer
• Built accessible React components
SKILLS
React 18, TypeScript, JavaScript (ES6+)`;

      const result = parseResumeText(text);
      
      expect(result.fullName).toBe('Matthew Kerns');
      expect(result.contact?.location).toContain('Winter Haven');
      expect(result.contact?.email).toBe('matthewkerns@ymail.com');
      expect(result.experience?.length).toBeGreaterThanOrEqual(1);
      expect(result.experience?.[0].company).toContain('Agile Six');
    });

    it('should handle WORK EXPERIENCE as section header', () => {
      const text = `John Doe

WORK EXPERIENCE
Company ABC  Jan 2020 - Present
Developer
• Built features

SKILLS`;

      const result = parseResumeText(text);
      expect(result.experience?.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle PROFESSIONAL EXPERIENCE as section header', () => {
      const text = `John Doe

PROFESSIONAL EXPERIENCE
Company ABC  Jan 2020 - Present
Developer

SKILLS`;

      const result = parseResumeText(text);
      expect(result.experience?.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      const result = parseResumeText('');
      expect(result).toBeDefined();
      expect(result.experience).toEqual([]);
    });

    it('should handle text with only name', () => {
      const text = 'John Doe';
      const result = parseResumeText(text);
      expect(result.fullName).toBe('John Doe');
    });

    it('should handle broken words from PDF extraction', () => {
      const text = `John Doe

EXPERIENCE
Company  Jan 2020 - Present
Developer
• Bu il t new features using React
• Wro t e comprehensive t es ts

SKILLS`;

      const result = parseResumeText(text);
      const highlights = result.experience?.[0].highlights?.join(' ') || '';
      expect(highlights).toContain('Built');
      expect(highlights).toContain('Wrote');
      expect(highlights).toContain('tests');
    });
  });
});
