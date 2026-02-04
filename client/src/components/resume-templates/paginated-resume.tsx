import { useRef, useEffect, useState, type ReactNode } from "react";
import type { ResumeContent, ResumeTemplate } from "@shared/schema";
import { ModernTemplate } from "./modern-template";
import { ClassicTemplate } from "./classic-template";
import { MinimalTemplate } from "./minimal-template";
import { CreativeTemplate } from "./creative-template";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_HEIGHT, PAGE_WIDTH, CONTENT_HEIGHT } from "@/lib/page-constants";

// Shared template component registry - used by both PaginatedResume and ResumePreview
export const TEMPLATE_COMPONENTS = {
  modern: ModernTemplate,
  classic: ClassicTemplate,
  minimal: MinimalTemplate,
  creative: CreativeTemplate,
} as const;

export function getTemplateComponent(template: ResumeTemplate) {
  return TEMPLATE_COMPONENTS[template] ?? ModernTemplate;
}

interface PaginatedResumeProps {
  content: ResumeContent;
  template: ResumeTemplate;
  showPageControls?: boolean;
}

export function PaginatedResume({ content, template, showPageControls = true }: PaginatedResumeProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const measureRef = useRef<HTMLDivElement>(null);

  // Measure content to determine total pages and clamp currentPage
  useEffect(() => {
    if (measureRef.current) {
      const contentHeight = measureRef.current.scrollHeight;
      const pages = Math.max(1, Math.ceil(contentHeight / CONTENT_HEIGHT));
      setTotalPages(pages);
      // Clamp currentPage to not exceed new total
      setCurrentPage(prev => Math.min(prev, pages));
    }
  }, [content, template]);

  const TemplateComponent = getTemplateComponent(template);

  return (
    <div className="paginated-resume">
      {/* Page navigation */}
      {showPageControls && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Visible page with clip */}
      <div 
        className="resume-page-container relative bg-white"
        style={{ 
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          overflow: 'hidden',
        }}
      >
        <div
          ref={measureRef}
          className="resume-content-scroll"
          style={{
            transform: `translateY(-${(currentPage - 1) * CONTENT_HEIGHT}px)`,
            transition: 'transform 0.2s ease-out',
          }}
        >
          <TemplateComponent content={content} allowOverflow />
        </div>
        
      </div>
    </div>
  );
}

// For PDF export - renders all pages
export function PaginatedResumeForPrint({ content, template }: Omit<PaginatedResumeProps, 'showPageControls'>) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[]>([1]);

  useEffect(() => {
    if (measureRef.current) {
      const contentHeight = measureRef.current.scrollHeight;
      const numPages = Math.max(1, Math.ceil(contentHeight / CONTENT_HEIGHT));
      setPages(Array.from({ length: numPages }, (_, i) => i + 1));
    }
  }, [content, template]);

  const TemplateComponent = getTemplateComponent(template);

  return (
    <div className="paginated-resume-print">
      {/* Hidden measurement container */}
      <div 
        ref={measureRef}
        className="absolute opacity-0 pointer-events-none"
        style={{ width: PAGE_WIDTH }}
      >
        <TemplateComponent content={content} allowOverflow />
      </div>

      {/* Rendered pages */}
      {pages.map((pageNum) => (
        <div 
          key={pageNum}
          className="resume-page bg-white relative"
          style={{ 
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            overflow: 'hidden',
            pageBreakAfter: pageNum < pages.length ? 'always' : 'auto',
            marginBottom: pageNum < pages.length ? '20px' : 0,
          }}
        >
          <div
            style={{
              transform: `translateY(-${(pageNum - 1) * CONTENT_HEIGHT}px)`,
            }}
          >
            <TemplateComponent content={content} allowOverflow />
          </div>
          
        </div>
      ))}
    </div>
  );
}

