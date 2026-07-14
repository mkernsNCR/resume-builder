import { useCallback } from "react";
import type { ResumeContent } from "@shared/schema";
import type {
  ResumeEditorChangeHandler,
  ResumeEditorCommitHandler,
  ResumeHistorySection,
} from "./types";

type ResumeHistoryItems = {
  experience: NonNullable<ResumeContent["experience"]>[number];
  education: NonNullable<ResumeContent["education"]>[number];
  projects: NonNullable<ResumeContent["projects"]>[number];
};

export function useSectionUpdater<Section extends ResumeHistorySection>(
  section: Section,
  items: readonly ResumeHistoryItems[Section][],
  onChange: ResumeEditorChangeHandler,
) {
  return useCallback(
    (
      id: string,
      updates: Partial<ResumeHistoryItems[Section]>,
      coalesce = false,
    ) => {
      const updated = items.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      );
      onChange(
        { [section]: updated } as Partial<ResumeContent>,
        coalesce ? { coalesceKey: section } : undefined,
      );
    },
    [items, onChange, section],
  );
}

export function useSectionCommit(
  section: ResumeHistorySection,
  onCommit: ResumeEditorCommitHandler,
) {
  return useCallback(() => onCommit(section), [onCommit, section]);
}
