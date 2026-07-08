import { useState, useCallback, useRef } from "react";

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

const MAX_HISTORY = 50;

export function useUndoRedo<T>(initial: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  const skipNextRef = useRef(false);

  const set = useCallback((updater: T | ((prev: T) => T), options?: { skipHistory?: boolean }) => {
    setState((current) => {
      const nextValue = typeof updater === "function"
        ? (updater as (prev: T) => T)(current.present)
        : updater;

      if (options?.skipHistory || skipNextRef.current) {
        skipNextRef.current = false;
        return { ...current, present: nextValue };
      }

      const newPast = [...current.past, current.present].slice(-MAX_HISTORY);
      return {
        past: newPast,
        present: nextValue,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((current) => {
      if (current.past.length === 0) return current;
      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      if (current.future.length === 0) return current;
      const next = current.future[0];
      const newFuture = current.future.slice(1);
      return {
        past: [...current.past, current.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((value: T) => {
    skipNextRef.current = true;
    setState({ past: [], present: value, future: [] });
  }, []);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  return {
    present: state.present,
    set,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  };
}
