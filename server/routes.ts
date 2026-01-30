import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { createRequire } from "module";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { storage, seedDatabase } from "./storage";
import { insertResumeSchema, resumeContentSchema, type ResumeContent } from "@shared/schema";

const require = createRequire(import.meta.url);

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF and Word documents are allowed."));
    }
  },
});

// Update schema for validation
const updateResumeSchema = z.object({
  title: z.string().optional(),
  template: z.string().optional(),
  content: resumeContentSchema.optional(),
});

// Text extraction functions
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const pdfParse = require("pdf-parse");
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || "";
  } catch (error) {
    console.error("PDF extraction error:", error);
    return "";
  }
}

async function extractTextFromDOCX(filePath: string): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || "";
  } catch (error) {
    console.error("DOCX extraction error:", error);
    return "";
  }
}

// Parse extracted text to get structured resume data
function parseResumeText(text: string): Partial<ResumeContent> {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  const result: Partial<ResumeContent> = {
    fullName: "",
    title: "",
    summary: "",
    contact: {
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      website: "",
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
  };

  // Extract email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex);
  if (emails && emails.length > 0) {
    result.contact!.email = emails[0];
  }

  // Extract phone number
  const phoneRegex = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
  const phones = text.match(phoneRegex);
  if (phones && phones.length > 0) {
    result.contact!.phone = phones[0];
  }

  // Extract LinkedIn
  const linkedinRegex = /(?:linkedin\.com\/in\/|linkedin:?\s*)([a-zA-Z0-9-]+)/i;
  const linkedinMatch = text.match(linkedinRegex);
  if (linkedinMatch) {
    result.contact!.linkedin = `linkedin.com/in/${linkedinMatch[1]}`;
  }

  // Extract website
  const websiteRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
  const websites = text.match(websiteRegex);
  if (websites) {
    const personalSite = websites.find(w => !w.includes('linkedin') && !w.includes('github.com'));
    if (personalSite) {
      result.contact!.website = personalSite.replace(/^https?:\/\//, '').replace(/^www\./, '');
    }
  }

  // Try to extract name (usually first non-empty line that looks like a name)
  for (const line of lines.slice(0, 5)) {
    // Skip lines that look like contact info
    if (line.includes('@') || line.match(/\d{3}/) || line.includes('linkedin')) continue;
    // Check if it looks like a name (2-4 words, capitalized)
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && words.every(w => /^[A-Z]/.test(w))) {
      result.fullName = line;
      break;
    }
  }

  // Try to extract job title (usually near the name)
  const titleKeywords = ['engineer', 'developer', 'designer', 'manager', 'analyst', 'scientist', 'director', 'lead', 'senior', 'junior', 'specialist', 'consultant'];
  for (const line of lines.slice(0, 10)) {
    const lower = line.toLowerCase();
    if (titleKeywords.some(kw => lower.includes(kw)) && line.length < 80) {
      result.title = line;
      break;
    }
  }

  // Extract skills - look for common skill patterns
  const skillKeywords = ['skills', 'technologies', 'technical skills', 'expertise'];
  let inSkillsSection = false;
  const foundSkills: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    
    if (skillKeywords.some(kw => lower.includes(kw))) {
      inSkillsSection = true;
      continue;
    }
    
    if (inSkillsSection) {
      // Stop at next section header
      if (/^(experience|education|projects|work|employment)/i.test(lower)) {
        break;
      }
      // Parse comma or pipe separated skills
      const skills = line.split(/[,|•·]/g).map(s => s.trim()).filter(s => s && s.length < 30);
      foundSkills.push(...skills);
    }
  }
  
  result.skills = foundSkills.slice(0, 15).map((name, idx) => ({
    id: `skill-${idx + 1}`,
    name,
    level: 'intermediate' as const,
  }));

  return result;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed database on startup
  await seedDatabase();

  // Get all resumes
  app.get("/api/resumes", async (req: Request, res: Response) => {
    try {
      const resumes = await storage.getAllResumes();
      res.json(resumes);
    } catch (error) {
      console.error("Error fetching resumes:", error);
      res.status(500).json({ error: "Failed to fetch resumes" });
    }
  });

  // Get single resume
  app.get("/api/resumes/:id", async (req: Request, res: Response) => {
    try {
      const resume = await storage.getResume(req.params.id);
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }
      res.json(resume);
    } catch (error) {
      console.error("Error fetching resume:", error);
      res.status(500).json({ error: "Failed to fetch resume" });
    }
  });

  // Create resume
  app.post("/api/resumes", async (req: Request, res: Response) => {
    try {
      const validationResult = insertResumeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors });
      }
      const resume = await storage.createResume(validationResult.data);
      res.status(201).json(resume);
    } catch (error) {
      console.error("Error creating resume:", error);
      res.status(500).json({ error: "Failed to create resume" });
    }
  });

  // Update resume with validation
  app.put("/api/resumes/:id", async (req: Request, res: Response) => {
    try {
      // Validate the update payload
      const validationResult = updateResumeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors });
      }

      // Check if resume exists
      const existingResume = await storage.getResume(req.params.id);
      if (!existingResume) {
        return res.status(404).json({ error: "Resume not found" });
      }

      // Update with validated data
      const updateData = validationResult.data;
      
      // If content is provided but no title, derive title from content
      if (updateData.content && !updateData.title) {
        const fullName = updateData.content.fullName;
        const title = updateData.content.title;
        updateData.title = fullName 
          ? `${fullName}${title ? ` - ${title}` : ""}`
          : existingResume.title;
      }

      const resume = await storage.updateResume(req.params.id, updateData);
      res.json(resume);
    } catch (error) {
      console.error("Error updating resume:", error);
      res.status(500).json({ error: "Failed to update resume" });
    }
  });

  // Delete resume
  app.delete("/api/resumes/:id", async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteResume(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Resume not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting resume:", error);
      res.status(500).json({ error: "Failed to delete resume" });
    }
  });

  // Upload file and extract text
  app.post("/api/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const filePath = req.file.path;
      const mimeType = req.file.mimetype;
      let extractedText = "";

      if (mimeType === "application/pdf") {
        extractedText = await extractTextFromPDF(filePath);
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
      ) {
        extractedText = await extractTextFromDOCX(filePath);
      }

      // Clean up uploaded file after extraction
      fs.unlink(filePath, (err) => {
        if (err) console.error("Error deleting uploaded file:", err);
      });

      // Parse the extracted text to get structured data
      const parsedContent = parseResumeText(extractedText);

      res.json({
        filename: req.file.originalname,
        extractedText: extractedText.trim(),
        parsedContent,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to process file" });
    }
  });

  return httpServer;
}
