import "./style/tokens.css";
import "./style/base.css";
import "./style/layout.css";
import "./style/controls.css";
import "./style/canvas.css";
import "./style/fontpicker.css";
import "./style/responsive.css";

import { store } from "./app/state";
import { initTheme, toggleTheme } from "./theme/theme";
import { buildLayout } from "./ui/layout";
import { mountLayerControls } from "./ui/controls";
import { mountExportPanel } from "./ui/exportPanel";
import { FontPicker } from "./fonts/picker";
import { TextLayerOverlay } from "./layer/overlay";
import { Preview } from "./preview/preview";
import { parseNames } from "./names/names";
import { loadTemplateFromFile, TemplateLoadError } from "./template/upload";
import { syncSelectedFont } from "./fonts/selection";

initTheme();

const appRoot = document.getElementById("app");
if (!appRoot) throw new Error("Root element #app not found");

const els = buildLayout(appRoot);

els.themeToggle.addEventListener("click", () => toggleTheme());

// -- Template upload --
async function handleFiles(files: FileList | null): Promise<void> {
  const file = files?.[0];
  if (!file) return;
  try {
    const template = await loadTemplateFromFile(file);
    store.set({ template, currentIndex: 0 });
    els.templateInfo.textContent = `${template.fileName} — ${template.width}×${template.height}px`;
  } catch (err) {
    els.templateInfo.textContent = err instanceof TemplateLoadError ? err.message : "Could not load that file.";
  }
}

els.fileInput.addEventListener("change", () => void handleFiles(els.fileInput.files));
els.dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  els.dropzone.classList.add("is-dragover");
});
els.dropzone.addEventListener("dragleave", () => els.dropzone.classList.remove("is-dragover"));
els.dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  els.dropzone.classList.remove("is-dragover");
  void handleFiles(e.dataTransfer?.files ?? null);
});

// -- Names --
function syncNames(): void {
  const names = parseNames(els.namesTextarea.value);
  els.namesCount.textContent = `${names.length} name${names.length === 1 ? "" : "s"}`;
  const currentIndex = Math.min(store.get().currentIndex, Math.max(names.length - 1, 0));
  store.set({ names, currentIndex });
}
els.namesTextarea.addEventListener("input", syncNames);
syncNames();

// -- Font picker --
new FontPicker(els.fontPickerMount);
void syncSelectedFont();

// -- Layer controls --
mountLayerControls(els.layerControlsMount);

// -- Export --
mountExportPanel(els.exportMount);

// -- Canvas / overlay / preview --
// Preview must subscribe to the store before the overlay: it sizes and shows the
// canvas in response to state changes, and the overlay's scale math depends on
// the canvas already having its final on-screen size for that same update.
new Preview(els);
new TextLayerOverlay(els.canvas, els.textLayerEl, els.guideV, els.guideH);

// -- Undo/redo keyboard shortcuts --
window.addEventListener("keydown", (e) => {
  const isMod = e.metaKey || e.ctrlKey;
  if (!isMod || e.key.toLowerCase() !== "z") return;
  e.preventDefault();
  if (e.shiftKey) {
    const next = store.history.redo(store.get().layer);
    if (next) store.setLayer(next);
  } else {
    const prev = store.history.undo(store.get().layer);
    if (prev) store.setLayer(prev);
  }
});
