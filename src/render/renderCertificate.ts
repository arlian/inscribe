import type { TemplateInfo, TextLayer } from "../app/types";
import { layoutText } from "./textLayout";

export interface RenderResult {
  canvas: HTMLCanvasElement;
  overflow: boolean;
}

const FALLBACK_STACK = "ui-sans-serif, system-ui, sans-serif";

/**
 * Single render path shared by the live preview, the ZIP export, and the PDF export,
 * so all three always draw an identical result. Draws at the template's native
 * resolution regardless of how the canvas is later displayed or embedded.
 */
export function renderCertificateToCanvas(
  template: TemplateInfo,
  name: string,
  layer: TextLayer,
  registeredFontFamily: string,
  targetCanvas?: HTMLCanvasElement,
): RenderResult {
  const canvas = targetCanvas ?? document.createElement("canvas");
  canvas.width = template.width;
  canvas.height = template.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) throw new Error("2D canvas context is unavailable in this browser.");

  ctx.drawImage(template.image, 0, 0, template.width, template.height);

  const cssFamily = registeredFontFamily ? `"${registeredFontFamily}", ${FALLBACK_STACK}` : FALLBACK_STACK;
  ctx.fillStyle = layer.color;
  ctx.textAlign = layer.align;
  ctx.textBaseline = "middle";

  const layout = layoutText(ctx, name, layer, cssFamily);
  for (const line of layout.lines) {
    ctx.fillText(line.text, line.x, line.y);
  }

  return { canvas, overflow: layout.overflow };
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to encode canvas to a PNG blob."));
    }, type);
  });
}
