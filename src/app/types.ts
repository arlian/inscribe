export type FontCategory = "serif" | "sans" | "script" | "display" | "mono";

export interface FontManifestEntry {
  id: string;
  family: string;
  category: FontCategory;
  weight: number;
  woff2: string;
  woff: string;
}

export interface FontManifest {
  version: number;
  fonts: FontManifestEntry[];
}

export type HAlign = "left" | "center" | "right";
export type VAlign = "top" | "middle" | "bottom";

export interface TextLayer {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSizePx: number;
  fontFamily: string;
  color: string;
  align: HAlign;
  vAlign: VAlign;
}

export interface TemplateInfo {
  image: HTMLImageElement;
  width: number;
  height: number;
  fileName: string;
}

export type Theme = "light" | "dark";

export interface PersistedSettings {
  theme?: Theme;
  fontFamily?: string;
  layer?: TextLayer;
  snapToGrid?: boolean;
}
