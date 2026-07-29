import type { FontCategory, FontManifestEntry } from "../app/types";
import { FONTS } from "./manifest";
import { activateIfCached, isFontRegistered } from "./loader";
import { selectFont, getFontStatus, onFontStatusChange } from "./selection";
import { cachedFontsByteSize, clearCachedFonts, isIndexedDbAvailable } from "./cache";
import { store } from "../app/state";
import { el } from "../ui/dom";

const CATEGORIES: { id: FontCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sans", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "script", label: "Script" },
  { id: "display", label: "Display" },
  { id: "mono", label: "Mono" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export class FontPicker {
  private root: HTMLElement;
  private searchInput: HTMLInputElement;
  private categoryGroup: HTMLElement;
  private list: HTMLElement;
  private footer: HTMLElement;
  private notice: HTMLElement;
  private observer: IntersectionObserver;
  private category: FontCategory | "all" = "all";
  private query = "";
  private rowById = new Map<string, HTMLButtonElement>();

  constructor(container: HTMLElement) {
    this.searchInput = el("input", {
      type: "search",
      className: "font-search",
      placeholder: "Search fonts",
      attrs: { "aria-label": "Search fonts" },
    });
    this.searchInput.addEventListener("input", () => {
      this.query = this.searchInput.value;
      this.renderList();
    });

    // Six categories wrap to two rows of three rather than overflowing the panel.
    this.categoryGroup = el(
      "div",
      {
        className: "segmented segmented--cols-3",
        attrs: { role: "radiogroup", "aria-label": "Filter by category" },
      },
      CATEGORIES.map((cat) => this.buildCategoryButton(cat)),
    );

    this.list = el("div", {
      className: "font-list",
      attrs: { role: "listbox", "aria-label": "Font family" },
    });

    this.notice = el("p", { className: "font-picker-notice" });
    this.footer = el("div", { className: "font-picker-footer" });

    this.root = el("div", { className: "font-picker" }, [
      this.searchInput,
      this.categoryGroup,
      this.notice,
      this.list,
      this.footer,
    ]);
    container.append(this.root);

    this.observer = new IntersectionObserver((entries) => {
      for (const observerEntry of entries) {
        if (!observerEntry.isIntersecting) continue;
        const id = (observerEntry.target as HTMLElement).dataset.fontId;
        if (id) void this.activateRowIfCached(id);
      }
    }, { root: this.list, rootMargin: "200px 0px" });

    if (!isIndexedDbAvailable()) {
      this.notice.textContent =
        "Font caching is unavailable in this browser (private browsing?). Fonts will be re-downloaded each visit.";
      this.notice.hidden = false;
    } else {
      this.notice.hidden = true;
    }

    onFontStatusChange(() => this.syncSelectionUI());
    this.renderList();
    void this.renderFooter();
  }

  private buildCategoryButton(cat: { id: FontCategory | "all"; label: string }): HTMLButtonElement {
    const button = el(
      "button",
      {
        type: "button",
        className: "segmented-option",
        attrs: { role: "radio", "aria-checked": String(cat.id === this.category) },
      },
      [cat.label],
    );
    button.addEventListener("click", () => {
      this.category = cat.id;
      for (const child of Array.from(this.categoryGroup.children)) {
        child.setAttribute("aria-checked", String(child === button));
        child.classList.toggle("is-active", child === button);
      }
      this.renderList();
    });
    if (cat.id === this.category) button.classList.add("is-active");
    return button;
  }

  private filtered(): FontManifestEntry[] {
    const q = this.query.trim().toLowerCase();
    return FONTS.filter((f) => {
      if (this.category !== "all" && f.category !== this.category) return false;
      if (q && !f.family.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  private renderList(): void {
    this.list.replaceChildren();
    this.rowById.clear();
    this.observer.disconnect();

    const systemRow = this.buildRow(null);
    this.list.append(systemRow);

    for (const entry of this.filtered()) {
      const row = this.buildRow(entry);
      this.list.append(row);
      this.observer.observe(row);
    }
    this.syncSelectionUI();
  }

  private buildRow(entry: FontManifestEntry | null): HTMLButtonElement {
    const id = entry?.id ?? "";
    const label = el("span", { className: "font-row-label" }, [entry ? entry.family : "System default"]);
    const meta = el("span", { className: "font-row-meta micro-label" }, [entry ? entry.category : "fallback"]);
    const badge = el("span", { className: "font-row-badge", attrs: { "data-role": "badge" } });
    const row = el(
      "button",
      {
        type: "button",
        className: "font-row",
        attrs: { role: "option", "aria-selected": "false", "data-font-id": id },
      },
      [label, meta, badge],
    );
    row.addEventListener("click", () => void this.handleSelect(entry));
    this.rowById.set(id, row);
    return row;
  }

  private async activateRowIfCached(id: string): Promise<void> {
    if (!id) return;
    const entry = FONTS.find((f) => f.id === id);
    if (!entry) return;
    const row = this.rowById.get(id);
    if (!row) return;
    const result = await activateIfCached(entry);
    if (result?.ok) {
      row.style.fontFamily = `"${entry.family}"`;
      this.setBadge(row, "cached");
    } else {
      this.setBadge(row, "not-cached");
    }
  }

  private setBadge(row: HTMLElement, state: "cached" | "not-cached" | "loading" | "error"): void {
    const badge = row.querySelector<HTMLElement>('[data-role="badge"]');
    if (!badge) return;
    badge.dataset.state = state;
    badge.title =
      state === "cached"
        ? "Downloaded and cached"
        : state === "loading"
          ? "Loading"
          : state === "error"
            ? "Failed to load"
            : "Not cached yet";
  }

  private async handleSelect(entry: FontManifestEntry | null): Promise<void> {
    const id = entry?.id ?? "";
    const row = this.rowById.get(id);
    if (row) this.setBadge(row, "loading");
    await selectFont(id);
    this.syncSelectionUI();
    void this.renderFooter();
  }

  private syncSelectionUI(): void {
    const selectedId = store.get().layer.fontFamily;
    const { status } = getFontStatus();
    for (const [id, row] of this.rowById) {
      const isSelected = id === selectedId;
      row.classList.toggle("is-selected", isSelected);
      row.setAttribute("aria-selected", String(isSelected));
      const entry = id ? FONTS.find((f) => f.id === id) : undefined;
      if (isSelected && id && entry) {
        if (status === "ready") row.style.fontFamily = `"${entry.family}"`;
        this.setBadge(row, status === "loading" ? "loading" : status === "error" ? "error" : "cached");
      } else if (entry && isFontRegistered(entry)) {
        this.setBadge(row, "cached");
      }
    }
  }

  private async renderFooter(): Promise<void> {
    const bytes = await cachedFontsByteSize();
    this.footer.replaceChildren();
    this.footer.append(
      el("span", { className: "micro-label" }, [`${formatBytes(bytes)} cached`]),
      el(
        "button",
        { type: "button", className: "link-button" },
        ["Clear cached fonts"],
      ),
    );
    const clearButton = this.footer.querySelector("button");
    clearButton?.addEventListener("click", async () => {
      await clearCachedFonts();
      await this.renderFooter();
      this.renderList();
    });
  }
}
