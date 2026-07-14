import type { ResumeContent } from "@shared/schema";

export const EDITOR_TABS = [
  "personal",
  "experience",
  "education",
  "skills",
  "projects",
] as const;

export type ResumeHistorySection = "experience" | "education" | "projects";

export type ResumeEditorChangeHandler = (
  updates: Partial<ResumeContent>,
  options?: { coalesceKey?: ResumeHistorySection },
) => void;

export type ResumeEditorCommitHandler = (section: ResumeHistorySection) => void;
