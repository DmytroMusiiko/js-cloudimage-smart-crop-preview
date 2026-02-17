import './styles/index.css';
import type {
  CISmartCropConfig,
  CropPreset,
  CropRect,
  CropChangeEvent,
  CISmartCropError,
  ResolvedPreset,
  ResolvedConfig,
  ExportData,
} from './core/types';
import { BUILT_IN_PRESETS, validatePreset, resolvePreset } from './core/presets';
import { calculateAllCrops } from './core/crop-engine';
import { createElement, emitEvent } from './utils/dom';
import { loadImage, revokeObjectURL, cropToBlob } from './utils/image';
import type { ImageFormat } from './utils/image';
import { FocalPointPicker } from './ui/focal-point';
import { PreviewGrid } from './ui/preview-grid';
import { CropOverlay } from './ui/overlay';

// Re-export types for consumers
export type {
  CISmartCropConfig,
  CropPreset,
  CropRect,
  CropChangeEvent,
  CISmartCropError,
  ExportData,
};
export { BUILT_IN_PRESETS };

const DEFAULTS: Omit<ResolvedConfig, 'src' | 'onChange' | 'onReady' | 'onError'> = {
  focalPoint: { x: 50, y: 50 },
  presets: BUILT_IN_PRESETS,
  layout: 'grid',
  theme: 'light',
  showOverlay: true,
  showDimensions: true,
};

export class CISmartCrop {
  // Config
  private config: ResolvedConfig;
  private resolvedPresets: ResolvedPreset[] = [];

  // Image data
  private imageWidth = 0;
  private imageHeight = 0;
  private objectURL: string | null = null;

  // State
  private focalPoint: { x: number; y: number };
  private crops: Record<string, CropRect> = {};

  // DOM
  private rootEl: HTMLElement;
  private container: HTMLElement;

  // UI components
  private focalPointPicker: FocalPointPicker | null = null;
  private previewGrid: PreviewGrid | null = null;
  private cropOverlay: CropOverlay | null = null;

  // Observers
  private resizeObserver: ResizeObserver | null = null;

  constructor(selector: string | HTMLElement, config: CISmartCropConfig) {
    // Resolve container
    if (typeof selector === 'string') {
      const el = document.querySelector(selector);
      if (!el) {
        throw new Error(`[CISmartCrop] Container not found: "${selector}"`);
      }
      this.container = el as HTMLElement;
    } else {
      this.container = selector;
    }

    // Merge config with defaults
    this.config = {
      ...DEFAULTS,
      ...config,
      focalPoint: config.focalPoint || { ...DEFAULTS.focalPoint },
      presets: config.presets || [...DEFAULTS.presets],
    } as ResolvedConfig;

    this.focalPoint = { ...this.config.focalPoint };

    // Validate and resolve presets
    this.resolvePresets();

    // Create root DOM
    this.rootEl = createElement('div', 'ci-smart-crop');
    this.rootEl.classList.add(`ci-smart-crop--${this.config.theme}`);
    this.container.appendChild(this.rootEl);

    // Set up ResizeObserver
    this.setupResizeObserver();

    // Initialize
    this.init();
  }

  private resolvePresets(): void {
    this.resolvedPresets = [];
    for (let i = 0; i < this.config.presets.length; i++) {
      const preset = this.config.presets[i];
      const error = validatePreset(preset);
      if (error) {
        console.warn(`[CISmartCrop] ${error} Skipping.`);
        continue;
      }
      this.resolvedPresets.push(resolvePreset(preset, i));
    }
  }

  private async init(): Promise<void> {
    try {
      // Load image
      const { width, height } = await loadImage(this.config.src);
      this.imageWidth = width;
      this.imageHeight = height;

      // Create focal point picker
      this.focalPointPicker = new FocalPointPicker(this.rootEl, {
        src: this.config.src,
        initialPoint: this.focalPoint,
        onChange: (point) => this.handleFocalPointChange(point),
      });

      // Create overlay
      this.cropOverlay = new CropOverlay(this.focalPointPicker.element, {
        presets: this.resolvedPresets,
        showOverlay: this.config.showOverlay,
      });

      // Create preview grid
      this.previewGrid = new PreviewGrid(this.rootEl, {
        presets: this.resolvedPresets,
        src: this.config.src,
        layout: this.config.layout,
        showDimensions: this.config.showDimensions,
        onPreviewHover: (name) => this.cropOverlay?.setHoveredPreset(name),
      });

      // Calculate initial crops
      this.recalculateCrops();
      this.updateUI();

      // Emit ready
      this.config.onReady?.(this);
      emitEvent(this.rootEl, 'ci-smart-crop:ready', { instance: this });
    } catch (err) {
      this.showError(err as Error);
    }
  }

  private handleFocalPointChange(point: { x: number; y: number }): void {
    this.focalPoint = point;
    this.recalculateCrops();
    this.updateUI();

    const event: CropChangeEvent = {
      focalPoint: { ...this.focalPoint },
      crops: { ...this.crops },
    };
    this.config.onChange?.(event);
    emitEvent(this.rootEl, 'ci-smart-crop:change', event);
  }

  private recalculateCrops(): void {
    this.crops = calculateAllCrops(
      this.imageWidth,
      this.imageHeight,
      this.focalPoint.x,
      this.focalPoint.y,
      this.resolvedPresets,
    );
  }

  private updateUI(): void {
    this.previewGrid?.updateAll(this.crops, this.imageWidth, this.imageHeight);
    this.cropOverlay?.updateAll(this.crops, this.imageWidth, this.imageHeight);
  }

  private showError(err: Error): void {
    const error: CISmartCropError = {
      code: 'IMAGE_LOAD_FAILED',
      message: err.message,
    };

    // Create error UI
    const errorEl = createElement('div', 'ci-smart-crop__error');
    errorEl.innerHTML = `
      <div class="ci-smart-crop__error-icon">&#9888;</div>
      <div class="ci-smart-crop__error-message">Image failed to load</div>
      <div class="ci-smart-crop__error-details">${err.message}</div>
    `;
    this.rootEl.appendChild(errorEl);

    this.config.onError?.(error);
    emitEvent(this.rootEl, 'ci-smart-crop:error', { error });
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        this.rootEl.classList.toggle('ci-smart-crop--compact', width < 768);
      }
    });
    this.resizeObserver.observe(this.rootEl);
  }

  // === Public API ===

  setFocalPoint(point: { x: number; y: number }): void {
    this.focalPointPicker?.setFocalPoint(point);
    this.handleFocalPointChange(point);
  }

  getFocalPoint(): { x: number; y: number } {
    return { ...this.focalPoint };
  }

  getCrops(): Record<string, CropRect> {
    return { ...this.crops };
  }

  getCrop(name: string): CropRect | undefined {
    return this.crops[name] ? { ...this.crops[name] } : undefined;
  }

  addPreset(preset: CropPreset): void {
    const error = validatePreset(preset);
    if (error) {
      console.warn(`[CISmartCrop] ${error}`);
      return;
    }

    if (this.resolvedPresets.some((p) => p.name === preset.name)) {
      console.warn(`[CISmartCrop] Preset name "${preset.name}" already exists. Ignoring duplicate.`);
      return;
    }

    const resolved = resolvePreset(preset, this.resolvedPresets.length);
    this.resolvedPresets.push(resolved);
    this.config.presets.push(preset);

    this.cropOverlay?.addPresetOverlay(resolved);
    this.previewGrid?.addPreview(resolved);

    this.recalculateCrops();
    this.updateUI();

    emitEvent(this.rootEl, 'ci-smart-crop:preset-add', { preset });
  }

  removePreset(name: string): boolean {
    if (this.resolvedPresets.length <= 1) {
      console.warn('[CISmartCrop] Cannot remove last preset. At least 1 preset is required.');
      return false;
    }

    const index = this.resolvedPresets.findIndex((p) => p.name === name);
    if (index === -1) return false;

    this.resolvedPresets.splice(index, 1);
    this.config.presets = this.config.presets.filter((p) => p.name !== name);
    delete this.crops[name];

    this.cropOverlay?.removePresetOverlay(name);
    this.previewGrid?.removePreview(name);

    emitEvent(this.rootEl, 'ci-smart-crop:preset-remove', { name });
    return true;
  }

  getPresets(): CropPreset[] {
    return this.resolvedPresets.map(({ name, ratio, label, color }) => ({
      name,
      ratio,
      label,
      color,
    }));
  }

  setLayout(layout: 'grid' | 'single'): void {
    this.config.layout = layout;
    this.previewGrid?.setLayout(layout);
    emitEvent(this.rootEl, 'ci-smart-crop:layout-change', { layout });
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.config.theme = theme;
    this.rootEl.classList.remove('ci-smart-crop--light', 'ci-smart-crop--dark');
    this.rootEl.classList.add(`ci-smart-crop--${theme}`);
    emitEvent(this.rootEl, 'ci-smart-crop:theme-change', { theme });
  }

  async setSrc(src: string): Promise<void> {
    // Revoke old object URL if any
    if (this.objectURL) {
      revokeObjectURL(this.objectURL);
      this.objectURL = null;
    }

    this.config.src = src;

    try {
      const { width, height } = await loadImage(src);
      this.imageWidth = width;
      this.imageHeight = height;
      await this.focalPointPicker?.setSrc(src);
      this.recalculateCrops();
      this.updateUI();
    } catch (err) {
      this.showError(err as Error);
    }
  }

  exportJSON(): string {
    const data: ExportData = {
      version: '1.0',
      focalPoint: { ...this.focalPoint },
      image: {
        src: this.config.src,
        width: this.imageWidth,
        height: this.imageHeight,
      },
      crops: {},
    };

    for (const preset of this.resolvedPresets) {
      const crop = this.crops[preset.name];
      if (crop) {
        data.crops[preset.name] = {
          ...crop,
          preset: { name: preset.name, ratio: preset.ratio, label: preset.label },
        };
      }
    }

    return JSON.stringify(data, null, 2);
  }

  async exportCropBlob(
    presetName: string,
    format: ImageFormat = 'png',
    quality = 0.92,
  ): Promise<Blob> {
    const crop = this.crops[presetName];
    if (!crop) {
      throw new Error(`[CISmartCrop] Preset "${presetName}" not found.`);
    }
    const { img } = await loadImage(this.config.src);
    return cropToBlob(img, crop, format, quality);
  }

  update(config: Partial<CISmartCropConfig>): void {
    if (config.src) this.setSrc(config.src);
    if (config.focalPoint) this.setFocalPoint(config.focalPoint);
    if (config.layout) this.setLayout(config.layout);
    if (config.theme) this.setTheme(config.theme);
    if (config.showOverlay !== undefined) {
      this.config.showOverlay = config.showOverlay;
      this.cropOverlay?.setVisible(config.showOverlay);
    }
    if (config.showDimensions !== undefined) {
      this.config.showDimensions = config.showDimensions;
      this.previewGrid?.setShowDimensions(config.showDimensions);
    }
    if (config.onChange) this.config.onChange = config.onChange;
    if (config.onReady) this.config.onReady = config.onReady;
    if (config.onError) this.config.onError = config.onError;
  }

  destroy(): void {
    // Disconnect observer
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    // Destroy UI components
    this.focalPointPicker?.destroy();
    this.previewGrid?.destroy();
    this.cropOverlay?.destroy();

    this.focalPointPicker = null;
    this.previewGrid = null;
    this.cropOverlay = null;

    // Revoke object URL
    if (this.objectURL) {
      revokeObjectURL(this.objectURL);
      this.objectURL = null;
    }

    // Remove root element
    this.rootEl.remove();
  }

  // === Static Methods ===

  static autoInit(): void {
    const elements = document.querySelectorAll<HTMLElement>('[data-ci-smart-crop]');
    elements.forEach((el) => {
      if ((el as HTMLElement & { __ciSmartCrop?: CISmartCrop }).__ciSmartCrop) return;

      const config = CISmartCrop.parseDataAttributes(el);
      if (!config.src) {
        console.warn('[CISmartCrop] Element missing data-ci-smart-crop-src. Skipping.');
        return;
      }

      const instance = new CISmartCrop(el, config);
      (el as HTMLElement & { __ciSmartCrop?: CISmartCrop }).__ciSmartCrop = instance;
    });
  }

  private static parseDataAttributes(el: HTMLElement): CISmartCropConfig {
    const dataset = el.dataset;
    const config: CISmartCropConfig = {
      src: dataset.ciSmartCropSrc || '',
    };

    if (dataset.ciSmartCropFocalPoint) {
      const parts = dataset.ciSmartCropFocalPoint.split(',').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        config.focalPoint = { x: parts[0], y: parts[1] };
      }
    }

    if (dataset.ciSmartCropPresets) {
      try {
        config.presets = JSON.parse(dataset.ciSmartCropPresets);
      } catch {
        console.warn('[CISmartCrop] Failed to parse data-ci-smart-crop-presets JSON.');
      }
    }

    if (dataset.ciSmartCropLayout) {
      config.layout = dataset.ciSmartCropLayout as 'grid' | 'single';
    }
    if (dataset.ciSmartCropTheme) {
      config.theme = dataset.ciSmartCropTheme as 'light' | 'dark';
    }
    if (dataset.ciSmartCropShowOverlay !== undefined) {
      config.showOverlay = dataset.ciSmartCropShowOverlay !== 'false';
    }
    if (dataset.ciSmartCropShowDimensions !== undefined) {
      config.showDimensions = dataset.ciSmartCropShowDimensions !== 'false';
    }

    return config;
  }
}

