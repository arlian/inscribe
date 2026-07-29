import type { TemplateInfo, TextLayer } from "../app/types";
import { renderCertificateToCanvas, canvasToBlob } from "../render/renderCertificate";
import { createSlugger } from "./slugify";
import { CancelToken, runBatch } from "./progress";
import { saveBlob } from "./save";

export interface ExportBatchOptions {
  template: TemplateInfo;
  names: string[];
  layer: TextLayer;
  fontFamily: string;
  onProgress: (done: number, total: number) => void;
  token: CancelToken;
}

export async function exportZip(opts: ExportBatchOptions): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const nextSlug = createSlugger();

  const { cancelled } = await runBatch(opts.names, opts.token, opts.onProgress, async (name) => {
    const { canvas } = renderCertificateToCanvas(opts.template, name, opts.layer, opts.fontFamily);
    const blob = await canvasToBlob(canvas);
    zip.file(`${nextSlug(name)}.png`, blob);
  });

  if (cancelled) return;

  const zipBlob = await zip.generateAsync({ type: "blob" });
  await saveBlob(zipBlob, "certificates.zip", "ZIP archive", "application/zip", ".zip");
}
