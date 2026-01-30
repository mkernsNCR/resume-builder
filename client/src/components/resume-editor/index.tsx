import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalInfoForm } from "./personal-info-form";
import { ExperienceForm } from "./experience-form";
import { EducationForm } from "./education-form";
import { SkillsForm } from "./skills-form";
import { ProjectsForm } from "./projects-form";
import type { ResumeContent } from "@shared/schema";
import { User, Briefcase, GraduationCap, Sparkles, FolderKanban } from "lucide-react";

interface ResumeEditorProps {
  content: ResumeContent;
  onChange: (updates: Partial<ResumeContent>) => void;
}

export function ResumeEditor({ content, onChange }: ResumeEditorProps) {
  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList className="w-full grid grid-cols-5 mb-4">
        <TabsTrigger
          value="personal"
          className="flex items-center gap-1.5 text-xs sm:text-sm"
          data-testid="tab-personal"
        >
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">Personal</span>
        </TabsTrigger>
        <TabsTrigger
          value="experience"
          className="flex items-center gap-1.5 text-xs sm:text-sm"
          data-testid="tab-experience"
        >
          <Briefcase className="w-4 h-4" />
          <span className="hidden sm:inline">Experience</span>
        </TabsTrigger>
        <TabsTrigger
          value="education"
          className="flex items-center gap-1.5 text-xs sm:text-sm"
          data-testid="tab-education"
        >
          <GraduationCap className="w-4 h-4" />
          <span className="hidden sm:inline">Education</span>
        </TabsTrigger>
        <TabsTrigger
          value="skills"
          className="flex items-center gap-1.5 text-xs sm:text-sm"
          data-testid="tab-skills"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Skills</span>
        </TabsTrigger>
        <TabsTrigger
          value="projects"
          className="flex items-center gap-1.5 text-xs sm:text-sm"
          data-testid="tab-projects"
        >
          <FolderKanban className="w-4 h-4" />
          <span className="hidden sm:inline">Projects</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="personal">
        <PersonalInfoForm content={content} onChange={onChange} />
      </TabsContent>

      <TabsContent value="experience">
        <ExperienceForm content={content} onChange={onChange} />
      </TabsContent>

      <TabsContent value="education">
        <EducationForm content={content} onChange={onChange} />
      </TabsContent>

      <TabsContent value="skills">
        <SkillsForm content={content} onChange={onChange} />
      </TabsContent>

      <TabsContent value="projects">
        <ProjectsForm content={content} onChange={onChange} />
      </TabsContent>
    </Tabs>
  );
}

export { PersonalInfoForm, ExperienceForm, EducationForm, SkillsForm, ProjectsForm };
