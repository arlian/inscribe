import { store } from "../app/state";
import type { TextLayer } from "../app/types";
import { computeSnapGuides, snapToGrid, snapToNearest } from "./guides";

const MIN_SIZE = 20;
const MIN_FONT_SIZE = 6;
const SNAP_THRESHOLD_PX = 6;
const NUDGE_SMALL = 1;
const NUDGE_LARGE = 10;

type HandleId = "nw" | "ne" | "sw" | "se" | "w" | "e";

interface HandleFlags {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
  isCorner: boolean;
}

const HANDLES: Record<HandleId, HandleFlags> = {
  nw: { left: true, right: false, top: true, bottom: false, isCorner: true },
  ne: { left: false, right: true, top: true, bottom: false, isCorner: true },
  sw: { left: true, right: false, top: false, bottom: true, isCorner: true },
  se: { left: false, right: true, top: false, bottom: true, isCorner: true },
  w: { left: true, right: false, top: false, bottom: false, isCorner: false },
  e: { left: false, right: true, top: false, bottom: false, isCorner: false },
};

interface DragState {
  mode: "move" | "resize";
  handle: HandleId | null;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startLayer: TextLayer;
}

export class TextLayerOverlay {
  private canvas: HTMLCanvasElement;
  private layerEl: HTMLElement;
  private guideV: HTMLElement;
  private guideH: HTMLElement;
  private drag: DragState | null = null;
  private unsubscribe: () => void;

  constructor(canvas: HTMLCanvasElement, layerEl: HTMLElement, guideV: HTMLElement, guideH: HTMLElement) {
    this.canvas = canvas;
    this.layerEl = layerEl;
    this.guideV = guideV;
    this.guideH = guideH;

    this.layerEl.addEventListener("pointerdown", this.onBoxPointerDown);
    this.layerEl.addEventListener("keydown", this.onKeyDown);
    for (const handleEl of Array.from(this.layerEl.querySelectorAll<HTMLElement>("[data-handle]"))) {
      handleEl.addEventListener("pointerdown", this.onHandlePointerDown);
    }

    this.unsubscribe = store.subscribe(() => this.render());
    window.addEventListener("resize", () => this.render());
    this.render();
  }

  destroy(): void {
    this.unsubscribe();
  }

  private displayScale(): number | null {
    const rect = this.canvas.getBoundingClientRect();
    if (this.canvas.width === 0 || rect.width === 0) return null;
    return rect.width / this.canvas.width;
  }

  render(): void {
    const { layer } = store.get();
    const scale = this.displayScale();
    // The canvas is hidden or not yet sized (e.g. no template loaded yet) — leave
    // the overlay's last position alone rather than collapsing it to zero.
    if (scale === null) return;
    this.layerEl.style.left = `${layer.x * scale}px`;
    this.layerEl.style.top = `${layer.y * scale}px`;
    this.layerEl.style.width = `${layer.width * scale}px`;
    this.layerEl.style.height = `${layer.height * scale}px`;
  }

  private onBoxPointerDown = (e: PointerEvent): void => {
    if ((e.target as HTMLElement).closest("[data-handle]")) return;
    e.preventDefault();
    this.layerEl.focus();
    this.beginDrag(e, "move", null);
  };

  private onHandlePointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    this.layerEl.focus();
    const handle = (e.currentTarget as HTMLElement).dataset.handle as HandleId;
    this.beginDrag(e, "resize", handle);
  };

  private beginDrag(e: PointerEvent, mode: "move" | "resize", handle: HandleId | null): void {
    const { layer } = store.get();
    store.history.begin(layer);
    this.drag = {
      mode,
      handle,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLayer: { ...layer },
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.drag) return;
    const scale = this.displayScale() ?? 1;
    const dx = (e.clientX - this.drag.startClientX) / scale;
    const dy = (e.clientY - this.drag.startClientY) / scale;

    if (this.drag.mode === "move") {
      this.applyMove(dx, dy, e.shiftKey);
    } else if (this.drag.handle) {
      this.applyResize(this.drag.handle, dx, dy, e.shiftKey);
    }
  };

  private onPointerUp = (): void => {
    if (!this.drag) return;
    this.drag = null;
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.hideGuides();
    store.history.commit(store.get().layer);
    store.setLayer({}, { persist: true });
  };

  private applyMove(dx: number, dy: number, _shiftKey: boolean): void {
    if (!this.drag) return;
    const template = store.get().template;
    const start = this.drag.startLayer;
    const { snapToGrid: gridEnabled } = store.get();

    let x = start.x + dx;
    let y = start.y + dy;
    if (gridEnabled) {
      x = snapToGrid(x, 10);
      y = snapToGrid(y, 10);
    }

    let snappedV = false;
    let snappedH = false;

    if (template) {
      const guides = computeSnapGuides(template.width, template.height);
      const centerX = x + start.width / 2;
      const centerY = y + start.height / 2;
      const snapX = snapToNearest(centerX, guides.vertical, SNAP_THRESHOLD_PX);
      const snapY = snapToNearest(centerY, guides.horizontal, SNAP_THRESHOLD_PX);
      if (snapX.snappedGuide !== null) {
        x = snapX.snappedGuide - start.width / 2;
        snappedV = true;
        this.showGuideV(snapX.snappedGuide);
      }
      if (snapY.snappedGuide !== null) {
        y = snapY.snappedGuide - start.height / 2;
        snappedH = true;
        this.showGuideH(snapY.snappedGuide);
      }
    }
    if (!snappedV) this.guideV.style.display = "none";
    if (!snappedH) this.guideH.style.display = "none";

    store.setLayer({ x, y }, { persist: false });
  }

  private applyResize(handle: HandleId, dx: number, dy: number, shiftKey: boolean): void {
    if (!this.drag) return;
    const flags = HANDLES[handle];
    const start = this.drag.startLayer;

    const rawWidthComponent = (flags.right ? dx : 0) - (flags.left ? dx : 0);
    const rawHeightComponent = (flags.bottom ? dy : 0) - (flags.top ? dy : 0);

    let width: number;
    let height: number;
    let x: number;
    let y: number;

    if (shiftKey && flags.isCorner) {
      const centerX = start.x + start.width / 2;
      const centerY = start.y + start.height / 2;
      width = Math.max(MIN_SIZE, start.width + 2 * rawWidthComponent);
      height = Math.max(MIN_SIZE, start.height + 2 * rawHeightComponent);
      x = centerX - width / 2;
      y = centerY - height / 2;
    } else {
      width = Math.max(MIN_SIZE, start.width + rawWidthComponent);
      height = Math.max(MIN_SIZE, start.height + rawHeightComponent);
      x = flags.left ? start.x + start.width - width : start.x;
      y = flags.top ? start.y + start.height - height : start.y;
    }

    const patch: Partial<TextLayer> = { x, y, width, height };
    if (flags.isCorner) {
      const ratio = height / start.height;
      patch.fontSizePx = Math.max(MIN_FONT_SIZE, Math.round(start.fontSizePx * ratio));
    }
    store.setLayer(patch, { persist: false });
  }

  private showGuideV(canvasX: number): void {
    const scale = this.displayScale() ?? 1;
    this.guideV.style.display = "block";
    this.guideV.style.left = `${canvasX * scale}px`;
  }

  private showGuideH(canvasY: number): void {
    const scale = this.displayScale() ?? 1;
    this.guideH.style.display = "block";
    this.guideH.style.top = `${canvasY * scale}px`;
  }

  private hideGuides(): void {
    this.guideV.style.display = "none";
    this.guideH.style.display = "none";
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const deltas: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const delta = deltas[e.key];
    if (!delta) return;
    e.preventDefault();
    const step = e.shiftKey ? NUDGE_LARGE : NUDGE_SMALL;
    const { layer } = store.get();
    store.history.begin(layer);
    const next = { ...layer, x: layer.x + delta[0] * step, y: layer.y + delta[1] * step };
    store.setLayer({ x: next.x, y: next.y });
    store.history.commit(store.get().layer);
  };
}
