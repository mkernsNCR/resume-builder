import { useState, useRef, useCallback, useEffect, type MouseEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { FileUpload } from "@/components/file-upload";
import { ExtractedTextDisplay } from "@/components/extracted-text-display";
import { ResumeEditor } from "@/components/resume-editor";
import { TemplateSelector } from "@/components/template-selector";
import { ResumePreview } from "@/components/resume-templates";
import { PAGE_WIDTH, PAGE_HEIGHT, TOP_MARGIN } from "@/lib/page-constants";
import type { Resume, ResumeContent, ResumeTemplate } from "@shared/schema";
import {
  FileText,
  Download,
  Save,
  Loader2,
  Plus,
  Eye,
  Edit3,
  Palette,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Copy,
  Undo2,
  Redo2,
  Menu,
} from "lucide-react";

const defaultContent: ResumeContent = {
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

type SaveRequest = {
  content: ResumeContent;
  template: string;
  title: string;
  resumeId: string | null;
  createId: string | null;
  editorVersion: number;
  showToast?: boolean;
  signal?: AbortSignal;
};

function getAutosaveFingerprint(
  content: ResumeContent,
  template: ResumeTemplate,
): string {
  return JSON.stringify([template, content]);
}

export default function Home() {
  const { toast } = useToast();
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
  const currentResumeIdRef = useRef<string | null>(null);
  const editorVersionRef = useRef(0);
  const {
    present: content,
    set: setContent,
    undo,
    redo,
    reset: resetContent,
    canUndo,
    canRedo,
  } = useUndoRedo<ResumeContent>(defaultContent);
  const [template, setTemplate] = useState<ResumeTemplate>("modern");
  const [extractedText, setExtractedText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [activeTab, setActiveTab] = useState("upload");
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null);
  const [duplicatingResumeIds, setDuplicatingResumeIds] = useState<Set<string>>(
    () => new Set()
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const pendingSaveRef = useRef<SaveRequest | null>(null);
  const activeSaveControllerRef = useRef<AbortController | null>(null);
  const createResumeIdRef = useRef<string | null>(null);

  const advanceEditorGeneration = () => {
    editorVersionRef.current += 1;
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    pendingSaveRef.current = null;
    createResumeIdRef.current = null;
    activeSaveControllerRef.current?.abort();
    activeSaveControllerRef.current = null;
  };

  // Fetch all resumes
  const { data: resumes, isLoading: loadingResumes } = useQuery<Resume[]>({
    queryKey: ["/api/resumes"],
  });

  // Save resume mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SaveRequest) => {
      if (data.resumeId) {
        return apiRequest("PUT", `/api/resumes/${data.resumeId}`, {
          title: data.title,
          content: data.content,
          template: data.template,
        }, data.signal);
      } else {
        if (!data.createId) {
          throw new Error("Missing create request ID");
        }
        return apiRequest("POST", "/api/resumes", {
          id: data.createId,
          title: data.title,
          content: data.content,
          template: data.template,
        }, data.signal);
      }
    },
    onSuccess: async (response, variables) => {
      const result = await response.json();
      const isCurrentGeneration =
        variables.editorVersion === editorVersionRef.current;
      if (
        !variables.resumeId &&
        isCurrentGeneration &&
        !currentResumeIdRef.current
      ) {
        currentResumeIdRef.current = result.id;
        if (createResumeIdRef.current === variables.createId) {
          createResumeIdRef.current = null;
        }
        setCurrentResumeId(result.id);
        // mutateAsync resolves only after onSuccess completes, so this ID is
        // applied before the queue dequeues a follow-up create request. Keep
        // that ordering guarantee if the mutation flow is ever refactored.
        if (
          pendingSaveRef.current?.resumeId === null &&
          pendingSaveRef.current.editorVersion === variables.editorVersion
        ) {
          pendingSaveRef.current.resumeId = result.id;
          pendingSaveRef.current.createId = null;
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      if (isCurrentGeneration && variables.showToast !== false) {
        toast({
          title: "Resume saved",
          description: "Your changes have been saved successfully.",
        });
      }
    },
    onError: (_error, variables) => {
      if (
        variables.showToast === false ||
        variables.editorVersion !== editorVersionRef.current
      ) {
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save resume. Please try again.",
        variant: "destructive",
      });
    },
  });
  const saveResume = saveMutation.mutateAsync;

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: (data) => {
      setExtractedText(data.extractedText || "");
      
      // If we have parsed content, pre-fill the form
      if (data.parsedContent) {
        const parsed = data.parsedContent;
        setContent(prev => ({
          ...prev,
          fullName: parsed.fullName || prev.fullName,
          title: parsed.title || prev.title,
          summary: parsed.summary || prev.summary,
          contact: {
            email: parsed.contact?.email || prev.contact?.email || "",
            phone: parsed.contact?.phone || prev.contact?.phone || "",
            location: parsed.contact?.location || prev.contact?.location || "",
            linkedin: parsed.contact?.linkedin || prev.contact?.linkedin || "",
            website: parsed.contact?.website || prev.contact?.website || "",
          },
          skills: parsed.skills?.length > 0 ? parsed.skills : prev.skills,
          experience: parsed.experience?.length > 0 ? parsed.experience : prev.experience,
          education: parsed.education?.length > 0 ? parsed.education : prev.education,
          projects: parsed.projects?.length > 0 ? parsed.projects : prev.projects,
        }));
        
        // Create a new resume with the parsed content
        advanceEditorGeneration();
        currentResumeIdRef.current = null;
        setCurrentResumeId(null);
      }
      
      // Auto-switch to Edit tab so user can review and edit
      setActiveTab("edit");
      
      toast({
        title: "Resume uploaded successfully",
        description: "We've extracted your information. Please review and edit as needed.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Could not extract text from the file. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete resume mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/resumes/${id}`);
    },
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      // If we deleted the current resume, reset to new
      if (deletedId === currentResumeId) {
        advanceEditorGeneration();
        currentResumeIdRef.current = null;
        setCurrentResumeId(null);
        resetContent(defaultContent);
        setExtractedText("");
      }
      setDeletingResumeId(null);
      toast({
        title: "Resume deleted",
        description: "The resume has been removed.",
      });
    },
    onError: () => {
      setDeletingResumeId(null);
      toast({
        title: "Error",
        description: "Failed to delete resume. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteResume = (
    e: MouseEvent<HTMLButtonElement>,
    resumeId: string
  ) => {
    e.stopPropagation(); // Prevent card click
    setDeletingResumeId(resumeId);
    deleteMutation.mutate(resumeId);
  };

  // Duplicate resume mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/resumes/${id}/duplicate`);
    },
    onSuccess: async (response, sourceId) => {
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      if (currentResumeIdRef.current === sourceId) {
        loadResume(result);
        setMobileSidebarOpen(false);
      }
      toast({
        title: "Resume duplicated",
        description: "A copy has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate resume. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: (_data, _error, sourceId) => {
      setDuplicatingResumeIds((current) => {
        const next = new Set(current);
        next.delete(sourceId);
        return next;
      });
    },
  });

  const handleDuplicateResume = (
    e: MouseEvent<HTMLButtonElement>,
    resumeId: string
  ) => {
    e.stopPropagation();
    setDuplicatingResumeIds((current) => {
      const next = new Set(current);
      next.add(resumeId);
      return next;
    });
    duplicateMutation.mutate(resumeId);
  };

  const handleFileSelect = useCallback((file: File) => {
    setIsUploading(true);
    uploadMutation.mutate(file, {
      onSettled: () => setIsUploading(false),
    });
  }, []);

  const handleContentChange = useCallback((updates: Partial<ResumeContent>) => {
    setContent((prev) => ({ ...prev, ...updates }));
  }, [setContent]);

  const processSaveQueue = useCallback(async () => {
    if (saveInFlightRef.current) return;

    saveInFlightRef.current = true;
    try {
      while (pendingSaveRef.current) {
        const request = pendingSaveRef.current;
        pendingSaveRef.current = null;
        if (request.editorVersion !== editorVersionRef.current) {
          continue;
        }

        const controller = new AbortController();
        activeSaveControllerRef.current = controller;
        try {
          await saveResume({ ...request, signal: controller.signal });
        } catch {
          if (request.editorVersion !== editorVersionRef.current) {
            continue;
          }
          // A newer edit supersedes the failed value and should be processed
          // immediately. Otherwise retain this value for the next trigger.
          if (pendingSaveRef.current) {
            continue;
          }
          pendingSaveRef.current = request;
          break;
        } finally {
          if (activeSaveControllerRef.current === controller) {
            activeSaveControllerRef.current = null;
          }
        }
      }
    } finally {
      saveInFlightRef.current = false;
    }
  }, [saveResume]);

  const handleSave = useCallback((opts?: { showToast?: boolean }) => {
    if (opts?.showToast !== false && autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const title = content.fullName 
      ? `${content.fullName}${content.title ? ` - ${content.title}` : ""}` 
      : "Untitled Resume";
    const resumeId = currentResumeIdRef.current;
    if (!resumeId && !createResumeIdRef.current) {
      createResumeIdRef.current = crypto.randomUUID();
    }
    pendingSaveRef.current = {
      content,
      template,
      title,
      resumeId,
      createId: resumeId ? null : createResumeIdRef.current,
      editorVersion: editorVersionRef.current,
      showToast: opts?.showToast,
    };
    void processSaveQueue();
  }, [content, template, processSaveQueue]);

  // Autosave with debouncing — saves 2s after content/template stops changing
  const skipAutosaveFingerprintRef = useRef<string | null>(
    getAutosaveFingerprint(defaultContent, "modern"),
  );
  useEffect(() => {
    const skippedFingerprint = skipAutosaveFingerprintRef.current;
    skipAutosaveFingerprintRef.current = null;
    if (skippedFingerprint === getAutosaveFingerprint(content, template)) {
      return;
    }
    if (!content.fullName) return;
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      handleSave({ showToast: false });
    }, 2000);
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [content, template, handleSave]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // Client-side PDF export using html2canvas + jsPDF (lazy-loaded)
  const handleExportPDF = async () => {
    setIsExporting(true);

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      // Create a temporary container for full-size rendering
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      tempContainer.style.width = `${PAGE_WIDTH}px`;
      tempContainer.style.backgroundColor = "white";
      document.body.appendChild(tempContainer);

      // Try to find the visible preview, but fall back to creating a temporary one
      let resumePreview: Element | null = null;
      const contentScroll = printRef.current?.querySelector(".resume-content-scroll");
      resumePreview = contentScroll?.querySelector(".resume-preview") ?? null;
      
      // If visible preview is not found, create a temporary hidden one for export
      let temporaryPreviewContainer: HTMLDivElement | null = null;
      if (!resumePreview) {
        // Import and render the template directly for export
        const { ModernTemplate } = await import("@/components/resume-templates/modern-template");
        const { ClassicTemplate } = await import("@/components/resume-templates/classic-template");
        const { MinimalTemplate } = await import("@/components/resume-templates/minimal-template");
        const { CreativeTemplate } = await import("@/components/resume-templates/creative-template");
        const ReactDOMClient = await import("react-dom/client");
        const React = await import("react");
        
        temporaryPreviewContainer = document.createElement("div");
        temporaryPreviewContainer.style.position = "absolute";
        temporaryPreviewContainer.style.left = "-9999px";
        temporaryPreviewContainer.style.top = "0";
        document.body.appendChild(temporaryPreviewContainer);
        
        const TemplateComponent = 
          template === "modern" ? ModernTemplate :
          template === "classic" ? ClassicTemplate :
          template === "minimal" ? MinimalTemplate :
          template === "creative" ? CreativeTemplate : ModernTemplate;
        
        const root = ReactDOMClient.createRoot(temporaryPreviewContainer);
        root.render(React.createElement(TemplateComponent, { content, allowOverflow: true }));
        
        // Wait for render
        await new Promise(r => setTimeout(r, 200));
        
        resumePreview = temporaryPreviewContainer.querySelector(".resume-preview");
        if (!resumePreview) {
          root.unmount();
          document.body.removeChild(temporaryPreviewContainer);
          throw new Error("Failed to create temporary preview for export");
        }
        
        // Unmount the React root now that we've found the preview element
        root.unmount();
      }

      // Clone for measurement and modification
      const measureClone = resumePreview.cloneNode(true) as HTMLElement;
      measureClone.style.height = "auto";
      measureClone.style.overflow = "visible";
      tempContainer.appendChild(measureClone);
      
      // Wait for render
      await new Promise(r => setTimeout(r, 100));
      
      // Find all sections and measure their positions
      const sections = measureClone.querySelectorAll("section, header");
      const sectionData: { el: HTMLElement; top: number; height: number }[] = [];
      
      sections.forEach((section) => {
        const el = section as HTMLElement;
        const rect = el.getBoundingClientRect();
        const containerRect = measureClone.getBoundingClientRect();
        sectionData.push({
          el,
          top: rect.top - containerRect.top,
          height: rect.height,
        });
      });
      
      // Add padding before sections that would be split across pages
      let addedPadding = 0;
      for (const section of sectionData) {
        const adjustedTop = section.top + addedPadding;
        const sectionEnd = adjustedTop + section.height;
        const pageStart = Math.floor(adjustedTop / PAGE_HEIGHT) * PAGE_HEIGHT;
        const pageEnd = pageStart + PAGE_HEIGHT;
        
        // If section starts on one page but ends on another, push it to next page
        // Only do this if the section fits on a single page
        if (adjustedTop >= pageStart && sectionEnd > pageEnd && section.height < PAGE_HEIGHT) {
          const paddingNeeded = pageEnd - adjustedTop;
          section.el.style.marginTop = `${paddingNeeded + 20}px`; // 20px extra spacing
          addedPadding += paddingNeeded + 20;
        }
      }
      
      // Re-measure after padding adjustments
      await new Promise(r => setTimeout(r, 50));
      const totalHeight = measureClone.scrollHeight;
      const numPages = Math.max(1, Math.ceil(totalHeight / PAGE_HEIGHT));
      
      // Create PDF (US Letter size: 8.5 x 11 inches = 612 x 792 points)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "letter",
      });

      const imgWidth = 612;
      const imgHeight = 792;

      // Render each page from the adjusted clone
      
      for (let pageNum = 0; pageNum < numPages; pageNum++) {
        // Create a page container with clipped content
        const pageContainer = document.createElement("div");
        pageContainer.style.width = `${PAGE_WIDTH}px`;
        pageContainer.style.height = `${PAGE_HEIGHT}px`;
        pageContainer.style.overflow = "hidden";
        pageContainer.style.position = "relative";
        pageContainer.style.backgroundColor = "white";
        
        // Clone the adjusted content for this page
        const pageContent = measureClone.cloneNode(true) as HTMLElement;
        
        // Calculate content offset - account for top margin on subsequent pages
        const contentOffset = pageNum === 0 
          ? 0 
          : (pageNum * PAGE_HEIGHT) - TOP_MARGIN;
        pageContent.style.transform = `translateY(-${contentOffset}px)`;
        pageContainer.appendChild(pageContent);
        
        // For pages after the first, add a white overlay to cover the top margin area
        // This prevents any bleeding content from showing
        if (pageNum > 0) {
          const topOverlay = document.createElement("div");
          topOverlay.style.position = "absolute";
          topOverlay.style.top = "0";
          topOverlay.style.left = "0";
          topOverlay.style.width = "100%";
          topOverlay.style.height = `${TOP_MARGIN}px`;
          topOverlay.style.backgroundColor = "white";
          topOverlay.style.zIndex = "10";
          pageContainer.appendChild(topOverlay);
        }
        
        // Use a separate render container
        const renderContainer = document.createElement("div");
        renderContainer.style.position = "absolute";
        renderContainer.style.left = "-9999px";
        renderContainer.style.top = "0";
        document.body.appendChild(renderContainer);
        renderContainer.appendChild(pageContainer);

        // Generate canvas for this page
        const canvas = await html2canvas(pageContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          windowWidth: PAGE_WIDTH,
        });

        const imgData = canvas.toDataURL("image/png");
        
        if (pageNum > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        
        document.body.removeChild(renderContainer);
      }

      // Download
      const fileName = `${content.fullName || "resume"}.pdf`;
      pdf.save(fileName);

      // Cleanup
      document.body.removeChild(tempContainer);
      if (temporaryPreviewContainer && document.body.contains(temporaryPreviewContainer)) {
        document.body.removeChild(temporaryPreviewContainer);
      }

      toast({
        title: "Export complete",
        description: `Your resume has been downloaded as PDF${numPages > 1 ? ` (${numPages} pages)` : ""}.`,
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Export failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const loadResume = (resume: Resume) => {
    const nextContent = resume.content as ResumeContent;
    const nextTemplate = resume.template as ResumeTemplate;
    skipAutosaveFingerprintRef.current = getAutosaveFingerprint(
      nextContent,
      nextTemplate,
    );
    advanceEditorGeneration();
    currentResumeIdRef.current = resume.id;
    setCurrentResumeId(resume.id);
    resetContent(nextContent);
    setTemplate(nextTemplate);
  };

  const createNewResume = () => {
    skipAutosaveFingerprintRef.current = getAutosaveFingerprint(
      defaultContent,
      "modern",
    );
    advanceEditorGeneration();
    currentResumeIdRef.current = null;
    setCurrentResumeId(null);
    resetContent(defaultContent);
    setTemplate("modern");
    setExtractedText("");
  };

  return (
    <div className="h-screen flex flex-col min-h-0">
      {/* Header */}
      <header className="border-b bg-card shrink-0">
        <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden shrink-0"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>My Resumes</SheetTitle>
                </SheetHeader>
                <div className="p-4 border-b">
                  <Button
                    className="w-full shadow-sm"
                    onClick={() => {
                      createNewResume();
                      setMobileSidebarOpen(false);
                    }}
                    data-testid="button-new-resume-mobile"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Resume
                  </Button>
                </div>
                <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
                  <div className="px-4 py-4 space-y-3">
                    {loadingResumes ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Loading resumes...</p>
                      </div>
                    ) : resumes && resumes.length > 0 ? (
                      resumes.map((resume) => (
                        <div
                          key={resume.id}
                          className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 hover:shadow-md text-left w-full ${
                            currentResumeId === resume.id
                              ? "bg-background border-primary/50 shadow-sm ring-1 ring-primary/20"
                              : "bg-card border-transparent hover:border-border/50 hover:bg-card/80"
                          }`}
                        >
                          <button
                            type="button"
                            className="flex flex-1 min-w-0 items-center gap-3 text-left cursor-pointer"
                            onClick={() => {
                              loadResume(resume);
                              setMobileSidebarOpen(false);
                            }}
                            data-testid={`resume-card-mobile-${resume.id}`}
                          >
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                              currentResumeId === resume.id
                                ? "bg-primary/10 border-primary/20 text-primary"
                                : "bg-muted/50 border-transparent text-muted-foreground group-hover:bg-background group-hover:text-foreground"
                            }`}>
                              <FileText className="h-5 w-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className={`font-medium text-sm truncate leading-none mb-1.5 ${
                                currentResumeId === resume.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                              }`}>
                                {resume.title || "Untitled Resume"}
                              </h3>
                              <p className="text-[11px] text-muted-foreground/80 truncate">
                                Edited {new Date(resume.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground/50 hover:text-foreground hover:bg-muted -mr-0.5 transition-all"
                            onClick={(e) => handleDuplicateResume(e, resume.id)}
                            disabled={duplicatingResumeIds.has(resume.id)}
                            data-testid={`button-duplicate-resume-mobile-${resume.id}`}
                            aria-label={`Duplicate ${resume.title || "Untitled Resume"}`}
                          >
                            {duplicatingResumeIds.has(resume.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 -mr-1 transition-all"
                            onClick={(e) => handleDeleteResume(e, resume.id)}
                            disabled={deletingResumeId === resume.id}
                            data-testid={`button-delete-resume-mobile-${resume.id}`}
                            aria-label={`Delete ${resume.title || "Untitled Resume"}`}
                          >
                            {deletingResumeId === resume.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 px-4 border-2 border-dashed rounded-xl border-muted-foreground/20">
                        <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                          <FileText className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          No resumes yet
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                          Create your first resume to get started
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
            <h1 className="text-base sm:text-lg font-semibold truncate">Resume Builder</h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 pr-10 sm:pr-12 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={!canUndo}
              data-testid="button-undo"
              aria-label="Undo"
              className="h-8 w-8"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={!canRedo}
              data-testid="button-redo"
              aria-label="Redo"
              className="h-8 w-8"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave()}
              disabled={saveMutation.isPending}
              data-testid="button-save"
              className="px-2 sm:px-3"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden sm:inline ml-1.5">Save</span>
            </Button>
            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting || !content.fullName}
              data-testid="button-export"
              className="px-2 sm:px-3"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline ml-1.5">Export PDF</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar - Resume List */}
        <aside className="w-80 border-r bg-sidebar/50 hidden lg:flex flex-col shrink-0">
          <div className="p-4 border-b bg-sidebar/95 backdrop-blur z-10 sticky top-0">
            <Button
              className="w-full shadow-sm"
              onClick={createNewResume}
              data-testid="button-new-resume"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Resume
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4 space-y-3">
              {loadingResumes ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Loading resumes...</p>
                </div>
              ) : resumes && resumes.length > 0 ? (
                resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 hover:shadow-md text-left w-full ${
                      currentResumeId === resume.id
                        ? "bg-background border-primary/50 shadow-sm ring-1 ring-primary/20"
                        : "bg-card border-transparent hover:border-border/50 hover:bg-card/80"
                    }`}
                  >
                    <button
                      type="button"
                      className="flex flex-1 min-w-0 items-center gap-3 text-left cursor-pointer"
                      onClick={() => loadResume(resume)}
                      data-testid={`resume-card-${resume.id}`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                        currentResumeId === resume.id
                          ? "bg-primary/10 border-primary/20 text-primary"
                          : "bg-muted/50 border-transparent text-muted-foreground group-hover:bg-background group-hover:text-foreground"
                      }`}>
                        <FileText className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium text-sm truncate leading-none mb-1.5 ${
                          currentResumeId === resume.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                        }`}>
                          {resume.title || "Untitled Resume"}
                        </h3>
                        <p className="text-[11px] text-muted-foreground/80 truncate">
                          Edited {new Date(resume.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground/50 hover:text-foreground hover:bg-muted -mr-0.5 transition-all"
                      onClick={(e) => handleDuplicateResume(e, resume.id)}
                      disabled={duplicatingResumeIds.has(resume.id)}
                      data-testid={`button-duplicate-resume-${resume.id}`}
                      aria-label={`Duplicate ${resume.title || "Untitled Resume"}`}
                    >
                      {duplicatingResumeIds.has(resume.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 -mr-1 transition-all"
                      onClick={(e) => handleDeleteResume(e, resume.id)}
                      disabled={deletingResumeId === resume.id}
                      data-testid={`button-delete-resume-${resume.id}`}
                      aria-label={`Delete ${resume.title || "Untitled Resume"}`}
                    >
                      {deletingResumeId === resume.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 px-4 border-2 border-dashed rounded-xl border-muted-foreground/20">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    No resumes yet
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Create your first resume to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Editor Panel */}
          <div
            className={`${
              showPreview ? "lg:w-1/2" : "w-full"
            } flex flex-col border-r`}
          >
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col"
            >
              <div className="border-b px-4 py-2 flex items-center justify-between gap-2">
                <TabsList className="h-9">
                  <TabsTrigger
                    value="upload"
                    className="text-xs"
                    data-testid="main-tab-upload"
                  >
                    Upload
                  </TabsTrigger>
                  <TabsTrigger
                    value="edit"
                    className="text-xs"
                    data-testid="main-tab-edit"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </TabsTrigger>
                  <TabsTrigger
                    value="template"
                    className="text-xs"
                    data-testid="main-tab-template"
                  >
                    <Palette className="w-3.5 h-3.5 mr-1" />
                    Template
                  </TabsTrigger>
                  <TabsTrigger
                    value="preview"
                    className="text-xs lg:hidden"
                    data-testid="main-tab-preview"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Preview
                  </TabsTrigger>
                </TabsList>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="hidden lg:flex"
                  data-testid="button-toggle-preview"
                >
                  {showPreview ? (
                    <>
                      <ChevronRight className="w-4 h-4 mr-1" />
                      Hide Preview
                    </>
                  ) : (
                    <>
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Show Preview
                    </>
                  )}
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4">
                  <TabsContent value="upload" className="m-0">
                    <div className="space-y-6">
                      <div className="text-center py-4">
                        <h2 className="text-xl font-semibold mb-2">
                          Get Started with Your Resume
                        </h2>
                        <p className="text-muted-foreground">
                          Upload your existing resume to automatically extract your information
                        </p>
                      </div>
                      <FileUpload
                        onFileSelect={handleFileSelect}
                        onExtractedText={setExtractedText}
                        isLoading={isUploading}
                      />
                      {extractedText && (
                        <ExtractedTextDisplay text={extractedText} />
                      )}
                      <div className="text-center pt-2">
                        <p className="text-sm text-muted-foreground mb-2">
                          Or prefer to start fresh?
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            skipAutosaveFingerprintRef.current =
                              getAutosaveFingerprint(defaultContent, template);
                            advanceEditorGeneration();
                            currentResumeIdRef.current = null;
                            resetContent(defaultContent);
                            setCurrentResumeId(null);
                            setActiveTab("edit");
                          }}
                          data-testid="button-skip-upload"
                        >
                          Create Resume Manually
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="edit" className="m-0">
                    {extractedText && (
                      <ExtractedTextDisplay text={extractedText} />
                    )}
                    <ResumeEditor
                      key={currentResumeId || "new"}
                      content={content}
                      onChange={handleContentChange}
                    />
                  </TabsContent>

                  <TabsContent value="template" className="m-0">
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-lg font-semibold mb-2">
                          Choose a Template
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select a professional template that best represents
                          your style.
                        </p>
                      </div>
                      <TemplateSelector
                        selectedTemplate={template}
                        onSelectTemplate={setTemplate}
                        previewContent={content}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="preview" className="m-0 lg:hidden">
                    <div className="flex flex-col items-center">
                      <div className="text-center mb-4">
                        <h2 className="text-lg font-semibold mb-1">
                          Live Preview
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          See how your resume looks in real-time
                        </p>
                      </div>
                      <div className="w-full pb-4 flex justify-center overflow-hidden">
                        <div
                          className="relative"
                          style={{
                            width: `${816 * 0.45}px`,
                          }}
                        >
                          <div
                            className="origin-top-left"
                            style={{
                              transform: 'scale(0.45)',
                              width: '816px',
                            }}
                          >
                            <ResumePreview content={content} template={template} paginated />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="hidden lg:flex lg:w-1/2 flex-col bg-muted/30" data-testid="live-preview-panel">
              <div className="border-b px-4 py-2 bg-card flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Live Preview</span>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6 flex justify-center overflow-hidden">
                  <div
                    className="relative"
                    style={{
                      width: `${816 * 0.65}px`,
                    }}
                  >
                    <div
                      ref={printRef}
                      className="origin-top-left"
                      style={{
                        transform: 'scale(0.65)',
                        transformOrigin: 'top left',
                        width: '816px',
                      }}
                    >
                      <ResumePreview content={content} template={template} paginated />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
