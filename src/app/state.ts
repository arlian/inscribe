import type { TemplateInfo, TextLayer, Theme } from "./types";
import { LayerHistory } from "./history";
import { loadSettings, patchSettings } from "./storage";

export interface AppState {
  template: TemplateInfo | null;
  names: string[];
  currentIndex: number;
  layer: TextLayer;
  snapToGrid: boolean;
  theme: Theme;
}

export const DEFAULT_LAYER: TextLayer = {
  x: 100,
  y: 100,
  width: 400,
  height: 100,
  fontSizePx: 48,
  fontFamily: "",
  color: "#16130f",
  align: "center",
  vAlign: "middle",
};

type Listener = (state: AppState) => void;

class Store {
  private state: AppState;
  private listeners = new Set<Listener>();
  readonly history: LayerHistory;

  constructor() {
    const settings = loadSettings();
    const layer = settings.layer ? { ...DEFAULT_LAYER, ...settings.layer } : { ...DEFAULT_LAYER };
    this.state = {
      template: null,
      names: [],
      currentIndex: 0,
      layer,
      snapToGrid: settings.snapToGrid ?? false,
      theme: "light",
    };
    this.history = new LayerHistory(layer);
  }

  get(): AppState {
    return this.state;
  }

  set(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  setLayer(patch: Partial<TextLayer>, opts: { persist?: boolean } = {}): void {
    this.state = { ...this.state, layer: { ...this.state.layer, ...patch } };
    if (opts.persist !== false) {
      patchSettings({ layer: this.state.layer });
    }
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.state);
  }
}

export const store = new Store();
