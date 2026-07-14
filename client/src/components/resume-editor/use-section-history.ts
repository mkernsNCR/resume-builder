import { useCallback } from "react";
import type { ResumeContent } from "@shared/schema";
import type {
  ResumeEditorChangeHandler,
  ResumeEditorCommitHandler,
  ResumeHistorySection,
} from "./types";

export function useSectionUpdater<
  Item extends { id: string },
  Section extends ResumeHistorySection,
>(
  section: Section,
  items: readonly Item[],
  onChange: ResumeEditorChangeHandler,
) {
  return useCallback(
    (id: string, updates: Partial<Item>, coalesce = false) => {
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
