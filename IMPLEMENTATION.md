# IMPLEMENTATION.md — js-cloudimage-smart-crop-preview

> Technical implementation guide for developers working on this library.
> For feature specifications, see [specs.md](./specs.md).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Module Dependency Graph](#2-module-dependency-graph)
3. [Core Layer — Detailed Implementation](#3-core-layer--detailed-implementation)
   - 3.1 [types.ts](#31-typests)
   - 3.2 [presets.ts](#32-presetsts)
   - 3.3 [crop-engine.ts](#33-crop-enginets)
4. [Utils Layer](#4-utils-layer)
   - 4.1 [dom.ts](#41-domts)
   - 4.2 [image.ts](#42-imagets)
5. [UI Layer — Detailed Implementation](#5-ui-layer--detailed-implementation)
   - 5.1 [FocalPointPicker](#51-focalpointpicker)
   - 5.2 [CropPreview](#52-croppreview)
   - 5.3 [PreviewGrid](#53-previewgrid)
   - 5.4 [CropOverlay](#54-cropoverlay)
6. [Main Class — CISmartCrop](#6-main-class--cismartcrop)
   - 6.1 [Lifecycle](#61-lifecycle)
   - 6.2 [Internal State](#62-internal-state)
   - 6.3 [Update Flow](#63-update-flow)
   - 6.4 [autoInit()](#64-autoinit)
   - 6.5 [DOM Events](#65-dom-events)
7. [CSS Architecture](#7-css-architecture)
   - 7.1 [BEM Naming Convention](#71-bem-naming-convention)
   - 7.2 [Theme Switching](#72-theme-switching)
   - 7.3 [Responsive Strategy](#73-responsive-strategy)
8. [React Wrapper — Detailed Implementation](#8-react-wrapper--detailed-implementation)
   - 8.1 [CISmartCropViewer Component](#81-cismartcropviewer-component)
   - 8.2 [useCISmartCrop Hook](#82-usecismartcrop-hook)
   - 8.3 [Ref API with useImperativeHandle](#83-ref-api-with-useimperativehandle)
9. [Build Pipeline](#9-build-pipeline)
   - 9.1 [Library Build (vite.config.ts)](#91-library-build-viteconfigts)
   - 9.2 [React Build (vite-react.config.ts)](#92-react-build-vite-reactconfigts)
   - 9.3 [Demo Build (vite-demo.config.ts)](#93-demo-build-vite-democonfigts)
10. [Testing Guide](#10-testing-guide)
11. [Performance Optimization Details](#11-performance-optimization-details)
12. [Common Patterns & Conventions](#12-common-patterns--conventions)
13. [Implementation Status](#13-implementation-status)

---

## 1. Architecture Overview

The library follows a **layered architecture** with clear separation of concerns:

```
┌──────────────────────────────────────────────────────────┐
│                      React Wrapper                        │
│         (react/index.tsx, react/hooks.ts)                 │
│         Optional, separate entry point                    │
├──────────────────────────────────────────────────────────┤
│                    Main Class Layer                        │
│              (src/index.ts — CISmartCrop)                 │
│      Orchestrates all components, public API               │
├──────────────────────────────────────────────────────────┤
│                       UI Layer                             │
│   ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐     │
│   │FocalPoint│ │ Preview  │ │Preview │ │  Crop    │     │
│   │ Picker   │ │          │ │ Grid   │ │ Overlay  │     │
│   └──────────┘ └──────────┘ └────────┘ └──────────┘     │
├──────────────────────────────────────────────────────────┤
│                    Utilities Layer                         │
│            ┌──────────┐  ┌──────────┐                    │
│            │  dom.ts  │  │ image.ts │                    │
│            └──────────┘  └──────────┘                    │
├──────────────────────────────────────────────────────────┤
│                      Core Layer                           │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│   │ types.ts │  │presets.ts│  │crop-     │              │
│   │          │  │          │  │engine.ts │              │
│   └──────────┘  └──────────┘  └──────────┘              │
│           Pure logic, no DOM, no side effects             │
└──────────────────────────────────────────────────────────┘
```

**Key principles:**
- **Core layer** is pure functions — no DOM, no side effects, fully testable
- **UI layer** components manage their own DOM subtree, receive callbacks
- **Main class** is the orchestrator — creates UI components, wires events, manages state
- **React wrapper** is a thin layer around the main class

---

## 2. Module Dependency Graph

```
src/index.ts (CISmartCrop)
├── src/core/types.ts          ← interfaces only, no runtime code
├── src/core/presets.ts         ← BUILT_IN_PRESETS, parseRatio(), resolvePreset()
├── src/core/crop-engine.ts     ← calculateCrop(), calculateAllCrops()
├── src/utils/dom.ts            ← createElement(), setStyles(), emitEvent()
├── src/utils/image.ts          ← loadImage(), fileToObjectURL(), revokeObjectURL()
├── src/ui/focal-point.ts       ← FocalPointPicker class
├── src/ui/preview.ts           ← CropPreview class
├── src/ui/preview-grid.ts      ← PreviewGrid class
├── src/ui/overlay.ts           ← CropOverlay class
└── src/styles/index.css        ← imported for side-effect (CSS injection)

react/index.tsx (CISmartCropViewer)
├── react/hooks.ts              ← useCISmartCrop()
├── src/core/types.ts           ← re-export interfaces
└── src/index.ts                ← uses CISmartCrop internally
```

**Import rules:**
- Core modules NEVER import from UI or utils
- UI modules may import from core and utils, NOT from each other
- Main class imports everything
- React wrapper imports main class + types

---

## 3. Core Layer — Detailed Implementation

### 3.1 types.ts

Pure TypeScript interfaces. No runtime code. Exported for consumers.

**Key interfaces:**
- `CISmartCropConfig` — user-facing config
- `ResolvedConfig` — internal config with all defaults applied
- `CropPreset` / `ResolvedPreset` — preset before/after resolution
- `CropRect` — pixel-based crop rectangle
- `CropChangeEvent` — emitted on change
- `CISmartCropError` — structured error
- `ExportData` — JSON export schema

### 3.2 presets.ts

**`parseRatio(input: string | number): number`**

Parsing strategy (in order):
1. If `number` → validate > 0 and finite → return
2. If contains `:` or `/` → split, parse both sides → return w/h
3. Try `parseFloat()` → validate → return
4. Otherwise throw

**`validatePreset(preset): string | null`**

Returns error message string or null if valid. Used by main class before adding presets.

**`resolvePreset(preset, index): ResolvedPreset`**

Enriches preset with:
- `numericRatio` — parsed number
- `label` — fallback to `name`
- `color` — fallback to palette color at `index % 10`

### 3.3 crop-engine.ts

**`calculateCrop(imageWidth, imageHeight, focalX, focalY, targetRatio): CropRect`**

This is the heart of the library. The algorithm in detail:

```typescript
// Step 1: Determine crop dimensions (largest rect with target ratio that fits)
if (targetRatio > imageRatio) {
  // Image is "taller" than target → use full width, calc height
  cropWidth = imageWidth;
  cropHeight = imageWidth / targetRatio;
} else {
  // Image is "wider" than target → use full height, calc width
  cropHeight = imageHeight;
  cropWidth = imageHeight * targetRatio;
}

// Step 2: Convert focal point from percent to pixels
focalPxX = (focalX / 100) * imageWidth;
focalPxY = (focalY / 100) * imageHeight;

// Step 3: Position crop centered on focal point
cropX = focalPxX - cropWidth / 2;
cropY = focalPxY - cropHeight / 2;

// Step 4: Clamp — keep crop within image
cropX = clamp(cropX, 0, imageWidth - cropWidth);
cropY = clamp(cropY, 0, imageHeight - cropHeight);

// Step 5: Round to integers
return { x: round(cropX), y: round(cropY), width: round(cropWidth), height: round(cropHeight) };
```

**Why this works:**
- The crop is always the LARGEST possible for the given ratio (step 1)
- The focal point is the CENTER of the crop when possible (step 3)
- When the focal point is near an edge, the crop slides to stay within bounds (step 4)
- No empty space ever appears in the crop

**`calculateAllCrops(...)`** — convenience wrapper that runs `calculateCrop` for each preset.

---

## 4. Utils Layer

### 4.1 dom.ts

Simple DOM helpers to reduce boilerplate:

- `createElement(tag, className?, attrs?)` — create element with class and attributes
- `setStyles(el, styles)` — batch set inline styles
- `emitEvent(el, name, detail)` — dispatch CustomEvent

### 4.2 image.ts

Image loading and URL management:

- `loadImage(src)` — returns Promise with `{ img, width, height }`
  - Sets `crossOrigin = 'anonymous'` for CORS
  - Rejects on error with descriptive message
- `fileToObjectURL(file)` — wraps `URL.createObjectURL()`
- `revokeObjectURL(url)` — safely revokes blob URLs only
- `isLocalSource(src)` — checks if src is data URI or blob URL

---

## 5. UI Layer — Detailed Implementation

Each UI component follows the same pattern:

```typescript
class UIComponent {
  private el: HTMLElement;        // Root DOM element
  private cleanup: (() => void)[] = [];  // Event listener cleanup functions

  constructor(container: HTMLElement, options: Options) {
    this.el = createElement('div', 'ci-smart-crop__component');
    container.appendChild(this.el);
    this.setup();
  }

  update(data: UpdateData): void { /* re-render */ }
  destroy(): void {
    this.cleanup.forEach(fn => fn());
    this.el.remove();
  }
}
```

### 5.1 FocalPointPicker

**File:** `src/ui/focal-point.ts`

**Responsibilities:**
- Render the image inside a positioned container
- Render the focal point marker (dot + ring + crosshair lines)
- Handle pointer events for dragging
- Handle keyboard events for accessibility
- Emit focal point changes via callback

**DOM structure:**
```html
<div class="ci-smart-crop__image-area" role="application" aria-label="Image with focal point picker">
  <img class="ci-smart-crop__image" src="..." alt="Original" />
  <div class="ci-smart-crop__focal-marker" role="slider"
       aria-label="Focal point" aria-valuetext="50% horizontal, 50% vertical"
       tabindex="0" style="left: 50%; top: 50%;">
    <div class="ci-smart-crop__focal-dot"></div>
    <div class="ci-smart-crop__focal-ring"></div>
  </div>
  <div class="ci-smart-crop__focal-crosshair-h" style="top: 50%;"></div>
  <div class="ci-smart-crop__focal-crosshair-v" style="left: 50%;"></div>
  <div class="ci-smart-crop__dimensions-label">4000 × 3000 px</div>
  <!-- Overlay rectangles inserted here by CropOverlay -->
</div>
```

**Drag implementation:**
```typescript
// Unified pointer events (works for mouse + touch)
marker.addEventListener('pointerdown', onPointerDown);

function onPointerDown(e: PointerEvent) {
  e.preventDefault();
  marker.setPointerCapture(e.pointerId);
  isDragging = true;

  const onMove = (e: PointerEvent) => {
    if (!isDragging) return;
    const rect = imageArea.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width * 100, 0, 100);
    const y = clamp((e.clientY - rect.top) / rect.height * 100, 0, 100);
    requestAnimationFrame(() => updatePosition(x, y));
  };

  const onUp = () => {
    isDragging = false;
    marker.releasePointerCapture(e.pointerId);
  };

  marker.addEventListener('pointermove', onMove);
  marker.addEventListener('pointerup', onUp, { once: true });
}
```

**Click-to-set:** Also listen for `pointerdown` on the image area itself (not just the marker).

**Keyboard:**
```typescript
marker.addEventListener('keydown', (e: KeyboardEvent) => {
  const step = e.shiftKey ? 5 : 1;
  switch (e.key) {
    case 'ArrowLeft':  updatePosition(x - step, y); break;
    case 'ArrowRight': updatePosition(x + step, y); break;
    case 'ArrowUp':    updatePosition(x, y - step); break;
    case 'ArrowDown':  updatePosition(x, y + step); break;
  }
});
```

### 5.2 CropPreview

**File:** `src/ui/preview.ts`

**Responsibilities:**
- Render a single preview card with cropped image view
- Show preset label and dimensions
- Emit hover/click events

**DOM structure:**
```html
<div class="ci-smart-crop__preview-card" data-preset="landscape">
  <div class="ci-smart-crop__preview-image-wrapper" style="aspect-ratio: 16/9;">
    <img class="ci-smart-crop__preview-image" src="..."
         style="object-fit: cover; object-position: 50% 25%;" />
  </div>
  <div class="ci-smart-crop__preview-info">
    <span class="ci-smart-crop__preview-label">Landscape 16:9</span>
    <span class="ci-smart-crop__preview-dimensions">4000 × 2250 px</span>
  </div>
</div>
```

**Key technique — CSS-based crop preview:**

Instead of using Canvas, we use CSS `object-fit` + `object-position` to show the crop:

```typescript
function updatePreview(crop: CropRect, imageWidth: number, imageHeight: number) {
  // Calculate object-position percentage
  // This tells the browser which part of the image to show
  const objectPosX = imageWidth > crop.width
    ? (crop.x / (imageWidth - crop.width)) * 100
    : 50;
  const objectPosY = imageHeight > crop.height
    ? (crop.y / (imageHeight - crop.height)) * 100
    : 50;

  img.style.objectPosition = `${objectPosX}% ${objectPosY}%`;
}
```

**Why CSS instead of Canvas:**
- No pixel manipulation = faster
- Browser handles scaling/rendering natively
- CSS transitions work for smooth updates
- No memory overhead for multiple canvases

### 5.3 PreviewGrid

**File:** `src/ui/preview-grid.ts`

**Responsibilities:**
- Manage multiple `CropPreview` instances
- Handle grid vs single layout mode
- Render tabs for single mode
- Emit hover events for overlay coordination

**DOM structure — Grid mode:**
```html
<div class="ci-smart-crop__preview-grid ci-smart-crop__preview-grid--grid">
  <!-- CropPreview cards rendered here -->
</div>
```

**DOM structure — Single mode:**
```html
<div class="ci-smart-crop__preview-grid ci-smart-crop__preview-grid--single">
  <div class="ci-smart-crop__tabs" role="tablist">
    <button class="ci-smart-crop__tab ci-smart-crop__tab--active" role="tab">16:9</button>
    <button class="ci-smart-crop__tab" role="tab">1:1</button>
    <button class="ci-smart-crop__tab" role="tab">9:16</button>
  </div>
  <div class="ci-smart-crop__preview-single">
    <!-- Active CropPreview rendered here -->
  </div>
</div>
```

**Preview management:**
```typescript
class PreviewGrid {
  private previews: Map<string, CropPreview> = new Map();
  private activePreset: string | null = null;  // for single mode

  addPreview(preset: ResolvedPreset, src: string): void { ... }
  removePreview(name: string): void { ... }
  updateAll(crops: Record<string, CropRect>, imageW: number, imageH: number): void {
    for (const [name, preview] of this.previews) {
      if (crops[name]) preview.update(crops[name], imageW, imageH);
    }
  }
  setLayout(mode: 'grid' | 'single'): void { ... }
}
```

### 5.4 CropOverlay

**File:** `src/ui/overlay.ts`

**Responsibilities:**
- Render colored rectangles on top of the original image
- Highlight the hovered preset's rectangle
- Darken area outside hovered crop

**DOM structure:**
```html
<div class="ci-smart-crop__overlay" style="pointer-events: none;">
  <!-- One rect per preset -->
  <div class="ci-smart-crop__overlay-rect" data-preset="landscape"
       style="left: 0%; top: 12.5%; width: 100%; height: 75%;
              border: 2px solid #FF6B6B; opacity: 0.3;">
  </div>
  <!-- Darken mask (shown on hover) -->
  <div class="ci-smart-crop__overlay-mask" style="display: none;">
    <!-- SVG or clip-path based darkening -->
  </div>
</div>
```

**Position calculation:**
```typescript
function updateOverlayRect(el: HTMLElement, crop: CropRect, imageW: number, imageH: number) {
  el.style.left   = `${(crop.x / imageW) * 100}%`;
  el.style.top    = `${(crop.y / imageH) * 100}%`;
  el.style.width  = `${(crop.width / imageW) * 100}%`;
  el.style.height = `${(crop.height / imageH) * 100}%`;
}
```

**Hover highlighting:**
- PreviewGrid emits `onPreviewHover(presetName | null)` callback
- CropOverlay responds by setting `.ci-smart-crop__overlay-rect--active` class
- CSS handles the opacity/border transitions

---

## 6. Main Class — CISmartCrop

### 6.1 Lifecycle

```
new CISmartCrop(selector, config)
│
├── 1. Resolve container (querySelector or HTMLElement)
├── 2. Merge config with defaults → ResolvedConfig
├── 3. Validate & resolve presets
├── 4. Create root DOM structure
├── 5. Load image (async)
│     ├── Success:
│     │   ├── 6. Create FocalPointPicker
│     │   ├── 7. Create CropOverlay
│     │   ├── 8. Create PreviewGrid with CropPreviews
│     │   ├── 9. Calculate initial crops
│     │   ├── 10. Render everything
│     │   ├── 11. Wire up event handlers
│     │   ├── 12. Set up ResizeObserver
│     │   └── 13. Emit 'ready' event + callback
│     └── Failure:
│         ├── Show error state
│         └── Emit 'error' event + callback
│
destroy()
├── Remove all event listeners
├── Disconnect ResizeObserver
├── Destroy all UI components
├── Revoke object URLs
└── Remove root element from DOM
```

### 6.2 Internal State

```typescript
class CISmartCrop {
  // Config
  private config: ResolvedConfig;
  private resolvedPresets: ResolvedPreset[];

  // Image data
  private imageSrc: string;
  private imageWidth: number = 0;
  private imageHeight: number = 0;
  private objectURL: string | null = null;  // if created from File/Blob

  // Current state
  private focalPoint: { x: number; y: number };
  private crops: Record<string, CropRect> = {};
  private layout: 'grid' | 'single';
  private theme: 'light' | 'dark';

  // UI components
  private rootEl: HTMLElement;
  private focalPointPicker: FocalPointPicker | null = null;
  private previewGrid: PreviewGrid | null = null;
  private cropOverlay: CropOverlay | null = null;

  // Observers
  private resizeObserver: ResizeObserver | null = null;
}
```

### 6.3 Update Flow

When the focal point changes:

```
User drags focal point
       │
       ▼
FocalPointPicker.onMove callback
       │
       ▼
CISmartCrop.handleFocalPointChange(x, y)
       │
       ├── Update this.focalPoint
       ├── calculateAllCrops() → this.crops
       ├── previewGrid.updateAll(crops)
       ├── cropOverlay.updateAll(crops)
       ├── Call config.onChange({ focalPoint, crops })
       └── emitEvent(rootEl, 'ci-smart-crop:change', { focalPoint, crops })
```

**Critical performance path:** This flow runs on every frame during drag (~60fps).
All operations must complete in < 16ms.

### 6.4 autoInit()

```typescript
static autoInit(): void {
  const elements = document.querySelectorAll('[data-ci-smart-crop]');
  elements.forEach(el => {
    if (el.__ciSmartCrop) return; // already initialized

    const config = parseDataAttributes(el);
    const instance = new CISmartCrop(el as HTMLElement, config);
    (el as any).__ciSmartCrop = instance;
  });
}

function parseDataAttributes(el: Element): CISmartCropConfig {
  const dataset = (el as HTMLElement).dataset;
  return {
    src: dataset.ciSmartCropSrc || '',
    focalPoint: dataset.ciSmartCropFocalPoint
      ? parseFocalPoint(dataset.ciSmartCropFocalPoint)
      : undefined,
    presets: dataset.ciSmartCropPresets
      ? JSON.parse(dataset.ciSmartCropPresets)
      : undefined,
    layout: (dataset.ciSmartCropLayout as 'grid' | 'single') || undefined,
    theme: (dataset.ciSmartCropTheme as 'light' | 'dark') || undefined,
    showOverlay: dataset.ciSmartCropShowOverlay !== 'false',
    showDimensions: dataset.ciSmartCropShowDimensions !== 'false',
  };
}
```

### 6.5 DOM Events

Emitted on the root container element via `CustomEvent`:

```typescript
// In each relevant method:
emitEvent(this.rootEl, 'ci-smart-crop:change', { focalPoint, crops });
emitEvent(this.rootEl, 'ci-smart-crop:ready', { instance: this });
emitEvent(this.rootEl, 'ci-smart-crop:error', { error });
emitEvent(this.rootEl, 'ci-smart-crop:preset-add', { preset });
emitEvent(this.rootEl, 'ci-smart-crop:preset-remove', { name });
emitEvent(this.rootEl, 'ci-smart-crop:layout-change', { layout });
emitEvent(this.rootEl, 'ci-smart-crop:theme-change', { theme });
```

---

## 7. CSS Architecture

### 7.1 BEM Naming Convention

All CSS classes follow BEM with `ci-smart-crop` as the block:

```
.ci-smart-crop                        — root container
.ci-smart-crop--light                 — light theme modifier
.ci-smart-crop--dark                  — dark theme modifier
.ci-smart-crop--compact               — compact layout (< 768px container)

.ci-smart-crop__image-area            — original image container
.ci-smart-crop__image                 — the <img> element
.ci-smart-crop__focal-marker          — focal point marker
.ci-smart-crop__focal-dot             — center dot
.ci-smart-crop__focal-ring            — outer ring
.ci-smart-crop__focal-crosshair-h     — horizontal crosshair line
.ci-smart-crop__focal-crosshair-v     — vertical crosshair line
.ci-smart-crop__dimensions-label      — "4000 × 3000 px" label

.ci-smart-crop__overlay               — overlay container
.ci-smart-crop__overlay-rect          — single overlay rectangle
.ci-smart-crop__overlay-rect--active  — highlighted rectangle

.ci-smart-crop__preview-grid          — preview grid container
.ci-smart-crop__preview-grid--grid    — grid layout mode
.ci-smart-crop__preview-grid--single  — single layout mode
.ci-smart-crop__preview-card          — single preview card
.ci-smart-crop__preview-card--active  — active in single mode
.ci-smart-crop__preview-image-wrapper — aspect-ratio wrapper
.ci-smart-crop__preview-image         — cropped image
.ci-smart-crop__preview-info          — label + dimensions bar
.ci-smart-crop__preview-label         — preset name
.ci-smart-crop__preview-dimensions    — pixel dimensions

.ci-smart-crop__tabs                  — tab bar (single mode)
.ci-smart-crop__tab                   — single tab
.ci-smart-crop__tab--active           — active tab

.ci-smart-crop__error                 — error state container
.ci-smart-crop__error-icon            — error icon
.ci-smart-crop__error-message         — error text
```

### 7.2 Theme Switching

Themes are implemented via CSS custom property overrides:

```css
.ci-smart-crop--light {
  --ci-smart-crop-bg: #ffffff;
  --ci-smart-crop-card-bg: #f5f5f5;
  --ci-smart-crop-focal-color: #2196F3;
  /* ... */
}

.ci-smart-crop--dark {
  --ci-smart-crop-bg: #1a1a1a;
  --ci-smart-crop-card-bg: #2d2d2d;
  --ci-smart-crop-focal-color: #64B5F6;
  /* ... */
}
```

Theme is switched by toggling the class on the root element:
```typescript
setTheme(theme: 'light' | 'dark') {
  this.rootEl.classList.remove('ci-smart-crop--light', 'ci-smart-crop--dark');
  this.rootEl.classList.add(`ci-smart-crop--${theme}`);
}
```

### 7.3 Responsive Strategy

Uses `ResizeObserver` + CSS class toggle (not CSS container queries — for wider browser support):

```typescript
this.resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    const width = entry.contentRect.width;
    this.rootEl.classList.toggle('ci-smart-crop--compact', width < 768);
  }
});
this.resizeObserver.observe(this.rootEl);
```

CSS then handles the layout switch:

```css
.ci-smart-crop {
  display: flex;
  gap: var(--ci-smart-crop-gap);
}

.ci-smart-crop__image-area { flex: 0 0 60%; }
.ci-smart-crop__preview-grid { flex: 1; }

/* Compact: stack vertically */
.ci-smart-crop--compact {
  flex-direction: column;
}
.ci-smart-crop--compact .ci-smart-crop__image-area { flex: none; }
```

---

## 8. React Wrapper — Detailed Implementation

### 8.1 CISmartCropViewer Component

```typescript
// react/index.tsx
import { forwardRef, useRef, useEffect, useImperativeHandle } from 'react';
import { CISmartCrop } from '../src/index';
import type { CISmartCropConfig, CropChangeEvent, CISmartCropError } from '../src/core/types';

export interface CISmartCropViewerProps extends Omit<CISmartCropConfig, 'onChange' | 'onReady' | 'onError'> {
  onChange?: (event: CropChangeEvent) => void;
  onReady?: (instance: CISmartCrop) => void;
  onError?: (error: CISmartCropError) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface CISmartCropViewerRef { /* ... all public methods */ }

export const CISmartCropViewer = forwardRef<CISmartCropViewerRef, CISmartCropViewerProps>(
  (props, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<CISmartCrop | null>(null);
    const callbacksRef = useRef({ onChange: props.onChange, onReady: props.onReady, onError: props.onError });

    // Keep callbacks ref up to date (avoid stale closures)
    callbacksRef.current = { onChange: props.onChange, onReady: props.onReady, onError: props.onError };

    // Initialize on mount
    useEffect(() => {
      if (!containerRef.current) return;

      instanceRef.current = new CISmartCrop(containerRef.current, {
        src: props.src,
        focalPoint: props.focalPoint,
        presets: props.presets,
        layout: props.layout,
        theme: props.theme,
        showOverlay: props.showOverlay,
        showDimensions: props.showDimensions,
        onChange: (e) => callbacksRef.current.onChange?.(e),
        onReady: (inst) => callbacksRef.current.onReady?.(inst as CISmartCrop),
        onError: (err) => callbacksRef.current.onError?.(err),
      });

      return () => {
        instanceRef.current?.destroy();
        instanceRef.current = null;
      };
    }, []); // Mount only

    // Sync props to instance
    useEffect(() => { instanceRef.current?.setSrc(props.src); }, [props.src]);
    useEffect(() => { if (props.layout) instanceRef.current?.setLayout(props.layout); }, [props.layout]);
    useEffect(() => { if (props.theme) instanceRef.current?.setTheme(props.theme); }, [props.theme]);
    useEffect(() => { if (props.focalPoint) instanceRef.current?.setFocalPoint(props.focalPoint); }, [props.focalPoint]);

    // Expose ref
    useImperativeHandle(ref, () => ({ /* delegate to instanceRef.current */ }));

    return <div ref={containerRef} className={props.className} style={props.style} />;
  }
);
```

### 8.2 useCISmartCrop Hook

```typescript
// react/hooks.ts
export function useCISmartCrop(config: CISmartCropConfig) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<CISmartCrop | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<CISmartCropError | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    instanceRef.current = new CISmartCrop(containerRef.current, {
      ...config,
      onReady: () => setIsReady(true),
      onError: (err) => setError(err),
    });

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
      setIsReady(false);
    };
  }, [config.src]);

  return { containerRef, instance: instanceRef.current, isReady, error };
}
```

### 8.3 Ref API with useImperativeHandle

The ref exposes the same methods as the vanilla JS API:

```typescript
useImperativeHandle(ref, () => ({
  setFocalPoint: (p) => instanceRef.current?.setFocalPoint(p),
  getFocalPoint: () => instanceRef.current?.getFocalPoint() ?? { x: 50, y: 50 },
  getCrops: () => instanceRef.current?.getCrops() ?? {},
  getCrop: (n) => instanceRef.current?.getCrop(n),
  addPreset: (p) => instanceRef.current?.addPreset(p),
  removePreset: (n) => instanceRef.current?.removePreset(n) ?? false,
  getPresets: () => instanceRef.current?.getPresets() ?? [],
  setLayout: (m) => instanceRef.current?.setLayout(m),
  setTheme: (t) => instanceRef.current?.setTheme(t),
  setSrc: (s) => instanceRef.current?.setSrc(s) ?? Promise.resolve(),
  exportJSON: () => instanceRef.current?.exportJSON() ?? '{}',
}), []);
```

---

## 9. Build Pipeline

### 9.1 Library Build (vite.config.ts)

```
Input:  src/index.ts + src/styles/index.css
Output: dist/index.mjs (ESM), dist/index.umd.js (UMD), dist/index.css, dist/index.d.ts

External: react, react-dom (peer deps)
Global name: CISmartCrop (for UMD/CDN usage)
Minification: terser
Source maps: yes
```

### 9.2 React Build (vite-react.config.ts)

```
Input:  react/index.tsx
Output: dist/react/index.mjs, dist/react/index.d.ts

External: react, react-dom, js-cloudimage-smart-crop-preview
Minification: terser
Source maps: yes
```

### 9.3 Demo Build (vite-demo.config.ts)

```
Root:   demo/
Input:  demo/index.html (references demo.ts)
Output: dist-demo/ (static site for GitHub Pages)
Aliases: 'js-cloudimage-smart-crop-preview' → src/index.ts
```

**Build commands:**
```bash
npm run build         # Build both lib and react
npm run build:lib     # Build only vanilla lib
npm run build:react   # Build only react wrapper
npm run build:demo    # Build demo site
npm run dev           # Dev server for demo
```

---

## 10. Testing Guide

### Running tests

```bash
npm test          # Run all tests once
npm run test:watch  # Watch mode
```

### Test file structure

```
tests/
├── crop-engine.test.ts    # Pure function tests — most important
├── presets.test.ts         # Ratio parsing, validation
└── image-utils.test.ts     # Image loading (may need jsdom)
```

### Writing tests

- Use `describe()` / `it()` / `expect()` from vitest
- Test edge cases extensively (see specs Section 14)
- Property tests: loop over many inputs, verify invariants
- Keep tests fast — no actual image loading in unit tests

### What NOT to test

- DOM rendering details (test via demo page manually)
- CSS styles (visual regression = manual)
- React wrapper (thin layer, test via demo)

---

## 11. Performance Optimization Details

### Critical Path: Focal Point Drag

The drag handler fires ~60 times/second. The update flow must complete in < 16ms:

```
Pointer event → calculate focal → calculate 8 crops → update 8 previews → update overlay
                 ~0.01ms            ~0.05ms              ~0.1ms              ~0.1ms
Total: < 1ms (well within budget)
```

**Why it's fast:**
1. `calculateCrop()` is pure arithmetic — no DOM, no memory allocation
2. Preview updates are CSS property changes only (`object-position`)
3. Overlay updates are CSS property changes only (`left`, `top`, `width`, `height`)
4. No canvas redrawing, no image decoding, no layout thrashing

### Optimization techniques used:

| Technique | Where | Why |
|-----------|-------|-----|
| `requestAnimationFrame` | Drag handler | Batch updates per frame |
| CSS `object-position` | Preview images | Browser-native crop, no JS needed |
| CSS `will-change` | Preview images, overlay rects | GPU-accelerated compositing |
| `pointer-events: none` | Overlay layer | Don't interfere with drag |
| `ResizeObserver` throttle | Container resize | Avoid excessive recalculations |
| Batch DOM reads/writes | All UI updates | Prevent layout thrashing |

### Memory

- No canvases = no bitmap memory
- Each preview reuses the same `<img>` element (browser caches the decoded image)
- Object URLs are properly revoked on cleanup

---

## 12. Common Patterns & Conventions

### Error handling pattern

```typescript
// For developer errors (wrong usage) → throw
if (!container) throw new Error('[CISmartCrop] Container not found.');

// For runtime errors (image load, bad data) → emit error, don't throw
try {
  await loadImage(src);
} catch (err) {
  const error = { code: 'IMAGE_LOAD_FAILED', message: err.message };
  this.config.onError?.(error);
  emitEvent(this.rootEl, 'ci-smart-crop:error', { error });
}

// For validation warnings → console.warn, skip
const validationError = validatePreset(preset);
if (validationError) {
  console.warn(`[CISmartCrop] ${validationError} Skipping.`);
  return;
}
```

### Event cleanup pattern

```typescript
class UIComponent {
  private cleanupFns: (() => void)[] = [];

  protected listen(el: EventTarget, event: string, handler: EventListener, options?: AddEventListenerOptions) {
    el.addEventListener(event, handler, options);
    this.cleanupFns.push(() => el.removeEventListener(event, handler, options));
  }

  destroy() {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
  }
}
```

### CSS class toggle pattern

```typescript
function toggleClass(el: HTMLElement, className: string, condition: boolean) {
  el.classList.toggle(className, condition);
}
```

### Percentage ↔ Pixel conversion

```typescript
// Percent → Pixel (for crop engine)
const px = (percent / 100) * imageSize;

// Pixel → Percent (for CSS positioning)
const percent = (px / imageSize) * 100;
```

---

## 13. Implementation Status

> Last updated: 2026-02-17

### Build Output

| Artifact | Size (gzip) |
|----------|------------|
| `dist/index.mjs` (ESM) | 7.23 KB |
| `dist/index.umd.js` (UMD) | 6.61 KB |
| `dist/js-cloudimage-smart-crop-preview.css` | 1.46 KB |
| `dist/react/index.mjs` | 7.96 KB |
| **Total (core + CSS)** | **8.69 KB** |

Target was < 16 KB — achieved at ~54% of budget.

### Tests

- **41 tests passing** (24 presets + 17 crop-engine)
- TypeScript strict mode — zero errors
- Build — zero warnings

### Phase Completion

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Project Setup | Done |
| 2 | Core Engine (types, presets, crop-engine) | Done |
| 3 | Utilities (dom, image) | Done |
| 4 | UI — Focal Point Picker | Done |
| 5 | UI — Preview Components | Done |
| 6 | UI — Overlay | Done |
| 7 | Main Class + Styles | Done |
| 8 | React Wrapper | Done |
| 9 | Demo Page | Done |
| 10 | Polish & Documentation | Done |

### Spec Coverage (vs specs.md)

| Requirement | Status | Notes |
|-------------|--------|-------|
| FR-1: Image Source (URL, data URI, blob URL) | Done | `loadImage()` handles all string sources; `fileToObjectURL()` utility provided |
| FR-2: Focal Point Picker | Done | Pointer events (mouse+touch), keyboard (Arrow/Shift+Arrow), click-to-set |
| FR-3: Crop Engine | Done | Pure function, 17 unit tests, property tests for bounds/ratio |
| FR-4: Crop Presets (8 built-in + custom) | Done | 24 unit tests, runtime add/remove |
| FR-5: Preview Grid (grid + single mode) | Done | CSS grid, tabs for single mode, correct preset labels |
| FR-6: Crop Overlay | Done | Colored rectangles, hover highlighting, area darkening via box-shadow |
| FR-7: Data Export (getCrops, exportJSON) | Done | JSON schema matches spec v1.0 |
| FR-8: Theming (light + dark) | Done | 43 CSS custom properties, runtime switching |
| FR-9: Responsive Design | Done | ResizeObserver, compact class at < 768px |
| FR-10: Accessibility | Done | ARIA roles/labels, keyboard nav, focus-visible, aria-live, prefers-reduced-motion |
| Vanilla JS API | Done | All instance methods + static autoInit() |
| HTML Data-Attributes API | Done | Full data-attribute parsing |
| React Component | Done | forwardRef + useImperativeHandle |
| React Hook | Done | useCISmartCrop with isReady/error state |
| Custom DOM Events (7 events) | Done | ready, change, error, preset-add/remove, layout-change, theme-change |
| Error Handling | Done | Error UI, onError callback, DOM event |
| CSS Custom Properties (43 vars) | Done | Full reference from spec Section 9 |
| update() partial config | Done | All config fields supported |

### Bugs Fixed During Audit

| Issue | Fix |
|-------|-----|
| `update()` didn't support `showDimensions` | Added `showDimensions` handling + `PreviewGrid.setShowDimensions()` |
| `PreviewGrid.setLayout()` lost preset labels | Changed to use `presetLabel` getter instead of `presetName` |
| `PreviewGrid.rebuildTabs()` lost preset labels | Same fix — uses `presetLabel` |
| Missing `aria-live="polite"` on dimensions | Added to FocalPointPicker dimensions label |
| No overlay darkening on hover | Added `box-shadow: 0 0 0 9999px` on hovered rect |
| JSX error in dts plugin for React build | Added `tsconfigPath` to vite-react dts config |

### What's Not Implemented (Deferred / Post-MVP)

These items are listed in specs.md Section 16 and are explicitly out of scope for v1.0:

- Cloudimage CDN URL generation
- AI auto focal point detection
- Batch mode (multiple images)
- Undo/Redo history
- Canvas export (cropped image as Blob)
- Built-in upload widget
- Animation presets
