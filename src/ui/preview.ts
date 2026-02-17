import { createElement, setStyles } from '../utils/dom';
import type { CropRect, ResolvedPreset } from '../core/types';

export interface CropPreviewOptions {
  preset: ResolvedPreset;
  src: string;
  showDimensions: boolean;
  onHover: (presetName: string | null) => void;
  onClick: (presetName: string) => void;
}

const LOW_RES_THRESHOLD = 1080;

export class CropPreview {
  private el: HTMLElement;
  private img: HTMLImageElement;
  private dimensionsEl: HTMLElement;
  private warningEl: HTMLElement;
  private preset: ResolvedPreset;

  get element(): HTMLElement {
    return this.el;
  }

  get presetName(): string {
    return this.preset.name;
  }

  get presetLabel(): string {
    return this.preset.label;
  }

  setShowDimensions(show: boolean): void {
    this.dimensionsEl.style.display = show ? 'block' : 'none';
  }

  constructor(options: CropPreviewOptions) {
    this.preset = options.preset;

    // Card
    this.el = createElement('div', 'ci-smart-crop__preview-card', {
      'data-preset': options.preset.name,
    });
    setStyles(this.el, { cursor: 'pointer' });

    // Image wrapper with aspect ratio
    const wrapper = createElement('div', 'ci-smart-crop__preview-image-wrapper');
    setStyles(wrapper, {
      position: 'relative',
      overflow: 'hidden',
      aspectRatio: String(options.preset.numericRatio),
      borderRadius: 'var(--ci-smart-crop-card-border-radius, 6px)',
      backgroundColor: 'var(--ci-smart-crop-image-bg, #f0f0f0)',
    });

    // Image
    this.img = createElement('img', 'ci-smart-crop__preview-image');
    this.img.src = options.src;
    this.img.alt = `${options.preset.label} crop preview`;
    this.img.draggable = false;
    setStyles(this.img, {
      display: 'block',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: '50% 50%',
      transition: 'object-position var(--ci-smart-crop-card-image-transition, 100ms ease)',
      userSelect: 'none',
    });

    // Low resolution warning badge
    this.warningEl = createElement('div', 'ci-smart-crop__preview-warning');
    this.warningEl.textContent = '\u26A0';
    this.warningEl.title = 'Low resolution';
    setStyles(this.warningEl, { display: 'none' });

    wrapper.appendChild(this.img);
    wrapper.appendChild(this.warningEl);

    // Info bar
    const info = createElement('div', 'ci-smart-crop__preview-info');
    setStyles(info, {
      padding: 'var(--ci-smart-crop-label-padding, 8px 12px)',
    });

    const label = createElement('div', 'ci-smart-crop__preview-label');
    label.textContent = options.preset.label;
    setStyles(label, {
      fontSize: 'var(--ci-smart-crop-label-font-size, 13px)',
      fontWeight: 'var(--ci-smart-crop-label-font-weight, 600)',
      color: 'var(--ci-smart-crop-label-color, #333)',
    });

    this.dimensionsEl = createElement('div', 'ci-smart-crop__preview-dimensions');
    setStyles(this.dimensionsEl, {
      fontSize: 'var(--ci-smart-crop-dimensions-font-size, 11px)',
      color: 'var(--ci-smart-crop-dimensions-color, #999)',
      display: options.showDimensions ? 'block' : 'none',
    });

    info.appendChild(label);
    info.appendChild(this.dimensionsEl);
    this.el.appendChild(wrapper);
    this.el.appendChild(info);

    // Events
    this.el.addEventListener('mouseenter', () => options.onHover(options.preset.name));
    this.el.addEventListener('mouseleave', () => options.onHover(null));
    this.el.addEventListener('click', () => options.onClick(options.preset.name));
  }

  update(crop: CropRect, imageWidth: number, imageHeight: number): void {
    // Calculate object-position percentage
    const objectPosX =
      imageWidth > crop.width ? (crop.x / (imageWidth - crop.width)) * 100 : 50;
    const objectPosY =
      imageHeight > crop.height ? (crop.y / (imageHeight - crop.height)) * 100 : 50;

    this.img.style.objectPosition = `${objectPosX.toFixed(2)}% ${objectPosY.toFixed(2)}%`;
    this.dimensionsEl.textContent = `${crop.width} × ${crop.height} px`;

    // Low resolution warning
    const isLowRes = crop.width < LOW_RES_THRESHOLD || crop.height < LOW_RES_THRESHOLD;
    this.warningEl.style.display = isLowRes ? 'flex' : 'none';
    if (isLowRes) {
      this.warningEl.title = `Low resolution: ${crop.width} × ${crop.height} px`;
    }
  }

  setActive(active: boolean): void {
    this.el.classList.toggle('ci-smart-crop__preview-card--active', active);
  }

  destroy(): void {
    this.el.remove();
  }
}
