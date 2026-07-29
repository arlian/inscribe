import { renderCertificateToCanvas } from "../render/renderCertificate";
import { runBatch } from "./progress";
import { saveBlob } from "./save";
import type { ExportBatchOptions } from "./exportZip";

export async function exportPdf(opts: ExportBatchOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { template } = opts;
  const orientation = template.width >= template.height ? "l" : "p";
  const doc = new jsPDF({
    orientation,
    unit: "px",
    format: [template.width, template.height],
    compress: true,
  });

  let firstPage = true;
  const { cancelled } = await runBatch(opts.names, opts.token, opts.onProgress, async (name) => {
    const { canvas } = renderCertificateToCanvas(opts.template, name, opts.layer, opts.fontFamily);
    if (!firstPage) doc.addPage([template.width, template.height], orientation);
    doc.addImage(canvas, "PNG", 0, 0, template.width, template.height);
    firstPage = false;
  });

  if (cancelled) return;

  const pdfBlob = doc.output("blob");
  await saveBlob(pdfBlob, "certificates.pdf", "PDF document", "application/pdf", ".pdf");
}
