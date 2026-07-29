import type { TextLayer } from "../app/types";

export interface LaidOutLine {
  text: string;
  x: number;
  y: number;
}

export interface TextLayoutResult {
  lines: LaidOutLine[];
  lineHeight: number;
  blockHeight: number;
  overflow: boolean;
}

const LINE_HEIGHT_RATIO = 1.2;

function wrapWord(ctx: CanvasRenderingContext2D, word: string, maxWidth: number): string[] {
  if (ctx.measureText(word).width <= maxWidth || word.length <= 1) return [word];
  const pieces: string[] = [];
  let current = "";
  for (const ch of word) {
    const attempt = current + ch;
    if (current !== "" && ctx.measureText(attempt).width > maxWidth) {
      pieces.push(current);
      current = ch;
    } else {
      current = attempt;
    }
  }
  if (current !== "") pieces.push(current);
  return pieces;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current === "" ? word : `${current} ${word}`;
    if (ctx.measureText(candidate).width <= maxWidth || current === "") {
      if (ctx.measureText(word).width > maxWidth) {
        if (current !== "") {
          lines.push(current);
          current = "";
        }
        const pieces = wrapWord(ctx, word, maxWidth);
        for (let i = 0; i < pieces.length - 1; i++) lines.push(pieces[i]);
        current = pieces[pieces.length - 1] ?? "";
      } else {
        current = candidate;
      }
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current !== "") lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export function layoutText(
  ctx: CanvasRenderingContext2D,
  text: string,
  layer: TextLayer,
  fontCssFamily: string,
): TextLayoutResult {
  ctx.font = `${layer.fontSizePx}px ${fontCssFamily}`;
  const lines = wrapText(ctx, text, layer.width);
  const lineHeight = layer.fontSizePx * LINE_HEIGHT_RATIO;
  const blockHeight = lines.length * lineHeight;

  let blockTop: number;
  if (layer.vAlign === "top") blockTop = layer.y;
  else if (layer.vAlign === "bottom") blockTop = layer.y + layer.height - blockHeight;
  else blockTop = layer.y + (layer.height - blockHeight) / 2;

  let x: number;
  if (layer.align === "left") x = layer.x;
  else if (layer.align === "right") x = layer.x + layer.width;
  else x = layer.x + layer.width / 2;

  const laidOut: LaidOutLine[] = lines.map((lineText, i) => ({
    text: lineText,
    x,
    y: blockTop + lineHeight * i + lineHeight / 2,
  }));

  const widestLine = Math.max(0, ...lines.map((l) => ctx.measureText(l).width));
  const overflow = blockHeight > layer.height + 0.5 || widestLine > layer.width + 0.5;

  return { lines: laidOut, lineHeight, blockHeight, overflow };
}
