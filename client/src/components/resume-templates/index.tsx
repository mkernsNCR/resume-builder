import type { ResumeContent, ResumeTemplate } from "@shared/schema";
import { ModernTemplate } from "./modern-template";
import { ClassicTemplate } from "./classic-template";
import { MinimalTemplate } from "./minimal-template";
import { CreativeTemplate } from "./creative-template";

interface ResumePreviewProps {
  content: ResumeContent;
  template: ResumeTemplate;
}

export function ResumePreview({ content, template }: ResumePreviewProps) {
  switch (template) {
    case "modern":
      return <ModernTemplate content={content} />;
    case "classic":
      return <ClassicTemplate content={content} />;
    case "minimal":
      return <MinimalTemplate content={content} />;
    case "creative":
      return <CreativeTemplate content={content} />;
    default:
      return <ModernTemplate content={content} />;
  }
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
