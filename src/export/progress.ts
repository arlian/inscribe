export class CancelToken {
  private _cancelled = false;

  cancel(): void {
    this._cancelled = true;
  }

  get cancelled(): boolean {
    return this._cancelled;
  }
}

export interface BatchResult {
  completed: number;
  cancelled: boolean;
}

/** Runs `worker` over `items` sequentially, yielding to the event loop between each so the UI stays responsive. */
export async function runBatch<T>(
  items: T[],
  token: CancelToken,
  onProgress: (done: number, total: number) => void,
  worker: (item: T, index: number) => Promise<void>,
): Promise<BatchResult> {
  let completed = 0;
  onProgress(0, items.length);
  for (let i = 0; i < items.length; i++) {
    if (token.cancelled) return { completed, cancelled: true };
    await worker(items[i], i);
    completed++;
    onProgress(completed, items.length);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return { completed, cancelled: false };
}
