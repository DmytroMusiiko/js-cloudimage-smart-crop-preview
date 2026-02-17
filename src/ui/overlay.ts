import { createElement, setStyles } from '../utils/dom';
import type { CropRect, ResolvedPreset } from '../core/types';

export interface CropOverlayOptions {
  presets: ResolvedPreset[];
  showOverlay: boolean;
}

export class CropOverlay {
  private el: HTMLElement;
  private rects: Map<string, HTMLElement> = new Map();
  private presets: Map<string, ResolvedPreset> = new Map();
  private isVisible: boolean;

  get element(): HTMLElement {
    return this.el;
  }

  constructor(imageArea: HTMLElement, options: CropOverlayOptions) {
    this.isVisible = options.showOverlay;

    this.el = createElement('div', 'ci-smart-crop__overlay');
    setStyles(this.el, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      display: this.isVisible ? 'block' : 'none',
    });

    for (const preset of options.presets) {
      this.addRect(preset);
    }

    imageArea.appendChild(this.el);
  }

  private addRect(preset: ResolvedPreset): void {
    this.presets.set(preset.name, preset);

    const rect = createElement('div', 'ci-smart-crop__overlay-rect', {
      'data-preset': preset.name,
    });
    setStyles(rect, {
      position: 'absolute',
      border: `var(--ci-smart-crop-overlay-border-width, 2px) solid ${preset.color}`,
      opacity: 'var(--ci-smart-crop-overlay-opacity, 0.3)',
      transition: `all var(--ci-smart-crop-overlay-transition, 150ms ease)`,
      boxSizing: 'border-box',
    });

    this.rects.set(preset.name, rect);
    this.el.appendChild(rect);
  }

  updateAll(crops: Record<string, CropRect>, imageWidth: number, imageHeight: number): void {
    for (const [name, rect] of this.rects) {
      const crop = crops[name];
      if (!crop) continue;

      rect.style.left = `${(crop.x / imageWidth) * 100}%`;
      rect.style.top = `${(crop.y / imageHeight) * 100}%`;
      rect.style.width = `${(crop.width / imageWidth) * 100}%`;
      rect.style.height = `${(crop.height / imageHeight) * 100}%`;
    }
  }

  setHoveredPreset(presetName: string | null): void {

    for (const [name, rect] of this.rects) {
      if (presetName === null) {
        // No hover — show all with reduced opacity
        rect.style.opacity = 'var(--ci-smart-crop-overlay-opacity, 0.3)';
        rect.style.borderWidth = 'var(--ci-smart-crop-overlay-border-width, 2px)';
        rect.style.boxShadow = 'none';
        rect.classList.remove('ci-smart-crop__overlay-rect--active');
      } else if (name === presetName) {
        // Hovered — full opacity + darken area outside crop
        rect.style.opacity = 'var(--ci-smart-crop-overlay-opacity-hover, 1)';
        rect.style.borderWidth = 'var(--ci-smart-crop-overlay-border-width-hover, 3px)';
        rect.style.boxShadow = '0 0 0 9999px var(--ci-smart-crop-overlay-darken, rgba(0, 0, 0, 0.4))';
        rect.classList.add('ci-smart-crop__overlay-rect--active');
      } else {
        // Not hovered — very faint
        rect.style.opacity = '0.1';
        rect.style.borderWidth = 'var(--ci-smart-crop-overlay-border-width, 2px)';
        rect.style.boxShadow = 'none';
        rect.classList.remove('ci-smart-crop__overlay-rect--active');
      }
    }
  }

  addPresetOverlay(preset: ResolvedPreset): void {
    if (this.rects.has(preset.name)) return;
    this.addRect(preset);
  }

  removePresetOverlay(name: string): void {
    const rect = this.rects.get(name);
    if (rect) {
      rect.remove();
      this.rects.delete(name);
      this.presets.delete(name);
    }
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.el.style.display = visible ? 'block' : 'none';
  }

  destroy(): void {
    this.el.remove();
    this.rects.clear();
    this.presets.clear();
  }
}
