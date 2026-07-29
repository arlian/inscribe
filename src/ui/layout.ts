import { el } from "./dom";

export interface AppElements {
  themeToggle: HTMLButtonElement;
  dropzone: HTMLElement;
  fileInput: HTMLInputElement;
  templateInfo: HTMLElement;
  namesTextarea: HTMLTextAreaElement;
  namesCount: HTMLElement;
  fontPickerMount: HTMLElement;
  layerControlsMount: HTMLElement;
  exportMount: HTMLElement;
  canvasStage: HTMLElement;
  canvas: HTMLCanvasElement;
  textLayerEl: HTMLElement;
  guideV: HTMLElement;
  guideH: HTMLElement;
  emptyState: HTMLElement;
  overflowBanner: HTMLElement;
  prevBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
  nameIndexLabel: HTMLElement;
  currentNameLabel: HTMLElement;
}

function section(title: string, ...children: (Node | string)[]): HTMLElement {
  return el("section", { className: "panel-section" }, [
    el("h2", { className: "panel-section-title" }, [title]),
    ...children,
  ]);
}

export function buildLayout(root: HTMLElement): AppElements {
  const themeToggle = el("button", {
    type: "button",
    className: "theme-toggle",
    attrs: { "aria-label": "Toggle color theme" },
  }, [el("span", { className: "theme-toggle-glyph", attrs: { "aria-hidden": "true" } })]);

  const header = el("header", { className: "app-header" }, [
    el("div", { className: "wordmark" }, [
      el("span", { className: "wordmark-mark", attrs: { "aria-hidden": "true" } }, ["IN"]),
      el("h1", {}, ["Inscribe"]),
    ]),
    el("p", { className: "tagline micro-label" }, ["Stamp names onto a certificate, entirely on your device"]),
    themeToggle,
  ]);

  // -- Template upload --
  const fileInput = el("input", {
    type: "file",
    accept: "image/png,image/jpeg",
    className: "visually-hidden",
    id: "template-file-input",
  });
  const templateInfo = el("p", { className: "template-info micro-label" }, ["No template loaded"]);
  const dropzone = el(
    "label",
    { className: "dropzone", attrs: { for: "template-file-input", tabindex: "0" } },
    [
      el("span", { className: "dropzone-title" }, ["Drop a certificate template"]),
      el("span", { className: "dropzone-hint micro-label" }, ["PNG or JPG — click to browse"]),
      fileInput,
    ],
  );
  const templateSection = section("Template", dropzone, templateInfo);

  // -- Names --
  const namesTextarea = el("textarea", {
    className: "names-textarea",
    placeholder: "One name per line\nAda Lovelace\nGrace Hopper\nKatherine Johnson",
    rows: 10,
    attrs: { "aria-label": "Names, one per line" },
  });
  const namesCount = el("p", { className: "names-count micro-label" }, ["0 names"]);
  const namesSection = section("Names", namesTextarea, namesCount);

  // -- Font picker --
  const fontPickerMount = el("div", { className: "font-picker-mount" });
  const fontSection = section("Font", fontPickerMount);

  // -- Layer controls --
  const layerControlsMount = el("div", { className: "layer-controls-mount" });
  const layerSection = section("Text layer", layerControlsMount);

  // -- Export --
  const exportMount = el("div", { className: "export-mount" });
  const exportSection = section("Export", exportMount);

  const leftPanel = el("div", { className: "panel panel-left" }, [
    templateSection,
    namesSection,
    fontSection,
    layerSection,
    exportSection,
  ]);

  // -- Canvas workspace --
  const canvas = el("canvas", { className: "preview-canvas" });
  const textLayerEl = el(
    "div",
    { className: "text-layer", attrs: { tabindex: "0", role: "group", "aria-label": "Text layer, draggable and resizable" } },
    [
      el("div", { className: "handle handle-nw", attrs: { "data-handle": "nw" } }),
      el("div", { className: "handle handle-ne", attrs: { "data-handle": "ne" } }),
      el("div", { className: "handle handle-sw", attrs: { "data-handle": "sw" } }),
      el("div", { className: "handle handle-se", attrs: { "data-handle": "se" } }),
      el("div", { className: "handle handle-w", attrs: { "data-handle": "w" } }),
      el("div", { className: "handle handle-e", attrs: { "data-handle": "e" } }),
    ],
  );
  const guideV = el("div", { className: "snap-guide snap-guide-v" });
  const guideH = el("div", { className: "snap-guide snap-guide-h" });
  const emptyState = el("div", { className: "canvas-empty-state" }, [
    el("p", {}, ["Upload a certificate template to begin"]),
    el("p", { className: "micro-label" }, ["Your image never leaves this browser"]),
  ]);

  const canvasStage = el("div", { className: "canvas-stage" }, [canvas, textLayerEl, guideV, guideH]);
  // The empty state is a sibling of the stage, not a child: with no template the
  // stage has no content to size from and would collapse around it.
  const canvasViewport = el("div", { className: "canvas-viewport" }, [canvasStage, emptyState]);

  const overflowBanner = el("div", { className: "overflow-banner", attrs: { role: "status" } });

  const prevBtn = el("button", { type: "button", className: "nav-button", attrs: { "aria-label": "Previous name" } }, ["←"]);
  const nextBtn = el("button", { type: "button", className: "nav-button", attrs: { "aria-label": "Next name" } }, ["→"]);
  const nameIndexLabel = el("span", { className: "name-index micro-label" }, ["0 / 0"]);
  const currentNameLabel = el("span", { className: "current-name" }, ["—"]);

  const previewNav = el("div", { className: "preview-nav" }, [
    prevBtn,
    el("div", { className: "preview-nav-info" }, [currentNameLabel, nameIndexLabel]),
    nextBtn,
  ]);

  const rightPanel = el("div", { className: "panel panel-right" }, [previewNav, canvasViewport, overflowBanner]);

  const main = el("main", { className: "app-main" }, [leftPanel, rightPanel]);

  root.append(header, main);

  return {
    themeToggle,
    dropzone,
    fileInput,
    templateInfo,
    namesTextarea,
    namesCount,
    fontPickerMount,
    layerControlsMount,
    exportMount,
    canvasStage,
    canvas,
    textLayerEl,
    guideV,
    guideH,
    emptyState,
    overflowBanner,
    prevBtn,
    nextBtn,
    nameIndexLabel,
    currentNameLabel,
  };
}
