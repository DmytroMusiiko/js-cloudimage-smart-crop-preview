import { createElement } from '../utils/dom';
import { CropPreview } from './preview';
import type { CropRect, ResolvedPreset } from '../core/types';

export interface PreviewGridOptions {
  presets: ResolvedPreset[];
  src: string;
  layout: 'grid' | 'single';
  showDimensions: boolean;
  onPreviewHover: (presetName: string | null) => void;
}

export class PreviewGrid {
  private el: HTMLElement;
  private tabsEl: HTMLElement | null = null;
  private gridEl: HTMLElement;
  private previews: Map<string, CropPreview> = new Map();
  private layout: 'grid' | 'single';
  private activePreset: string;
  private src: string;
  private showDimensions: boolean;
  private onPreviewHover: (presetName: string | null) => void;

  get element(): HTMLElement {
    return this.el;
  }

  constructor(container: HTMLElement, options: PreviewGridOptions) {
    this.layout = options.layout;
    this.src = options.src;
    this.showDimensions = options.showDimensions;
    this.onPreviewHover = options.onPreviewHover;
    this.activePreset = options.presets[0]?.name || '';

    // Root
    this.el = createElement('div', 'ci-smart-crop__preview-grid');
    this.el.classList.add(`ci-smart-crop__preview-grid--${options.layout}`);

    // Grid container
    this.gridEl = createElement('div', 'ci-smart-crop__preview-grid-inner');

    this.el.appendChild(this.gridEl);
    container.appendChild(this.el);

    // Create previews
    for (const preset of options.presets) {
      this.createPreview(preset);
    }

    // Build tabs if single mode
    if (this.layout === 'single') {
      this.buildTabs(options.presets);
      this.applyLayout();
    }
  }

  private createPreview(preset: ResolvedPreset): void {
    const preview = new CropPreview({
      preset,
      src: this.src,
      showDimensions: this.showDimensions,
      onHover: this.onPreviewHover,
      onClick: (name) => {
        if (this.layout === 'single') {
          this.setActivePreset(name);
        }
      },
    });
    this.previews.set(preset.name, preview);
    this.gridEl.appendChild(preview.element);
  }

  private buildTabs(presets: ResolvedPreset[]): void {
    if (this.tabsEl) this.tabsEl.remove();

    this.tabsEl = createElement('div', 'ci-smart-crop__tabs', { role: 'tablist' });

    for (const preset of presets) {
      const tab = createElement('button', 'ci-smart-crop__tab', {
        role: 'tab',
        'aria-selected': preset.name === this.activePreset ? 'true' : 'false',
        'data-preset': preset.name,
      });
      tab.textContent = preset.label;

      if (preset.name === this.activePreset) {
        tab.classList.add('ci-smart-crop__tab--active');
      }

      tab.addEventListener('click', () => this.setActivePreset(preset.name));
      this.tabsEl!.appendChild(tab);
    }

    this.el.insertBefore(this.tabsEl, this.gridEl);
  }

  private setActivePreset(name: string): void {
    this.activePreset = name;
    this.applyLayout();

    // Update tabs
    if (this.tabsEl) {
      this.tabsEl.querySelectorAll('.ci-smart-crop__tab').forEach((tab) => {
        const isActive = tab.getAttribute('data-preset') === name;
        tab.classList.toggle('ci-smart-crop__tab--active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });
    }
  }

  private applyLayout(): void {
    if (this.layout === 'single') {
      for (const [name, preview] of this.previews) {
        const isActive = name === this.activePreset;
        preview.element.style.display = isActive ? 'block' : 'none';
        preview.setActive(isActive);
      }
    } else {
      for (const [, preview] of this.previews) {
        preview.element.style.display = 'block';
        preview.setActive(false);
      }
    }
  }

  updateAll(crops: Record<string, CropRect>, imageWidth: number, imageHeight: number): void {
    for (const [name, preview] of this.previews) {
      if (crops[name]) {
        preview.update(crops[name], imageWidth, imageHeight);
      }
    }
  }

  setLayout(mode: 'grid' | 'single'): void {
    this.layout = mode;
    this.el.classList.remove(
      'ci-smart-crop__preview-grid--grid',
      'ci-smart-crop__preview-grid--single',
    );
    this.el.classList.add(`ci-smart-crop__preview-grid--${mode}`);

    if (mode === 'single' && !this.tabsEl) {
      const presets = Array.from(this.previews.values()).map((p) => ({
        name: p.presetName,
        label: p.presetLabel,
      }));
      this.buildTabs(presets as ResolvedPreset[]);
    } else if (mode === 'grid' && this.tabsEl) {
      this.tabsEl.remove();
      this.tabsEl = null;
    }

    this.applyLayout();
  }

  addPreview(preset: ResolvedPreset): void {
    if (this.previews.has(preset.name)) return;
    this.createPreview(preset);
    if (this.layout === 'single') {
      this.rebuildTabs();
      this.applyLayout();
    }
  }

  removePreview(name: string): void {
    const preview = this.previews.get(name);
    if (preview) {
      preview.destroy();
      this.previews.delete(name);
    }

    if (this.activePreset === name) {
      const first = this.previews.keys().next().value;
      if (first) this.activePreset = first;
    }

    if (this.layout === 'single') {
      this.rebuildTabs();
      this.applyLayout();
    }
  }

  private rebuildTabs(): void {
    const presets: ResolvedPreset[] = [];
    for (const [, preview] of this.previews) {
      presets.push({ name: preview.presetName, label: preview.presetLabel } as ResolvedPreset);
    }
    this.buildTabs(presets);
  }

  setShowDimensions(show: boolean): void {
    this.showDimensions = show;
    for (const [, preview] of this.previews) {
      preview.setShowDimensions(show);
    }
  }

  setSrc(src: string): void {
    this.src = src;
    for (const [, preview] of this.previews) {
      preview.setSrc(src);
    }
  }

  destroy(): void {
    for (const [, preview] of this.previews) {
      preview.destroy();
    }
    this.previews.clear();
    this.el.remove();
  }
}
