import { store } from "../app/state";
import { resolvedCssFamily } from "../fonts/selection";
import { exportZip } from "../export/exportZip";
import { exportPdf } from "../export/exportPdf";
import { CancelToken } from "../export/progress";
import { el } from "./dom";

export function mountExportPanel(container: HTMLElement): void {
  const pdfBtn = el("button", { type: "button", className: "btn-primary" }, ["Export PDF"]);
  const zipBtn = el("button", { type: "button", className: "btn-primary" }, ["Export ZIP"]);
  const buttonRow = el("div", { className: "control-row-split" }, [pdfBtn, zipBtn]);

  const progressBar = el("div", { className: "progress-bar" }, [el("div", { className: "progress-bar-fill" })]);
  const progressFill = progressBar.querySelector<HTMLElement>(".progress-bar-fill")!;
  const progressLabel = el("span", { className: "micro-label" }, [""]);
  const cancelBtn = el("button", { type: "button", className: "btn-secondary" }, ["Cancel"]);
  const progressRow = el("div", { className: "export-progress" }, [progressBar, progressLabel, cancelBtn]);
  progressRow.hidden = true;

  container.append(buttonRow, progressRow);

  let activeToken: CancelToken | null = null;

  function setBusy(busy: boolean): void {
    pdfBtn.disabled = busy;
    zipBtn.disabled = busy;
    progressRow.hidden = !busy;
  }

  function syncEnabled(): void {
    const { template, names } = store.get();
    const ready = Boolean(template) && names.length > 0;
    pdfBtn.disabled = !ready || !progressRow.hidden;
    zipBtn.disabled = !ready || !progressRow.hidden;
  }
  syncEnabled();
  store.subscribe(syncEnabled);

  function onProgress(done: number, total: number): void {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    progressFill.style.width = `${pct}%`;
    progressLabel.textContent = `${done} / ${total}`;
  }

  cancelBtn.addEventListener("click", () => activeToken?.cancel());

  async function runExport(kind: "pdf" | "zip"): Promise<void> {
    const { template, names, layer } = store.get();
    if (!template || names.length === 0) return;
    const token = new CancelToken();
    activeToken = token;
    setBusy(true);
    try {
      const fontFamily = resolvedCssFamily();
      if (kind === "pdf") {
        await exportPdf({ template, names, layer, fontFamily, onProgress, token });
      } else {
        await exportZip({ template, names, layer, fontFamily, onProgress, token });
      }
    } finally {
      activeToken = null;
      setBusy(false);
      syncEnabled();
    }
  }

  pdfBtn.addEventListener("click", () => void runExport("pdf"));
  zipBtn.addEventListener("click", () => void runExport("zip"));
}
