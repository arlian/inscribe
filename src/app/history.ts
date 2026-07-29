import type { TextLayer } from "./types";

const MAX_HISTORY = 100;

export class LayerHistory {
  private undoStack: TextLayer[] = [];
  private redoStack: TextLayer[] = [];
  private pending: TextLayer | null = null;

  constructor(initial: TextLayer) {
    this.pending = { ...initial };
  }

  /** Call once before a drag/edit gesture begins, capturing the pre-change state. */
  begin(current: TextLayer): void {
    this.pending = { ...current };
  }

  /** Call when a gesture ends (pointerup, blur, button click) to commit the change. */
  commit(next: TextLayer): void {
    if (!this.pending) {
      this.pending = { ...next };
      return;
    }
    if (layersEqual(this.pending, next)) {
      this.pending = null;
      return;
    }
    this.undoStack.push(this.pending);
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack = [];
    this.pending = null;
  }

  undo(current: TextLayer): TextLayer | null {
    const previous = this.undoStack.pop();
    if (!previous) return null;
    this.redoStack.push({ ...current });
    return previous;
  }

  redo(current: TextLayer): TextLayer | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push({ ...current });
    return next;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}

function layersEqual(a: TextLayer, b: TextLayer): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.fontSizePx === b.fontSizePx &&
    a.fontFamily === b.fontFamily &&
    a.color === b.color &&
    a.align === b.align &&
    a.vAlign === b.vAlign
  );
}
