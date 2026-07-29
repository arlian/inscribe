import type { TemplateInfo } from "../app/types";

const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

export class TemplateLoadError extends Error {}

export function isAcceptedTemplateFile(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type);
}

export function loadTemplateFromFile(file: File): Promise<TemplateInfo> {
  if (!isAcceptedTemplateFile(file)) {
    return Promise.reject(new TemplateLoadError("Please choose a PNG or JPG image."));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ image, width: image.naturalWidth, height: image.naturalHeight, fileName: file.name });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new TemplateLoadError("This file could not be read as an image."));
    };
    image.src = url;
  });
}
