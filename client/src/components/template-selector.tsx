import { RESUME_TEMPLATES, type ResumeTemplate, type ResumeContent } from "@shared/schema";
import { templateInfo, ResumePreview } from "./resume-templates";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

interface TemplateSelectorProps {
  selectedTemplate: ResumeTemplate;
  onSelectTemplate: (template: ResumeTemplate) => void;
  previewContent: ResumeContent;
}

export function TemplateSelector({
  selectedTemplate,
  onSelectTemplate,
  previewContent,
}: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {RESUME_TEMPLATES.map((template) => (
        <Card
          key={template}
          className={`cursor-pointer overflow-hidden hover-elevate active-elevate-2 transition-all ${
            selectedTemplate === template
              ? "ring-2 ring-primary ring-offset-2"
              : ""
          }`}
          onClick={() => onSelectTemplate(template)}
          data-testid={`template-${template}`}
        >
          <div className="relative">
            {/* Mini Preview */}
            <div className="h-48 overflow-hidden bg-white border-b">
              <div className="transform scale-[0.18] origin-top-left w-[816px]">
                <ResumePreview content={previewContent} template={template} />
              </div>
            </div>
            
            {/* Selected Indicator */}
            {selectedTemplate === template && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          
          {/* Template Info */}
          <div className="p-3">
            <h3 className="font-medium text-sm">{templateInfo[template].name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {templateInfo[template].description}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
