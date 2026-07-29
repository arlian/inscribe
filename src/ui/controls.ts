import { store } from "../app/state";
import type { HAlign, TextLayer, VAlign } from "../app/types";
import { el } from "./dom";

function instantChange(patch: Partial<TextLayer>): void {
  const before = store.get().layer;
  store.history.begin(before);
  store.setLayer(patch);
  store.history.commit(store.get().layer);
}

function segmented<T extends string>(
  label: string,
  options: { value: T; label: string; title: string }[],
  getValue: () => T,
  onChange: (value: T) => void,
): HTMLElement {
  const buttons = options.map((opt) =>
    el(
      "button",
      {
        type: "button",
        className: "segmented-option",
        attrs: { role: "radio", "aria-checked": "false", title: opt.title },
      },
      [opt.label],
    ),
  );
  const group = el(
    "div",
    { className: "segmented", attrs: { role: "radiogroup", "aria-label": label } },
    buttons,
  );
  buttons.forEach((btn, i) => {
    btn.addEventListener("click", () => onChange(options[i].value));
  });

  const sync = (): void => {
    const current = getValue();
    buttons.forEach((btn, i) => {
      const active = options[i].value === current;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-checked", String(active));
    });
  };
  sync();
  store.subscribe(sync);
  return group;
}

function numberField(label: string, key: "x" | "y" | "width" | "height"): HTMLElement {
  const input = el("input", {
    type: "number",
    className: "number-input",
    attrs: { "aria-label": label, step: "1" },
  });

  input.addEventListener("focus", () => store.history.begin(store.get().layer));
  input.addEventListener("input", () => {
    const value = Number(input.value);
    if (!Number.isFinite(value)) return;
    store.setLayer({ [key]: value } as Partial<TextLayer>, { persist: false });
  });
  input.addEventListener("change", () => {
    store.history.commit(store.get().layer);
    store.setLayer({}, { persist: true });
  });

  store.subscribe(() => {
    if (document.activeElement === input) return;
    input.value = String(Math.round(store.get().layer[key]));
  });
  input.value = String(Math.round(store.get().layer[key]));

  return el("label", { className: "field" }, [
    el("span", { className: "field-label micro-label" }, [label]),
    input,
  ]);
}

/** A micro-labelled block, so every control in the panel sits on the same rhythm. */
function controlGroup(label: string, ...children: (Node | string)[]): HTMLElement {
  return el("div", { className: "control-group" }, [
    el("span", { className: "micro-label" }, [label]),
    ...children,
  ]);
}

export function mountLayerControls(container: HTMLElement): void {
  const hAlign = segmented<HAlign>(
    "Horizontal alignment",
    [
      { value: "left", label: "Left", title: "Align left" },
      { value: "center", label: "Center", title: "Align center" },
      { value: "right", label: "Right", title: "Align right" },
    ],
    () => store.get().layer.align,
    (value) => instantChange({ align: value }),
  );

  const vAlign = segmented<VAlign>(
    "Vertical alignment",
    [
      { value: "top", label: "Top", title: "Align top" },
      { value: "middle", label: "Middle", title: "Align middle" },
      { value: "bottom", label: "Bottom", title: "Align bottom" },
    ],
    () => store.get().layer.vAlign,
    (value) => instantChange({ vAlign: value }),
  );

  const alignGroup = controlGroup("Align", hAlign, vAlign);

  const centerHBtn = el(
    "button",
    { type: "button", className: "btn-secondary", attrs: { title: "Center the box horizontally on the template" } },
    ["Center H"],
  );
  const centerVBtn = el(
    "button",
    { type: "button", className: "btn-secondary", attrs: { title: "Center the box vertically on the template" } },
    ["Center V"],
  );
  centerHBtn.addEventListener("click", () => {
    const t = store.get().template;
    if (!t) return;
    instantChange({ x: (t.width - store.get().layer.width) / 2 });
  });
  centerVBtn.addEventListener("click", () => {
    const t = store.get().template;
    if (!t) return;
    instantChange({ y: (t.height - store.get().layer.height) / 2 });
  });
  const centerGroup = controlGroup(
    "Center on template",
    el("div", { className: "control-row-split" }, [centerHBtn, centerVBtn]),
  );

  const numberGroup = controlGroup(
    "Position and size",
    el("div", { className: "control-row-numbers" }, [
      numberField("X", "x"),
      numberField("Y", "y"),
      numberField("W", "width"),
      numberField("H", "height"),
    ]),
  );

  const colorInput = el("input", {
    type: "color",
    className: "color-input",
    attrs: { "aria-label": "Text color" },
  });
  colorInput.value = store.get().layer.color;
  colorInput.addEventListener("input", () => {
    store.history.begin(store.get().layer);
    store.setLayer({ color: colorInput.value }, { persist: false });
  });
  colorInput.addEventListener("change", () => {
    store.history.commit(store.get().layer);
    store.setLayer({}, { persist: true });
  });
  store.subscribe(() => {
    if (document.activeElement === colorInput) return;
    colorInput.value = store.get().layer.color;
  });
  const colorField = el("label", { className: "field field-split" }, [
    el("span", { className: "field-label micro-label" }, ["Text color"]),
    colorInput,
  ]);

  const snapToggle = el("input", { type: "checkbox", className: "toggle-input", id: "snap-toggle" });
  snapToggle.checked = store.get().snapToGrid;
  snapToggle.addEventListener("change", () => {
    store.set({ snapToGrid: snapToggle.checked });
  });
  const snapField = el("label", { className: "field field-split", attrs: { for: "snap-toggle" } }, [
    el("span", { className: "field-label micro-label" }, ["Snap to 10px grid"]),
    snapToggle,
  ]);

  const undoBtn = el("button", { type: "button", className: "btn-secondary" }, ["Undo"]);
  const redoBtn = el("button", { type: "button", className: "btn-secondary" }, ["Redo"]);
  undoBtn.addEventListener("click", () => {
    const prev = store.history.undo(store.get().layer);
    if (prev) store.setLayer(prev);
  });
  redoBtn.addEventListener("click", () => {
    const next = store.history.redo(store.get().layer);
    if (next) store.setLayer(next);
  });
  const syncHistoryButtons = (): void => {
    undoBtn.disabled = !store.history.canUndo();
    redoBtn.disabled = !store.history.canRedo();
  };
  syncHistoryButtons();
  store.subscribe(syncHistoryButtons);
  const historyGroup = controlGroup(
    "History",
    el("div", { className: "control-row-split" }, [undoBtn, redoBtn]),
  );

  container.append(
    alignGroup,
    centerGroup,
    numberGroup,
    el("div", { className: "control-group" }, [colorField, snapField]),
    historyGroup,
  );
}
