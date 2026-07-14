import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalInfoForm } from "./personal-info-form";
import { ExperienceForm } from "./experience-form";
import { EducationForm } from "./education-form";
import { SkillsForm } from "./skills-form";
import { ProjectsForm } from "./projects-form";
import type { ResumeContent } from "@shared/schema";
import type {
  EditorTab,
  ResumeEditorChangeHandler,
  ResumeEditorCommitHandler,
} from "./types";
import { EDITOR_TABS } from "./types";
import {
  User,
  Briefcase,
  GraduationCap,
  Sparkles,
  FolderKanban,
} from "lucide-react";

interface ResumeEditorProps {
  content: ResumeContent;
  onChange: ResumeEditorChangeHandler;
  onCommit: ResumeEditorCommitHandler;
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
}

export function ResumeEditor({
  content,
  onChange,
  onCommit,
  activeTab,
  onTabChange,
}: ResumeEditorProps) {
  const handleTabChange = (tab: string) => {
    if (EDITOR_TABS.includes(tab as EditorTab)) {
      onTabChange(tab as EditorTab);
    }
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="w-full"
      data-resume-editor
    >
      <TabsList className="w-full grid grid-cols-5 mb-4">
        <TabsTrigger
          value={EDITOR_TABS[0]}
          className="flex items-center gap-1.5 text-xs sm:text-sm"
          data-testid="tab-personal"
        >
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">Personal</span>
        </TabsTrigger>
        <TabsTrigger
          value={EDITOR_TABS[1]}
          className="flex items-center gap-1.5 text-xs sm:text-sm"
          data-testid="tab-experience"
        >
          <Briefcase className="w-4 h-4" />
          <span className="hidden sm:inline">Experience</span>
        </TabsTrigger>
        <TabsTrigger
          value={EDITOR_TABS[2]}
          className="flex items-center gap-1.5 text-xs sm:text-sm"
          data-testid="tab-education"
        >
          <GraduationCap className="w-4 h-4" />
          <span className="hidden sm:inline">Education</span>
        </TabsTrigger>
        <TabsTrigger
          value={EDITOR_TABS[3]}
          className="flex items-center gap-1.5 text-xs sm:text-sm"
          data-testid="tab-skills"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Skills</span>
        </TabsTrigger>
        <TabsTrigger
          value={EDITOR_TABS[4]}
          className="flex items-center gap-1.5 text-xs sm:text-sm"
          data-testid="tab-projects"
        >
          <FolderKanban className="w-4 h-4" />
          <span className="hidden sm:inline">Projects</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value={EDITOR_TABS[0]}>
        <PersonalInfoForm content={content} onChange={onChange} />
      </TabsContent>

      <TabsContent value={EDITOR_TABS[1]}>
        <ExperienceForm
          content={content}
          onChange={onChange}
          onCommit={onCommit}
        />
      </TabsContent>

      <TabsContent value={EDITOR_TABS[2]}>
        <EducationForm
          content={content}
          onChange={onChange}
          onCommit={onCommit}
        />
      </TabsContent>

      <TabsContent value={EDITOR_TABS[3]}>
        <SkillsForm content={content} onChange={onChange} />
      </TabsContent>

      <TabsContent value={EDITOR_TABS[4]}>
        <ProjectsForm
          content={content}
          onChange={onChange}
          onCommit={onCommit}
        />
      </TabsContent>
    </Tabs>
  );
}

export {
  EDITOR_TABS,
  PersonalInfoForm,
  ExperienceForm,
  EducationForm,
  SkillsForm,
  ProjectsForm,
};
