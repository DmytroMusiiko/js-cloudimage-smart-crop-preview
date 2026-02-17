import { createElement, setStyles } from '../utils/dom';

export interface FocalPointPickerOptions {
  src: string;
  initialPoint: { x: number; y: number };
  onChange: (point: { x: number; y: number }) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export class FocalPointPicker {
  private el: HTMLElement;
  private img: HTMLImageElement;
  private marker: HTMLElement;
  private crosshairH: HTMLElement;
  private crosshairV: HTMLElement;
  private dimensionsLabel: HTMLElement;
  private point: { x: number; y: number };
  private onChange: (point: { x: number; y: number }) => void;
  private cleanupFns: (() => void)[] = [];
  private isDragging = false;

  /** The image area element (used by overlay to attach itself) */
  get element(): HTMLElement {
    return this.el;
  }

  /** Natural image dimensions, available after image loads */
  imageWidth = 0;
  imageHeight = 0;

  constructor(container: HTMLElement, options: FocalPointPickerOptions) {
    this.point = { ...options.initialPoint };
    this.onChange = options.onChange;

    // Image area
    this.el = createElement('div', 'ci-smart-crop__image-area', {
      role: 'application',
      'aria-label': 'Image with focal point picker',
    });
    setStyles(this.el, { position: 'relative', overflow: 'hidden', cursor: 'crosshair' });

    // Image
    this.img = createElement('img', 'ci-smart-crop__image');
    this.img.alt = 'Original image';
    this.img.draggable = false;
    setStyles(this.img, {
      display: 'block',
      width: '100%',
      height: 'auto',
      userSelect: 'none',
    });

    // Crosshair lines
    this.crosshairH = createElement('div', 'ci-smart-crop__focal-crosshair-h');
    setStyles(this.crosshairH, {
      position: 'absolute',
      left: '0',
      right: '0',
      height: 'var(--ci-smart-crop-focal-crosshair-width, 1px)',
      backgroundColor: 'var(--ci-smart-crop-focal-crosshair-color, rgba(33, 150, 243, 0.4))',
      pointerEvents: 'none',
      transition: 'top var(--ci-smart-crop-overlay-transition, 150ms ease)',
    });

    this.crosshairV = createElement('div', 'ci-smart-crop__focal-crosshair-v');
    setStyles(this.crosshairV, {
      position: 'absolute',
      top: '0',
      bottom: '0',
      width: 'var(--ci-smart-crop-focal-crosshair-width, 1px)',
      backgroundColor: 'var(--ci-smart-crop-focal-crosshair-color, rgba(33, 150, 243, 0.4))',
      pointerEvents: 'none',
      transition: 'left var(--ci-smart-crop-overlay-transition, 150ms ease)',
    });

    // Focal point marker
    this.marker = createElement('div', 'ci-smart-crop__focal-marker', {
      role: 'slider',
      tabindex: '0',
      'aria-label': 'Focal point',
      'aria-valuetext': `Position: ${this.point.x}% horizontal, ${this.point.y}% vertical`,
    });
    setStyles(this.marker, {
      position: 'absolute',
      width: 'var(--ci-smart-crop-focal-ring-size, 24px)',
      height: 'var(--ci-smart-crop-focal-ring-size, 24px)',
      transform: 'translate(-50%, -50%)',
      cursor: 'grab',
      zIndex: '10',
      touchAction: 'none',
    });

    const dot = createElement('div', 'ci-smart-crop__focal-dot');
    setStyles(dot, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'var(--ci-smart-crop-focal-dot-size, 8px)',
      height: 'var(--ci-smart-crop-focal-dot-size, 8px)',
      borderRadius: '50%',
      backgroundColor: 'var(--ci-smart-crop-focal-color, #2196F3)',
    });

    const ring = createElement('div', 'ci-smart-crop__focal-ring');
    setStyles(ring, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      border: 'var(--ci-smart-crop-focal-ring-border, 2px) solid var(--ci-smart-crop-focal-color, #2196F3)',
      opacity: 'var(--ci-smart-crop-focal-ring-opacity, 0.5)',
    });

    this.marker.appendChild(dot);
    this.marker.appendChild(ring);

    // Dimensions label
    this.dimensionsLabel = createElement('div', 'ci-smart-crop__dimensions-label', {
      'aria-live': 'polite',
    });
    setStyles(this.dimensionsLabel, {
      position: 'absolute',
      bottom: '8px',
      right: '8px',
      fontSize: 'var(--ci-smart-crop-dimensions-font-size, 11px)',
      color: 'var(--ci-smart-crop-dimensions-color, #999)',
      backgroundColor: 'var(--ci-smart-crop-bg, rgba(255,255,255,0.8))',
      padding: '2px 6px',
      borderRadius: '3px',
      pointerEvents: 'none',
    });

    // Assemble
    this.el.appendChild(this.img);
    this.el.appendChild(this.crosshairH);
    this.el.appendChild(this.crosshairV);
    this.el.appendChild(this.marker);
    this.el.appendChild(this.dimensionsLabel);
    container.appendChild(this.el);

    // Load image
    this.loadImage(options.src);

    // Set up events
    this.setupPointerEvents();
    this.setupKeyboardEvents();
  }

  private loadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.img.onload = () => {
        this.imageWidth = this.img.naturalWidth;
        this.imageHeight = this.img.naturalHeight;
        this.dimensionsLabel.textContent = `${this.imageWidth} × ${this.imageHeight} px`;
        this.updateMarkerPosition();
        resolve();
      };
      this.img.onerror = () => {
        reject(new Error(`Failed to load image: ${src}`));
      };
      this.img.src = src;
    });
  }

  private setupPointerEvents(): void {
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      this.isDragging = true;
      this.marker.style.cursor = 'grabbing';
      this.el.setPointerCapture(e.pointerId);
      this.updateFromPointer(e);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging) return;
      e.preventDefault();
      requestAnimationFrame(() => this.updateFromPointer(e));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.marker.style.cursor = 'grab';
      this.el.releasePointerCapture(e.pointerId);
    };

    this.el.addEventListener('pointerdown', onPointerDown);
    this.el.addEventListener('pointermove', onPointerMove);
    this.el.addEventListener('pointerup', onPointerUp);
    this.el.style.touchAction = 'none';

    this.cleanupFns.push(() => {
      this.el.removeEventListener('pointerdown', onPointerDown);
      this.el.removeEventListener('pointermove', onPointerMove);
      this.el.removeEventListener('pointerup', onPointerUp);
    });
  }

  private setupKeyboardEvents(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 5 : 1;
      let { x, y } = this.point;

      switch (e.key) {
        case 'ArrowLeft':
          x -= step;
          break;
        case 'ArrowRight':
          x += step;
          break;
        case 'ArrowUp':
          y -= step;
          break;
        case 'ArrowDown':
          y += step;
          break;
        default:
          return;
      }

      e.preventDefault();
      this.setPoint(clamp(x, 0, 100), clamp(y, 0, 100));
    };

    this.marker.addEventListener('keydown', onKeyDown);
    this.cleanupFns.push(() => this.marker.removeEventListener('keydown', onKeyDown));
  }

  private updateFromPointer(e: PointerEvent): void {
    const imgRect = this.img.getBoundingClientRect();
    const x = clamp(((e.clientX - imgRect.left) / imgRect.width) * 100, 0, 100);
    const y = clamp(((e.clientY - imgRect.top) / imgRect.height) * 100, 0, 100);
    this.setPoint(x, y);
  }

  private setPoint(x: number, y: number): void {
    this.point = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    this.updateMarkerPosition();
    this.marker.setAttribute(
      'aria-valuetext',
      `Position: ${this.point.x}% horizontal, ${this.point.y}% vertical`,
    );
    this.onChange(this.point);
  }

  private updateMarkerPosition(): void {
    this.marker.style.left = `${this.point.x}%`;
    this.marker.style.top = `${this.point.y}%`;
    this.crosshairH.style.top = `${this.point.y}%`;
    this.crosshairV.style.left = `${this.point.x}%`;
  }

  setFocalPoint(point: { x: number; y: number }): void {
    this.setPoint(clamp(point.x, 0, 100), clamp(point.y, 0, 100));
  }

  getFocalPoint(): { x: number; y: number } {
    return { ...this.point };
  }

  async setSrc(src: string): Promise<void> {
    await this.loadImage(src);
  }

  destroy(): void {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
    this.el.remove();
  }
}
