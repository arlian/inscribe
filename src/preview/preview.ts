import { store } from "../app/state";
import { renderCertificateToCanvas } from "../render/renderCertificate";
import { resolvedCssFamily, onFontStatusChange, getFontStatus } from "../fonts/selection";
import type { AppElements } from "../ui/layout";

export class Preview {
  constructor(private els: AppElements) {
    els.prevBtn.addEventListener("click", () => this.step(-1));
    els.nextBtn.addEventListener("click", () => this.step(1));
    store.subscribe(() => this.render());
    onFontStatusChange(() => this.render());
    this.render();
  }

  private step(delta: number): void {
    const { names, currentIndex } = store.get();
    const next = Math.min(Math.max(currentIndex + delta, 0), Math.max(names.length - 1, 0));
    store.set({ currentIndex: next });
  }

  render(): void {
    const { template, names, currentIndex } = store.get();
    const { canvas, emptyState, overflowBanner, prevBtn, nextBtn, nameIndexLabel, currentNameLabel } = this.els;

    if (!template) {
      canvas.style.display = "none";
      emptyState.style.display = "flex";
      overflowBanner.hidden = true;
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      nameIndexLabel.textContent = "0 / 0";
      currentNameLabel.textContent = "—";
      return;
    }

    canvas.style.display = "block";
    emptyState.style.display = "none";

    const total = names.length;
    const index = Math.min(currentIndex, Math.max(total - 1, 0));
    const name = names[index] ?? "Preview name";

    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= total - 1;
    nameIndexLabel.textContent = total > 0 ? `${index + 1} / ${total}` : "0 / 0";
    currentNameLabel.textContent = name;

    const family = resolvedCssFamily();
    const { overflow } = renderCertificateToCanvas(template, name, store.get().layer, family, canvas);

    const { status, error } = getFontStatus();
    if (status === "error" && error) {
      overflowBanner.hidden = false;
      overflowBanner.textContent = error;
      overflowBanner.classList.add("is-error");
    } else if (overflow) {
      overflowBanner.hidden = false;
      overflowBanner.textContent = "Text overflows the layer box for this name. Widen the box or reduce font size.";
      overflowBanner.classList.remove("is-error");
    } else {
      overflowBanner.hidden = true;
    }
  }
}
