import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, test } from "vitest";
import { useUndoRedo } from "../../../client/src/hooks/use-undo-redo";

function renderUndoRedo<T>(initial: T) {
  let current: ReturnType<typeof useUndoRedo<T>> | undefined;
  let renderer: ReactTestRenderer | undefined;

  function Harness() {
    current = useUndoRedo(initial);
    return null;
  }

  act(() => {
    renderer = create(createElement(Harness));
  });

  return {
    result: () => {
      if (!current) throw new Error("Hook did not render");
      return current;
    },
    unmount: () => {
      act(() => renderer?.unmount());
    },
  };
}

describe("useUndoRedo", () => {
  test("undoes multiple set operations in order", () => {
    const hook = renderUndoRedo(0);
    try {
      act(() => {
        hook.result().set(1);
        hook.result().set(2);
        hook.result().set(3);
      });
      expect(hook.result()).toMatchObject({
        present: 3,
        canUndo: true,
        canRedo: false,
      });

      act(() => hook.result().undo());
      expect(hook.result()).toMatchObject({
        present: 2,
        canUndo: true,
        canRedo: true,
      });

      act(() => hook.result().undo());
      expect(hook.result().present).toBe(1);
    } finally {
      hook.unmount();
    }
  });

  test("clears redo history after a new set", () => {
    const hook = renderUndoRedo(0);
    try {
      act(() => {
        hook.result().set(1);
        hook.result().set(2);
      });
      act(() => hook.result().undo());
      expect(hook.result()).toMatchObject({ present: 1, canRedo: true });

      act(() => hook.result().set(9));
      expect(hook.result()).toMatchObject({
        present: 9,
        canUndo: true,
        canRedo: false,
      });

      act(() => hook.result().redo());
      expect(hook.result().present).toBe(9);
    } finally {
      hook.unmount();
    }
  });

  test("evicts the oldest state after reaching MAX_HISTORY", () => {
    const hook = renderUndoRedo(0);
    try {
      act(() => {
        for (let value = 1; value <= 51; value += 1) {
          hook.result().set(value);
        }
      });
      expect(hook.result().present).toBe(51);

      const undo = hook.result().undo;
      act(() => {
        for (let count = 0; count < 50; count += 1) undo();
      });
      expect(hook.result()).toMatchObject({
        present: 1,
        canUndo: false,
        canRedo: true,
      });
    } finally {
      hook.unmount();
    }
  });

  test("applies skipHistory updates without creating an undo entry", () => {
    const hook = renderUndoRedo(0);
    try {
      act(() => hook.result().set(1, { skipHistory: true }));
      expect(hook.result()).toMatchObject({
        present: 1,
        canUndo: false,
        canRedo: false,
      });

      act(() => hook.result().set(2));
      act(() => hook.result().undo());
      expect(hook.result()).toMatchObject({
        present: 1,
        canUndo: false,
        canRedo: true,
      });
    } finally {
      hook.unmount();
    }
  });

  test("commits a live update as one undoable history entry", () => {
    const hook = renderUndoRedo("initial");
    try {
      act(() => hook.result().set("draft", { skipHistory: true }));
      act(() => hook.result().commit("initial"));
      expect(hook.result()).toMatchObject({
        present: "draft",
        canUndo: true,
        canRedo: false,
      });

      act(() => hook.result().undo());
      expect(hook.result()).toMatchObject({
        present: "initial",
        canUndo: false,
        canRedo: true,
      });

      act(() => hook.result().redo());
      expect(hook.result().present).toBe("draft");
    } finally {
      hook.unmount();
    }
  });
});
