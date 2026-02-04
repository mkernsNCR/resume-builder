import type { ResumeContent, ResumeTemplate } from "@shared/schema";
import { ModernTemplate } from "./modern-template";
import { ClassicTemplate } from "./classic-template";
import { MinimalTemplate } from "./minimal-template";
import { CreativeTemplate } from "./creative-template";
import { PaginatedResume, getTemplateComponent } from "./paginated-resume";

interface ResumePreviewProps {
  content: ResumeContent;
  template: ResumeTemplate;
  paginated?: boolean;
  showPageControls?: boolean;
}

export function ResumePreview({ content, template, paginated = false, showPageControls = true }: ResumePreviewProps) {
  if (paginated) {
    return <PaginatedResume content={content} template={template} showPageControls={showPageControls} />;
  }
  
  const TemplateComponent = getTemplateComponent(template);
  return <TemplateComponent content={content} />;
}

export const templateInfo: Record<
  ResumeTemplate,
  { name: string; description: string }
> = {
  modern: {
    name: "Modern",
    description: "Clean design with blue accents and clear sections",
  },
  classic: {
    name: "Classic",
    description: "Traditional serif layout with centered header",
  },
  minimal: {
    name: "Minimal",
    description: "Ultra-clean design with generous whitespace",
  },
  creative: {
    name: "Creative",
    description: "Two-column layout with dark sidebar",
  },
};

export { ModernTemplate, ClassicTemplate, MinimalTemplate, CreativeTemplate };
