import type { Express, Response, NextFunction } from "express";
import { type Server } from "http";
import { createRequire } from "module";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { storage } from "./storage";
import {
  insertResumeSchema,
  deriveResumeTitle,
  RESUME_TITLE_MAX_LENGTH,
  pdfFilename,
  RESUME_TEMPLATES,
  resumeContentSchema,
} from "@shared/schema";
import { parseResumeText } from "./resume-parser";
import { fileTypeFromFile } from "file-type";
import { ApiError } from "./api-error";
import { scoreResume } from "./resume-scoring";
import { matchJobDescription } from "./job-matcher";
import { generateSuggestions } from "./content-suggestions";
import { generateResumePDF } from "./pdf-generator";
import { requireAuth, type AuthenticatedRequest } from "./auth";

const require = createRequire(import.meta.url);

async function validateFileType(
  filePath: string,
  claimedMimeType: string,
): Promise<boolean> {
  const type = await fileTypeFromFile(filePath);
  if (!type) return false;

  if (claimedMimeType === "application/pdf") {
    return type.mime === "application/pdf";
  }
  if (
    claimedMimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    // DOCX files are ZIP archives
    return (
      type.mime === "application/zip" ||
      type.mime ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  }

  return false;
}

function sanitizeFilename(filename: string): string {
  return path.basename(filename).replace(/[<>:"/\\|?*]/g, "_");
}

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
    files: 1,
    fields: 0,
    parts: 2,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        ApiError.badRequest(
          "Invalid file type. Only PDF and DOCX documents are allowed.",
          "INVALID_FILE_TYPE",
        ),
      );
    }
  },
});

// Update schema for validation
const updateResumeSchema = insertResumeSchema.partial();

const createResumeSchema = insertResumeSchema.extend({
  id: z.string().uuid().optional(),
});

const jobMatchSchema = z.object({
  jobDescription: z.string().trim().min(1).max(50_000),
});

const pdfExportSchema = z.object({
  content: resumeContentSchema,
  template: z.enum(RESUME_TEMPLATES).default("modern"),
  title: z.string().trim().max(200).optional(),
});

// Text extraction functions
async function extractTextFromPDF(filePath: string): Promise<string> {
  let parser: {
    load: () => Promise<void>;
    getText: () => Promise<{ pages: { text: string }[] }>;
    destroy: () => Promise<void>;
  } | null = null;
  try {
    // pdf-parse v2+ uses a class-based API that returns { pages: [{ text, num }] }
    const { PDFParse } = require("pdf-parse");
    const dataBuffer = fs.readFileSync(filePath);
    parser = new PDFParse({ data: dataBuffer });
    await parser!.load();
    const result = await parser!.getText();
    // Join all page texts together
    const text =
      result.pages?.map((p: { text: string }) => p.text).join("\n") || "";
    return text.trim();
  } catch (error) {
    console.error("PDF extraction error:", error);
    return "";
  } finally {
    if (parser) {
      await parser.destroy();
    }
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
  app: Express,
): Promise<Server> {
  // Authenticate before any record access, PDF generation or upload disk writes.
  app.use(["/api/resumes", "/api/upload"], requireAuth);

  // Get all resumes
  app.get(
    "/api/resumes",
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const resumes = await storage.getAllResumes(req.user!.id);
        res.json(resumes);
      } catch (error) {
        next(error);
      }
    },
  );

  // Get single resume
  app.get(
    "/api/resumes/:id",
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const resume = await storage.getResume(
          req.params.id as string,
          req.user!.id,
        );
        if (!resume) {
          throw ApiError.notFound("Resume not found", "RESUME_NOT_FOUND");
        }
        res.json(resume);
      } catch (error) {
        next(error);
      }
    },
  );

  // Create resume
  app.post(
    "/api/resumes",
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const validationResult = createResumeSchema.safeParse(req.body);
        if (!validationResult.success) {
          throw ApiError.badRequest("Invalid resume data", "VALIDATION_ERROR");
        }
        const resume = await storage.createResume(
          validationResult.data,
          req.user!.id,
        );
        res.status(201).json(resume);
      } catch (error) {
        next(error);
      }
    },
  );

  // Update resume with validation
  app.put(
    "/api/resumes/:id",
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Validate the update payload
        const validationResult = updateResumeSchema.safeParse(req.body);
        if (!validationResult.success) {
          throw ApiError.badRequest("Invalid resume data", "VALIDATION_ERROR");
        }

        // Check if resume exists
        const existingResume = await storage.getResume(
          req.params.id as string,
          req.user!.id,
        );
        if (!existingResume) {
          throw ApiError.notFound("Resume not found", "RESUME_NOT_FOUND");
        }

        // Update with validated data
        const updateData = validationResult.data;

        // If content is provided but no title, derive title from content
        if (updateData.content && !updateData.title) {
          const fullName = updateData.content.fullName;
          const title = updateData.content.title;
          updateData.title = deriveResumeTitle(fullName, title);
        }

        const resume = await storage.updateResume(
          req.params.id as string,
          updateData,
          req.user!.id,
        );
        if (!resume) {
          throw ApiError.notFound("Resume not found", "RESUME_NOT_FOUND");
        }
        res.json(resume);
      } catch (error) {
        next(error);
      }
    },
  );

  // Delete resume
  app.delete(
    "/api/resumes/:id",
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const deleted = await storage.deleteResume(
          req.params.id as string,
          req.user!.id,
        );
        if (!deleted) {
          throw ApiError.notFound("Resume not found", "RESUME_NOT_FOUND");
        }
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  // Duplicate resume
  app.post(
    "/api/resumes/:id/duplicate",
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const original = await storage.getResume(
          req.params.id as string,
          req.user!.id,
        );
        if (!original) {
          throw ApiError.notFound("Resume not found", "RESUME_NOT_FOUND");
        }
        const duplicate = await storage.createResume(
          {
            title: `${deriveResumeTitle(original.title).slice(0, RESUME_TITLE_MAX_LENGTH - 7)} (Copy)`,
            template: z
              .enum(RESUME_TEMPLATES)
              .catch("modern")
              .parse(original.template),
            content: original.content,
          },
          req.user!.id,
        );
        res.status(201).json(duplicate);
      } catch (error) {
        next(error);
      }
    },
  );

  // Score resume
  app.post(
    "/api/resumes/:id/score",
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const resume = await storage.getResume(
          req.params.id as string,
          req.user!.id,
        );
        if (!resume) {
          throw ApiError.notFound("Resume not found", "RESUME_NOT_FOUND");
        }
        res.json(scoreResume(resume.content));
      } catch (error) {
        next(error);
      }
    },
  );

  // Match resume against job description
  app.post(
    "/api/resumes/:id/match",
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const resume = await storage.getResume(
          req.params.id as string,
          req.user!.id,
        );
        if (!resume) {
          throw ApiError.notFound("Resume not found", "RESUME_NOT_FOUND");
        }
        const validationResult = jobMatchSchema.safeParse(req.body);
        if (!validationResult.success) {
          throw ApiError.badRequest(
            "jobDescription is required and must not exceed 50000 characters",
            "VALIDATION_ERROR",
          );
        }
        res.json(
          matchJobDescription(
            resume.content,
            validationResult.data.jobDescription,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  // AI content suggestions
  app.post(
    "/api/resumes/:id/suggestions",
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const resume = await storage.getResume(
          req.params.id as string,
          req.user!.id,
        );
        if (!resume) {
          throw ApiError.notFound("Resume not found", "RESUME_NOT_FOUND");
        }
        res.json(generateSuggestions(resume.content));
      } catch (error) {
        next(error);
      }
    },
  );

  // Export the editor's current in-memory content without requiring a save.
  app.post(
    "/api/resumes/pdf",
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const validationResult = pdfExportSchema.safeParse(req.body);
        if (!validationResult.success) {
          throw ApiError.badRequest(
            "Invalid PDF export data",
            "VALIDATION_ERROR",
          );
        }

        const { content, template, title } = validationResult.data;
        const doc = generateResumePDF(content, template);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${pdfFilename(title || content.fullName)}"`,
        );
        doc.once("error", next);
        doc.pipe(res);
        doc.end();
      } catch (error) {
        next(error);
      }
    },
  );

  // Server-side PDF generation for a saved resume.
  app.get(
    "/api/resumes/:id/pdf",
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const resume = await storage.getResume(
          req.params.id as string,
          req.user!.id,
        );
        if (!resume) {
          throw ApiError.notFound("Resume not found", "RESUME_NOT_FOUND");
        }
        const doc = generateResumePDF(resume.content, resume.template);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${pdfFilename(resume.title)}"`,
        );
        doc.once("error", next);
        doc.pipe(res);
        doc.end();
      } catch (error) {
        next(error);
      }
    },
  );

  // Upload file and extract text
  app.post(
    "/api/upload",
    upload.single("file"),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.file) {
        return next(ApiError.badRequest("No file uploaded", "NO_FILE"));
      }

      const filePath = req.file.path;
      try {
        const mimeType = req.file.mimetype;

        // Validate magic bytes match claimed MIME type
        const isValid = await validateFileType(filePath, mimeType);
        if (!isValid) {
          throw ApiError.badRequest(
            "File content does not match its type. Only PDF and DOCX documents are allowed.",
            "INVALID_FILE_TYPE",
          );
        }

        let extractedText = "";

        if (mimeType === "application/pdf") {
          extractedText = await extractTextFromPDF(filePath);
        } else if (
          mimeType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          extractedText = await extractTextFromDOCX(filePath);
        }

        if (!extractedText.trim()) {
          throw ApiError.badRequest(
            "No readable text could be extracted from this document",
            "EXTRACTION_FAILED",
          );
        }

        // Parse the extracted text to get structured data
        const parsedContent = parseResumeText(extractedText);

        res.json({
          filename: sanitizeFilename(req.file.originalname),
          extractedText: extractedText.trim(),
          parsedContent,
        });
      } catch (error) {
        next(error);
      } finally {
        // Always clean up the temp file, including on error paths
        fs.unlink(filePath, (err) => {
          if (err) console.error("Error deleting uploaded file:", err);
        });
      }
    },
  );

  return httpServer;
}
