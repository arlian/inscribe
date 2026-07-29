export interface SnapGuides {
  vertical: number[];
  horizontal: number[];
}

export function computeSnapGuides(templateWidth: number, templateHeight: number): SnapGuides {
  return {
    vertical: [templateWidth / 2, templateWidth / 3, (templateWidth * 2) / 3],
    horizontal: [templateHeight / 2, templateHeight / 3, (templateHeight * 2) / 3],
  };
}

export interface SnapResult {
  value: number;
  snappedGuide: number | null;
}

export function snapToNearest(value: number, guides: number[], thresholdCanvasPx: number): SnapResult {
  for (const guide of guides) {
    if (Math.abs(value - guide) <= thresholdCanvasPx) {
      return { value: guide, snappedGuide: guide };
    }
  }
  return { value, snappedGuide: null };
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}
