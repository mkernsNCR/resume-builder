import { useRef, useEffect, useState, useCallback } from "react";
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
  const [scale, setScale] = useState(1);
  const measureRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure available width and compute scale for mobile
  const updateScale = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const newScale = Math.min(1, (containerWidth - 32) / PAGE_WIDTH); // 32px for padding
      setScale(newScale);
    }
  }, []);

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

  // Update scale on mount and resize
  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  const TemplateComponent = getTemplateComponent(template);

  return (
    <div className="paginated-resume">
      {/* Page navigation - touch-friendly on mobile */}
      {showPageControls && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-3 sm:mb-4">
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 sm:p-1 rounded hover:bg-gray-100 disabled:opacity-30 touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto flex items-center justify-center"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5 sm:w-5 sm:h-5" />
          </button>
          <span className="text-xs sm:text-sm text-gray-600 px-2">
            <span className="sm:hidden">{currentPage}/{totalPages}</span>
            <span className="hidden sm:inline">Page {currentPage} of {totalPages}</span>
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 sm:p-1 rounded hover:bg-gray-100 disabled:opacity-30 touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto flex items-center justify-center"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5 sm:w-5 sm:h-5" />
          </button>
        </div>
      )}

      {/* Scrollable container for mobile */}
      <div 
        ref={containerRef}
        className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {/* Visible page with clip - scales on mobile */}
        <div 
          className="resume-page-container relative bg-white mx-auto"
          style={{ 
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            overflow: 'hidden',
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            marginBottom: scale < 1 ? `${PAGE_HEIGHT * (1 - scale)}px` : 0,
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

