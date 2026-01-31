import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { createRequire } from "module";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { storage, seedDatabase } from "./storage";
import { insertResumeSchema, resumeContentSchema, type ResumeContent } from "@shared/schema";
import { parseResumeText } from "./resume-parser";

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
    // Use pdfjs-dist with proper Node.js configuration
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    
    // Disable worker for server-side usage
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";
    
    const dataBuffer = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(dataBuffer);
    
    const loadingTask = pdfjsLib.getDocument({ 
      data: uint8Array,
      disableFontFace: true,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }
    
    return fullText.trim();
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
