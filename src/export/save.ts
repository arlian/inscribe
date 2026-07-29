interface SaveFilePickerOptions {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}

interface FileSystemWritableFileStream {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandleLike {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

type ShowSaveFilePicker = (options: SaveFilePickerOptions) => Promise<FileSystemFileHandleLike>;

function getShowSaveFilePicker(): ShowSaveFilePicker | null {
  const fn = (window as unknown as { showSaveFilePicker?: ShowSaveFilePicker }).showSaveFilePicker;
  return typeof fn === "function" ? fn : null;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function saveBlob(
  blob: Blob,
  suggestedName: string,
  description: string,
  mimeType: string,
  extension: string,
): Promise<void> {
  const picker = getShowSaveFilePicker();
  if (picker) {
    try {
      const handle = await picker({
        suggestedName,
        types: [{ description, accept: { [mimeType]: [extension] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Fall through to the download fallback for any other failure.
    }
  }
  downloadBlob(blob, suggestedName);
}
