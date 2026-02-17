        # specs.md — js-cloudimage-smart-crop-preview

> **Status:** Draft v1.1
> **Type:** Open-source JavaScript library (npm package)
> **License:** MIT
> **Last Updated:** 2026-02-17

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Target Audience](#3-target-audience)
4. [Functional Requirements](#4-functional-requirements)
   - 4.1 [Image Source Handling (FR-1)](#41-image-source-handling-fr-1)
   - 4.2 [Focal Point Picker (FR-2)](#42-focal-point-picker-fr-2)
   - 4.3 [Crop Engine (FR-3)](#43-crop-engine-fr-3)
   - 4.4 [Crop Presets (FR-4)](#44-crop-presets-fr-4)
   - 4.5 [Preview Grid (FR-5)](#45-preview-grid-fr-5)
   - 4.6 [Crop Overlay (FR-6)](#46-crop-overlay-fr-6)
   - 4.7 [Data Export (FR-7)](#47-data-export-fr-7)
   - 4.8 [Theming (FR-8)](#48-theming-fr-8)
   - 4.9 [Responsive Design (FR-9)](#49-responsive-design-fr-9)
   - 4.10 [Accessibility (FR-10)](#410-accessibility-fr-10)
5. [API Specification](#5-api-specification)
   - 5.1 [Vanilla JS API](#51-vanilla-js-api)
   - 5.2 [HTML Data-Attributes API](#52-html-data-attributes-api)
   - 5.3 [React API](#53-react-api)
   - 5.4 [Custom DOM Events](#54-custom-dom-events)
6. [Configuration Defaults](#6-configuration-defaults)
7. [Error Handling](#7-error-handling)
8. [UI / UX Specification](#8-ui--ux-specification)
   - 8.1 [Desktop Layout (≥768px)](#81-desktop-layout-768px)
   - 8.2 [Mobile Layout (<768px)](#82-mobile-layout-768px)
   - 8.3 [Single Mode Layout](#83-single-mode-layout)
   - 8.4 [Focal Point Marker](#84-focal-point-marker)
   - 8.5 [Overlay Rectangles](#85-overlay-rectangles)
   - 8.6 [Preview Cards](#86-preview-cards)
   - 8.7 [Theme Specifications](#87-theme-specifications)
9. [CSS Custom Properties Reference](#9-css-custom-properties-reference)
10. [Technical Specifications](#10-technical-specifications)
    - 10.1 [Technology Stack](#101-technology-stack)
    - 10.2 [Browser Support](#102-browser-support)
    - 10.3 [Bundle Size Targets](#103-bundle-size-targets)
    - 10.4 [Package Exports](#104-package-exports)
    - 10.5 [CDN Usage](#105-cdn-usage)
11. [Project Structure](#11-project-structure)
12. [Crop Engine Algorithm (Detailed)](#12-crop-engine-algorithm-detailed)
13. [Implementation Phases](#13-implementation-phases)
14. [Testing Strategy](#14-testing-strategy)
15. [Performance Requirements](#15-performance-requirements)
16. [Deferred Features (Post-MVP)](#16-deferred-features-post-mvp)
17. [Acceptance Criteria](#17-acceptance-criteria)
18. [Glossary](#18-glossary)

---

## 1. Overview

**js-cloudimage-smart-crop-preview** is a lightweight, zero-dependency JavaScript library that provides an interactive focal-point-based image crop preview tool.

Users set a **focal point** on an image and instantly see how it will be cropped across multiple **aspect ratios** (Desktop, Mobile, Instagram, OG Image, etc.). All previews update in real-time as the focal point is dragged.

### Problem

Content managers, designers, and developers constantly need to prepare a single image for multiple platforms and formats. Currently, they must:

- Manually crop each version in a photo editor
- Guess how automated server-side crops will look
- Upload the image, check the result, re-adjust — repeat

There is **no lightweight, embeddable tool** to preview all crops at once from a single focal point.

### Solution

A drop-in widget (< 18 KB gzipped) that:

- Displays an image with a **draggable focal point** marker
- Shows a **real-time grid** of crop previews for configurable aspect ratios
- Exports **crop coordinates as JSON** for backend/CDN integration
- Embeds into any website, CMS admin panel, or web application
- Works with both **Vanilla JS and React**

---

## 2. Goals & Non-Goals

### Goals

- Provide an instant visual preview of how a single image crops to multiple aspect ratios
- Allow setting a focal point that drives all crop calculations
- Be embeddable in any web project (CMS admin panels, DAM systems, upload flows)
- Follow Scaleflex plugin conventions (Vite, TypeScript, zero-dep, CSS vars, React wrapper)
- Stay under 18 KB gzipped total
- Be fully accessible (WCAG 2.1 AA)

### Non-Goals

- **Not an image editor** — no freeform cropping, resizing, filters, or adjustments
- **Not a file uploader** — the plugin accepts image sources programmatically, but does not provide an upload UI (developers integrate it into their own upload flow)
- **Not a server-side tool** — all processing is client-side; no images are sent to any server
- **No AI/ML in MVP** — auto focal point detection is deferred to post-MVP
- **No Cloudimage integration in MVP** — CDN URL generation is deferred
- **No image transformation/output** — the plugin shows previews and exports crop coordinates (JSON), but does not generate cropped image files

---

## 3. Target Audience

| Audience             | Use Case                                                    | Integration Point                        |
| -------------------- | ----------------------------------------------------------- | ---------------------------------------- |
| **Content managers** | Preview how uploaded images look across website sections    | CMS admin panel                          |
| **E-commerce teams** | One product photo → card, catalog, banner, mobile views     | Product management dashboard             |
| **SMM / Marketing**  | One photo → Instagram Post, Story, Facebook Cover, OG Image | Marketing tools, social media schedulers |
| **Developers**       | Embed into custom applications with full API control        | Any web app, React app                   |
| **Designers**        | Quick check of responsive image behavior before handoff     | Design review tools                      |

---

## 4. Functional Requirements

### 4.1 Image Source Handling (FR-1)

The plugin must accept images from multiple sources to support integration into various user projects:

| Source Type         | How It Works                                        | Example                                   |
| ------------------- | --------------------------------------------------- | ----------------------------------------- |
| **URL string**      | Loaded via `<img>` element                          | `src: "https://example.com/photo.jpg"`    |
| **File object**     | Converted to Object URL via `URL.createObjectURL()` | From `<input type="file">` or drag & drop |
| **Blob**            | Converted to Object URL via `URL.createObjectURL()` | From canvas, fetch, or clipboard          |
| **Base64 data URI** | Used directly as `src`                              | `src: "data:image/jpeg;base64,..."`       |

**Behavior:**

- Display original image in a responsive container that fills available width
- Maintain the original image's aspect ratio (never stretch or distort)
- Show image natural dimensions label: "4000 × 3000 px"
- On image load, trigger initial crop calculations for all presets
- If image fails to load → show error state (see [Error Handling](#7-error-handling))

**Object URL Lifecycle:**

- When `src` is a `File` or `Blob`, the plugin creates an Object URL internally
- The Object URL is revoked on `destroy()` or when `setSrc()` is called with a new source
- This prevents memory leaks

### 4.2 Focal Point Picker (FR-2)

An interactive marker on the original image that the user can drag to set the focal point.

**Visual Design:**

- Center dot: filled circle, 8px diameter
- Outer ring: semi-transparent circle, 24px diameter, 2px border
- Crosshair lines: extend from the marker to all 4 edges of the image
- Crosshair lines: thin (1px), semi-transparent, same color as marker

**Interaction:**
| Input | Action |
|-------|--------|
| Click on image | Move focal point to click position |
| Mouse drag | Continuously update focal point position |
| Touch drag | Same as mouse drag, with touch events |
| Arrow keys (when focused) | Move focal point by 1% per press |
| Shift + Arrow keys | Move focal point by 5% per press |

**Coordinates:**

- Expressed as percentages: `{ x: 0–100, y: 0–100 }`
- `{ x: 0, y: 0 }` = top-left corner
- `{ x: 100, y: 100 }` = bottom-right corner
- `{ x: 50, y: 50 }` = center (default)

**Events:**

- Emit on every position change during drag (throttled to `requestAnimationFrame`)
- Emit on click-to-position
- Emit on keyboard move

### 4.3 Crop Engine (FR-3)

Pure function that computes crop rectangles. See [Section 12](#12-crop-engine-algorithm-detailed) for the full algorithm with formulas.

**Input:** `(imageWidth, imageHeight, focalX, focalY, targetRatio) → CropRect`

**Supported ratio formats:**
| Format | Example | Parsed Value |
|--------|---------|-------------|
| `"W:H"` string | `"16:9"` | `16 / 9 = 1.778` |
| `"W/H"` string | `"16/9"` | `16 / 9 = 1.778` |
| Decimal number | `1.778` | `1.778` |
| Decimal string | `"1.91"` | `1.91` |

**Output:** `{ x, y, width, height }` — all values in pixels, integers (rounded).

**Guarantees:**

- The crop rectangle always fits within the image bounds
- The crop rectangle always has the exact target aspect ratio
- The crop is as large as possible (maximum area for the given ratio)
- The crop is centered on the focal point whenever possible
- When the focal point is near an edge, the crop shifts to stay within bounds

### 4.4 Crop Presets (FR-4)

**8 built-in presets:**

| Name              | Ratio  | Decimal | Label               | Common Use                      |
| ----------------- | ------ | ------- | ------------------- | ------------------------------- |
| `landscape`       | 16:9   | 1.778   | Landscape 16:9      | Desktop hero, YouTube thumbnail |
| `ultrawide`       | 21:9   | 2.333   | Ultrawide 21:9      | Cinematic banner                |
| `standard`        | 4:3    | 1.333   | Standard 4:3        | Tablet, classic photo           |
| `square`          | 1:1    | 1.000   | Square 1:1          | Instagram post, avatar          |
| `portrait`        | 9:16   | 0.5625  | Portrait 9:16       | Instagram/TikTok Story          |
| `social-portrait` | 4:5    | 0.800   | Social Portrait 4:5 | Instagram portrait post         |
| `og-image`        | 1.91:1 | 1.910   | OG Image 1.91:1     | Open Graph / Twitter Card       |
| `banner`          | 3:1    | 3.000   | Banner 3:1          | Website banner, email header    |

**Default color palette for overlay rectangles:**

| Preset            | Default Color      |
| ----------------- | ------------------ |
| `landscape`       | `#FF6B6B` (red)    |
| `ultrawide`       | `#4ECDC4` (teal)   |
| `standard`        | `#45B7D1` (blue)   |
| `square`          | `#96CEB4` (green)  |
| `portrait`        | `#FFEAA7` (yellow) |
| `social-portrait` | `#DDA0DD` (plum)   |
| `og-image`        | `#98D8C8` (mint)   |
| `banner`          | `#F7DC6F` (gold)   |

**Custom presets:**

```javascript
{
  name: 'linkedin-cover',       // unique identifier
  ratio: '4:1',                 // aspect ratio
  label: 'LinkedIn Cover',      // display name (optional, defaults to name)
  color: '#0077B5'              // overlay color (optional, auto-assigned)
}
```

**Preset management at runtime:**

- `addPreset(preset)` — adds and renders new preview
- `removePreset(name)` — removes preview and overlay
- Duplicate names are rejected (console warning)
- Minimum 1 preset required (cannot remove the last one)

### 4.5 Preview Grid (FR-5)

Displays crop previews for all active presets.

**Each preview card shows:**

1. Cropped image region (using CSS `object-fit: cover` + `object-position`)
2. Preset label (e.g., "Landscape 16:9")
3. Crop dimensions in pixels (e.g., "1920 × 1080") — optional via `showDimensions`

**Two layout modes:**

| Mode             | Behavior                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| `grid` (default) | All previews visible in a responsive CSS grid. Columns auto-adjust based on container width.            |
| `single`         | One large preview displayed at a time. Tab bar above to switch between presets. Active tab highlighted. |

**Grid mode responsive breakpoints (based on container width):**
| Container Width | Columns |
|----------------|---------|
| ≥ 600px | 3 |
| 400–599px | 2 |
| < 400px | 1 |

**Real-time updates:**

- All previews update on every frame during focal point drag
- CSS transitions smooth the `object-position` change (configurable duration)

### 4.6 Crop Overlay (FR-6)

Optional colored rectangles drawn on top of the original image, showing where each preset's crop area falls.

**Behavior:**

- Each preset has a colored rectangle outline (2px border)
- Area outside the crop is darkened with semi-transparent overlay
- When `showOverlay: true` (default), the **active/hovered** preset's overlay is shown
- Hovering over a preview card → corresponding overlay rectangle becomes visible
- When no preview is hovered → show all rectangles simultaneously with reduced opacity
- Smooth transition when focal point moves (CSS transition on position/size)

**Interaction:**

- Overlay does not block focal point dragging (pointer-events: none on overlay layer, except focal point marker)

### 4.7 Data Export (FR-7)

**`getCrops()` return format:**

```typescript
Record<string, CropRect>
// Example:
{
  landscape: { x: 0, y: 375, width: 4000, height: 2250 },
  square: { x: 500, y: 0, width: 3000, height: 3000 },
  portrait: { x: 1156, y: 0, width: 1688, height: 3000 }
}
```

**`exportJSON()` return format:**

```json
{
  "version": "1.0",
  "focalPoint": { "x": 45.2, "y": 32.8 },
  "image": {
    "src": "https://example.com/photo.jpg",
    "width": 4000,
    "height": 3000
  },
  "crops": {
    "landscape": {
      "x": 0,
      "y": 375,
      "width": 4000,
      "height": 2250,
      "preset": { "name": "landscape", "ratio": "16:9", "label": "Landscape 16:9" }
    }
  }
}
```

The exported JSON includes:

- `version` — schema version for future compatibility
- `image.src` — original image source for reference
- Full preset metadata in each crop entry

### 4.8 Theming (FR-8)

- Two built-in themes: `light` (default) and `dark`
- Theme applied via CSS class on root element: `.ci-smart-crop--light` / `.ci-smart-crop--dark`
- All visual properties configurable via 30+ CSS custom properties (see [Section 9](#9-css-custom-properties-reference))
- Theme can be changed at runtime via `setTheme()`
- Custom themes possible by overriding CSS custom properties on the container

### 4.9 Responsive Design (FR-9)

**Container-based responsive behavior** (not viewport-based):

- Uses `ResizeObserver` on the root container
- Layout adapts based on container width, not window width
- This allows the plugin to work correctly in sidebars, modals, split views

**Breakpoints:**
| Container Width | Layout |
|----------------|--------|
| ≥ 768px | Side-by-side: original (60%) + preview grid (40%) |
| < 768px | Stacked: original on top, previews below |

**Touch optimizations:**

- Larger focal point hit area on touch devices (44px minimum per WCAG)
- No hover-dependent features on touch (overlay shows all rectangles)
- Smooth drag with `touch-action: none` on the image container

### 4.10 Accessibility (FR-10)

**WCAG 2.1 AA compliance:**

| Requirement         | Implementation                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Keyboard navigation | Tab to focal point → Arrow keys to move (1%), Shift+Arrow (5%)                               |
| Focus indicator     | Visible focus ring on focal point marker and preview tabs                                    |
| ARIA roles          | `role="application"` on image area, `role="slider"` on focal point                           |
| ARIA labels         | `aria-label="Focal point picker"`, `aria-valuetext="Position: 45% horizontal, 33% vertical"` |
| Live regions        | `aria-live="polite"` for crop dimension updates                                              |
| Reduced motion      | Disable CSS transitions when `prefers-reduced-motion: reduce`                                |
| Color contrast      | All text meets 4.5:1 ratio in both themes                                                    |
| Screen readers      | Announce focal point position on change                                                      |

---

## 5. API Specification

### 5.1 Vanilla JS API

#### Constructor

```javascript
const cropper = new CISmartCrop(selector, config);
```

| Parameter  | Type                    | Required | Description                                   |
| ---------- | ----------------------- | -------- | --------------------------------------------- |
| `selector` | `string \| HTMLElement` | Yes      | CSS selector or DOM element for the container |
| `config`   | `CISmartCropConfig`     | Yes      | Configuration object                          |

#### Configuration Object

```typescript
interface CISmartCropConfig {
  /** Image source — URL, data URI, or object URL from File/Blob */
  src: string;

  /** Initial focal point position (0–100 for each axis) */
  focalPoint?: { x: number; y: number };

  /** Array of crop presets to display */
  presets?: CropPreset[];

  /** Layout mode for previews */
  layout?: 'grid' | 'single';

  /** Color theme */
  theme?: 'light' | 'dark';

  /** Show crop overlay rectangles on the original image */
  showOverlay?: boolean;

  /** Show image dimension labels on previews */
  showDimensions?: boolean;

  /** Callback when focal point or crops change */
  onChange?: (event: CropChangeEvent) => void;

  /** Callback when the plugin is fully initialized and image loaded */
  onReady?: (instance: CISmartCrop) => void;

  /** Callback when an error occurs */
  onError?: (error: CISmartCropError) => void;
}
```

#### TypeScript Interfaces

```typescript
interface CropPreset {
  name: string;
  ratio: string | number;
  label?: string;
  color?: string;
}

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropChangeEvent {
  focalPoint: { x: number; y: number };
  crops: Record<string, CropRect>;
}

interface CISmartCropError {
  code: 'IMAGE_LOAD_FAILED' | 'INVALID_RATIO' | 'INVALID_PRESET' | 'CONTAINER_NOT_FOUND';
  message: string;
  details?: unknown;
}
```

#### Instance Methods

| Method                    | Returns                    | Description                                          |
| ------------------------- | -------------------------- | ---------------------------------------------------- |
| `setFocalPoint({ x, y })` | `void`                     | Set focal point (0–100). Triggers `onChange`.        |
| `getFocalPoint()`         | `{ x, y }`                 | Get current focal point position                     |
| `getCrops()`              | `Record<string, CropRect>` | Get all crop rectangles (pixels)                     |
| `getCrop(name)`           | `CropRect \| undefined`    | Get crop for a specific preset                       |
| `addPreset(preset)`       | `void`                     | Add a custom preset. Renders new preview.            |
| `removePreset(name)`      | `boolean`                  | Remove a preset. Returns false if last preset.       |
| `getPresets()`            | `CropPreset[]`             | Get all active presets                               |
| `setLayout(mode)`         | `void`                     | Switch between 'grid' and 'single'                   |
| `setTheme(theme)`         | `void`                     | Switch between 'light' and 'dark'                    |
| `setSrc(src)`             | `Promise<void>`            | Change image. Returns promise that resolves on load. |
| `exportJSON()`            | `string`                   | Export all data as formatted JSON string             |
| `update(config)`          | `void`                     | Partial config update                                |
| `destroy()`               | `void`                     | Remove DOM, event listeners, revoke object URLs      |

#### Static Methods

| Method                   | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `CISmartCrop.autoInit()` | Find and initialize all `[data-ci-smart-crop]` elements |

### 5.2 HTML Data-Attributes API

```html
<div
  data-ci-smart-crop
  data-ci-smart-crop-src="https://example.com/photo.jpg"
  data-ci-smart-crop-focal-point="50,50"
  data-ci-smart-crop-presets='[
    {"name":"landscape","ratio":"16:9","label":"Desktop Hero"},
    {"name":"square","ratio":"1:1","label":"Instagram Post"},
    {"name":"portrait","ratio":"9:16","label":"Story"}
  ]'
  data-ci-smart-crop-layout="grid"
  data-ci-smart-crop-theme="light"
  data-ci-smart-crop-show-overlay="true"
  data-ci-smart-crop-show-dimensions="true"
></div>

<script>
  // Auto-init all elements with [data-ci-smart-crop]
  CISmartCrop.autoInit();

  // Access instance after init:
  const el = document.querySelector('[data-ci-smart-crop]');
  const instance = el.__ciSmartCrop; // reference stored on element
</script>
```

### 5.3 React API

#### CISmartCropViewer Component

```tsx
import { CISmartCropViewer } from 'js-cloudimage-smart-crop-preview/react';

function App() {
  const handleChange = (event: CropChangeEvent) => {
    console.log('Focal point:', event.focalPoint);
    console.log('Crops:', event.crops);
  };

  return (
    <CISmartCropViewer
      src="https://example.com/photo.jpg"
      focalPoint={{ x: 50, y: 50 }}
      presets={[
        { name: 'landscape', ratio: '16:9', label: 'Desktop Hero' },
        { name: 'square', ratio: '1:1', label: 'Instagram Post' },
        { name: 'portrait', ratio: '9:16', label: 'Story' },
      ]}
      layout="grid"
      theme="light"
      showOverlay
      showDimensions
      onChange={handleChange}
      onReady={(instance) => console.log('Ready!', instance)}
      onError={(err) => console.error(err)}
      className="my-crop-viewer"
      style={{ maxWidth: 1200 }}
    />
  );
}
```

#### useCISmartCrop Hook

```tsx
import { useCISmartCrop } from 'js-cloudimage-smart-crop-preview/react';

function CustomViewer() {
  const { containerRef, instance, isReady, error } = useCISmartCrop({
    src: 'photo.jpg',
    presets: [{ name: 'square', ratio: '1:1' }],
  });

  return (
    <div>
      <div ref={containerRef} />
      {isReady && <p>Crops: {JSON.stringify(instance?.getCrops())}</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

#### Ref API (imperative control)

```tsx
import { useRef } from 'react';
import { CISmartCropViewer, CISmartCropViewerRef } from 'js-cloudimage-smart-crop-preview/react';

function App() {
  const ref = useRef<CISmartCropViewerRef>(null);

  const handleExport = () => {
    const json = ref.current?.exportJSON();
    navigator.clipboard.writeText(json);
  };

  const handleReset = () => {
    ref.current?.setFocalPoint({ x: 50, y: 50 });
  };

  return (
    <>
      <CISmartCropViewer ref={ref} src="photo.jpg" />
      <button onClick={handleExport}>Copy JSON</button>
      <button onClick={handleReset}>Reset Focal Point</button>
    </>
  );
}
```

**CISmartCropViewerRef exposed methods:**

- `setFocalPoint()`, `getFocalPoint()`
- `getCrops()`, `getCrop(name)`
- `addPreset()`, `removePreset()`, `getPresets()`
- `setLayout()`, `setTheme()`, `setSrc()`
- `exportJSON()`

#### Next.js / SSR

```tsx
import dynamic from 'next/dynamic';

const CISmartCropViewer = dynamic(
  () => import('js-cloudimage-smart-crop-preview/react').then((m) => m.CISmartCropViewer),
  { ssr: false },
);
```

### 5.4 Custom DOM Events

In addition to callback props, the plugin emits native `CustomEvent`s on the root container element. This allows integration without JavaScript API access (e.g., in web components, jQuery, or declarative frameworks).

| Event Name                    | `event.detail`                   | When                             |
| ----------------------------- | -------------------------------- | -------------------------------- |
| `ci-smart-crop:ready`         | `{ instance: CISmartCrop }`      | Plugin initialized, image loaded |
| `ci-smart-crop:change`        | `{ focalPoint, crops }`          | Focal point moved                |
| `ci-smart-crop:error`         | `{ error: CISmartCropError }`    | Error occurred                   |
| `ci-smart-crop:preset-add`    | `{ preset: CropPreset }`         | Preset added                     |
| `ci-smart-crop:preset-remove` | `{ name: string }`               | Preset removed                   |
| `ci-smart-crop:layout-change` | `{ layout: 'grid' \| 'single' }` | Layout mode changed              |
| `ci-smart-crop:theme-change`  | `{ theme: 'light' \| 'dark' }`   | Theme changed                    |

**Usage:**

```javascript
const el = document.querySelector('#my-crop');
el.addEventListener('ci-smart-crop:change', (e) => {
  console.log('New focal point:', e.detail.focalPoint);
  console.log('Crop rects:', e.detail.crops);
});
```

---

## 6. Configuration Defaults

All default values in one place:

```typescript
const DEFAULTS: Required<Omit<CISmartCropConfig, 'src' | 'onChange' | 'onReady' | 'onError'>> = {
  focalPoint: { x: 50, y: 50 },
  presets: BUILT_IN_PRESETS, // all 8 presets
  layout: 'grid',
  theme: 'light',
  showOverlay: true,
  showDimensions: true,
};
```

| Property         | Default            | Valid Values                 |
| ---------------- | ------------------ | ---------------------------- |
| `focalPoint`     | `{ x: 50, y: 50 }` | `{ x: 0–100, y: 0–100 }`     |
| `presets`        | All 8 built-in     | Array of `CropPreset`, min 1 |
| `layout`         | `'grid'`           | `'grid'` \| `'single'`       |
| `theme`          | `'light'`          | `'light'` \| `'dark'`        |
| `showOverlay`    | `true`             | `boolean`                    |
| `showDimensions` | `true`             | `boolean`                    |

---

## 7. Error Handling

The plugin handles errors gracefully without throwing exceptions. All errors are reported via the `onError` callback and `ci-smart-crop:error` DOM event.

| Error Code            | When                                                             | Behavior                                                             |
| --------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| `IMAGE_LOAD_FAILED`   | Image URL returns 404, CORS error, or network failure            | Show placeholder with error icon and message. Retry button optional. |
| `INVALID_RATIO`       | Ratio string cannot be parsed (e.g., `"abc"`, `"0:0"`, negative) | Skip the preset, console warning. Other presets still work.          |
| `INVALID_PRESET`      | Preset missing `name` or `ratio`                                 | Skip the preset, console warning.                                    |
| `CONTAINER_NOT_FOUND` | Selector doesn't match any element                               | Throw (this is a developer error, should fail fast).                 |

**Error UI state for IMAGE_LOAD_FAILED:**

```
┌─────────────────────────────┐
│                             │
│      ⚠ Image failed         │
│        to load              │
│                             │
│   Check URL or try another  │
│                             │
└─────────────────────────────┘
```

**Console warnings** (development guidance, not user-facing):

- `[CISmartCrop] Preset "xyz" has invalid ratio "abc". Skipping.`
- `[CISmartCrop] Preset name "square" already exists. Ignoring duplicate.`
- `[CISmartCrop] Cannot remove last preset. At least 1 preset is required.`

---

## 8. UI / UX Specification

### 8.1 Desktop Layout (≥768px)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌──────────────────────────────────┐  ┌──────────────────────┐  │
│  │ ╔════════════════════════════╗   │  │ ┌──────────────────┐ │  │
│  │ ║                            ║   │  │ │                  │ │  │
│  │ ║   ┌───┐                    ║   │  │ │   16:9 crop      │ │  │
│  │ ║   │ ⊕ │← focal point      ║   │  │ │   preview        │ │  │
│  │ ║   └───┘                    ║   │  │ │                  │ │  │
│  │ ║           crop overlay ══▶ ║   │  │ └──────────────────┘ │  │
│  │ ║                            ║   │  │ Landscape 16:9       │  │
│  │ ╚════════════════════════════╝   │  │ 4000 × 2250 px       │  │
│  │                                  │  ├──────────────────────┤  │
│  │  4000 × 3000 px                  │  │ ┌────────────┐      │  │
│  └──────────────────────────────────┘  │ │            │      │  │
│         ◄──── 60% ────►               │ │  1:1 crop  │      │  │
│                                        │ │            │      │  │
│                                        │ └────────────┘      │  │
│                                        │ Square 1:1           │  │
│                                        │ 3000 × 3000 px       │  │
│                                        ├──────────────────────┤  │
│                                        │ ┌──────┐            │  │
│                                        │ │      │            │  │
│                                        │ │ 9:16 │            │  │
│                                        │ │ crop │            │  │
│                                        │ │      │            │  │
│                                        │ └──────┘            │  │
│                                        │ Portrait 9:16        │  │
│                                        │ 1688 × 3000 px       │  │
│                                        └──────────────────────┘  │
│                                         ◄── 40% ──►             │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2 Mobile Layout (<768px)

```
┌────────────────────────────────┐
│                                │
│  ┌──────────────────────────┐  │
│  │                          │  │
│  │     Original Image       │  │
│  │        with ⊕            │  │
│  │     & Overlay            │  │
│  │                          │  │
│  └──────────────────────────┘  │
│  4000 × 3000 px                │
│                                │
│  ┌────────┐ ┌────────┐        │
│  │ 16:9   │ │ 1:1    │        │
│  │ crop   │ │ crop   │        │
│  └────────┘ └────────┘        │
│  Landscape   Square            │
│                                │
│  ┌────────┐ ┌────────┐        │
│  │ 9:16   │ │ 4:5    │        │
│  │ crop   │ │ crop   │        │
│  └────────┘ └────────┘        │
│  Portrait    Social            │
│                                │
└────────────────────────────────┘
```

### 8.3 Single Mode Layout

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌──────────────────────────────────┐                            │
│  │     Original Image with ⊕       │                            │
│  └──────────────────────────────────┘                            │
│                                                                  │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐            │
│  │ 16:9 ◄──┤  1:1    │  9:16   │  4:5    │  3:1    │  ← tabs   │
│  │ active  │         │         │         │         │            │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │              Large Preview of Active Preset              │    │
│  │                       16:9                               │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│  Landscape 16:9 — 4000 × 2250 px                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 8.4 Focal Point Marker

```
         ╷ (crosshair line to top edge)
         │
         │
  ───────●─────── (crosshair line left ↔ right)
         │
         │
         ╵ (crosshair line to bottom edge)

  Detail of center:
      ┌─────┐
      │ ╭─╮ │ ← outer ring (24px, 2px border, semi-transparent)
      │ │●│ │ ← center dot (8px, filled)
      │ ╰─╯ │
      └─────┘
```

- Cursor: `crosshair` on image, `grab` on marker, `grabbing` while dragging
- Hit area: minimum 44px × 44px (WCAG touch target)

### 8.5 Overlay Rectangles

**Default state** (no hover):

- All crop rectangles shown with reduced opacity (0.3)
- Thin border (2px) in each preset's color

**Hovered state** (preview card hovered):

- Hovered preset's rectangle: full opacity, thicker border (3px)
- Other rectangles: hidden or very faint (0.1)
- Area outside hovered crop: darkened (`rgba(0,0,0,0.4)`)

**Transition:** 150ms ease for all overlay changes.

### 8.6 Preview Cards

```
┌──────────────────────────┐
│                          │
│    Cropped Image Area    │
│    (object-fit: cover)   │
│                          │
├──────────────────────────┤
│ Landscape 16:9           │  ← label
│ 4000 × 2250 px           │  ← dimensions (optional)
└──────────────────────────┘
```

- Border-radius: 6px (configurable)
- Shadow on hover: elevation effect
- Smooth `object-position` transition on focal point change
- Click on card (in single mode): make this preset active

### 8.7 Theme Specifications

#### Light Theme

| Element           | Value                |
| ----------------- | -------------------- |
| Background        | `#ffffff`            |
| Card background   | `#f5f5f5`            |
| Border            | `#e0e0e0`            |
| Text primary      | `#333333`            |
| Text secondary    | `#999999`            |
| Focal point color | `#2196F3`            |
| Overlay darken    | `rgba(0, 0, 0, 0.3)` |

#### Dark Theme

| Element           | Value                |
| ----------------- | -------------------- |
| Background        | `#1a1a1a`            |
| Card background   | `#2d2d2d`            |
| Border            | `#404040`            |
| Text primary      | `#e0e0e0`            |
| Text secondary    | `#888888`            |
| Focal point color | `#64B5F6`            |
| Overlay darken    | `rgba(0, 0, 0, 0.5)` |

---

## 9. CSS Custom Properties Reference

```css
.ci-smart-crop {
  /* === Container === */
  --ci-smart-crop-bg: #ffffff;
  --ci-smart-crop-border-radius: 8px;
  --ci-smart-crop-padding: 16px;
  --ci-smart-crop-gap: 16px; /* gap between original and preview grid */
  --ci-smart-crop-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  /* === Original Image Area === */
  --ci-smart-crop-image-border-radius: 6px;
  --ci-smart-crop-image-bg: #f0f0f0; /* shown while image loads */

  /* === Focal Point === */
  --ci-smart-crop-focal-color: #2196f3;
  --ci-smart-crop-focal-dot-size: 8px;
  --ci-smart-crop-focal-ring-size: 24px;
  --ci-smart-crop-focal-ring-border: 2px;
  --ci-smart-crop-focal-ring-opacity: 0.5;
  --ci-smart-crop-focal-crosshair-color: rgba(33, 150, 243, 0.4);
  --ci-smart-crop-focal-crosshair-width: 1px;

  /* === Overlay === */
  --ci-smart-crop-overlay-darken: rgba(0, 0, 0, 0.4);
  --ci-smart-crop-overlay-border-width: 2px;
  --ci-smart-crop-overlay-border-width-hover: 3px;
  --ci-smart-crop-overlay-opacity: 0.3;
  --ci-smart-crop-overlay-opacity-hover: 1;
  --ci-smart-crop-overlay-transition: 150ms ease;

  /* === Preview Grid === */
  --ci-smart-crop-grid-min-col-width: 200px;
  --ci-smart-crop-grid-gap: 12px;

  /* === Preview Card === */
  --ci-smart-crop-card-bg: #f5f5f5;
  --ci-smart-crop-card-border: 1px solid #e0e0e0;
  --ci-smart-crop-card-border-radius: 6px;
  --ci-smart-crop-card-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --ci-smart-crop-card-shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.15);
  --ci-smart-crop-card-transition: 200ms ease;
  --ci-smart-crop-card-image-transition: 100ms ease; /* object-position transition */

  /* === Labels === */
  --ci-smart-crop-label-color: #333333;
  --ci-smart-crop-label-font-size: 13px;
  --ci-smart-crop-label-font-weight: 600;
  --ci-smart-crop-label-padding: 8px 12px;

  /* === Dimensions === */
  --ci-smart-crop-dimensions-color: #999999;
  --ci-smart-crop-dimensions-font-size: 11px;

  /* === Tabs (single mode) === */
  --ci-smart-crop-tab-bg: transparent;
  --ci-smart-crop-tab-bg-active: #2196f3;
  --ci-smart-crop-tab-color: #666666;
  --ci-smart-crop-tab-color-active: #ffffff;
  --ci-smart-crop-tab-border-radius: 20px;
  --ci-smart-crop-tab-padding: 6px 14px;

  /* === Error State === */
  --ci-smart-crop-error-bg: #fff5f5;
  --ci-smart-crop-error-color: #e53e3e;
  --ci-smart-crop-error-icon-size: 48px;
}
```

---

## 10. Technical Specifications

### 10.1 Technology Stack

| Component         | Technology                       |
| ----------------- | -------------------------------- |
| Language          | TypeScript 5.x (strict mode)     |
| Build tool        | Vite 6.x (library mode)          |
| Testing           | Vitest                           |
| Linting           | ESLint 9.x (flat config)         |
| Formatting        | Prettier                         |
| CSS               | Plain CSS with custom properties |
| React wrapper     | React 18+ (peer dependency)      |
| Module formats    | ESM (`.mjs`) + UMD (`.js`)       |
| Declaration files | `.d.ts` auto-generated           |

### 10.2 Browser Support

| Browser        | Min Version | Key API Dependency            |
| -------------- | ----------- | ----------------------------- |
| Chrome         | 80+         | ResizeObserver                |
| Firefox        | 78+         | ResizeObserver                |
| Safari         | 14+         | ResizeObserver, PointerEvents |
| Edge           | 80+         | Chromium-based                |
| iOS Safari     | 14+         | PointerEvents                 |
| Chrome Android | 80+         | ResizeObserver                |

**Required Web APIs:** `ResizeObserver`, `PointerEvents`, `CSS Custom Properties`, `URL.createObjectURL`.

### 10.3 Bundle Size Targets

| Build             | Target (gzipped) |
| ----------------- | ---------------- |
| Core JS (vanilla) | < 10 KB          |
| React wrapper     | < 3 KB           |
| CSS               | < 3 KB           |
| **Total**         | **< 16 KB**      |

### 10.4 Package Exports

```json
{
  "name": "js-cloudimage-smart-crop-preview",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.umd.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.umd.js",
      "types": "./dist/index.d.ts"
    },
    "./react": {
      "import": "./dist/react/index.mjs",
      "types": "./dist/react/index.d.ts"
    },
    "./css": "./dist/index.css"
  },
  "files": ["dist"],
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "react-dom": { "optional": true }
  }
}
```

### 10.5 CDN Usage

```html
<!-- Styles -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/js-cloudimage-smart-crop-preview/dist/index.css"
/>

<!-- UMD Script -->
<script src="https://cdn.jsdelivr.net/npm/js-cloudimage-smart-crop-preview/dist/index.umd.js"></script>

<!-- Initialize -->
<script>
  // Auto-init all elements
  CISmartCrop.autoInit();

  // Or programmatic
  const cropper = new CISmartCrop('#container', {
    src: 'photo.jpg',
  });
</script>
```

---

## 11. Project Structure

```
js-cloudimage-smart-crop-preview/
│
├── src/                              # Library source code
│   ├── index.ts                      # CISmartCrop class, autoInit, public exports
│   │
│   ├── core/                         # Pure logic (no DOM)
│   │   ├── types.ts                  # All TypeScript interfaces & types
│   │   ├── crop-engine.ts            # calculateCrop() — pure function
│   │   └── presets.ts                # BUILT_IN_PRESETS array, parseRatio()
│   │
│   ├── ui/                           # DOM components
│   │   ├── focal-point.ts            # FocalPointPicker class — render + drag
│   │   ├── preview.ts                # CropPreview class — single card
│   │   ├── preview-grid.ts           # PreviewGrid class — grid/single layout
│   │   └── overlay.ts                # CropOverlay class — rectangles on original
│   │
│   ├── utils/                        # Shared utilities
│   │   ├── dom.ts                    # createElement, addClass, etc.
│   │   └── image.ts                  # loadImage(), fileToObjectURL()
│   │
│   └── styles/
│       └── index.css                 # All styles — themes, custom properties
│
├── react/                            # React wrapper (separate entry point)
│   ├── index.tsx                     # CISmartCropViewer component + exports
│   └── hooks.ts                      # useCISmartCrop hook
│
├── demo/                             # Demo page (not included in npm package)
│   ├── index.html                    # Demo HTML
│   ├── demo.ts                       # Demo interactivity
│   └── demo.css                      # Demo-only styles
│
├── tests/                            # Unit tests
│   ├── crop-engine.test.ts           # Crop calculation tests
│   ├── presets.test.ts               # Preset parsing / validation tests
│   └── image-utils.test.ts           # Image utility tests
│
├── package.json                      # Package manifest
├── tsconfig.json                     # Base TypeScript config
├── tsconfig.build.json               # Build-specific TS config
├── tsconfig.react.json               # React TS config (jsx: react-jsx)
├── vite.config.ts                    # Library build config
├── vite-react.config.ts              # React wrapper build config
├── vite-demo.config.ts               # Demo dev server config
├── eslint.config.mjs                 # ESLint flat config
├── .prettierrc                       # Prettier config
├── .gitignore
├── specs.md                          # ← This file
└── README.md                         # Usage documentation
```

---

## 12. Crop Engine Algorithm (Detailed)

The crop engine is a **pure function** with no side effects or DOM dependency.

### Function Signature

```typescript
function calculateCrop(
  imageWidth: number,
  imageHeight: number,
  focalX: number, // 0–100
  focalY: number, // 0–100
  targetRatio: number, // width / height (e.g., 16/9 = 1.778)
): CropRect;
```

### Algorithm Steps

#### Step 1: Calculate maximum crop size

```
imageRatio = imageWidth / imageHeight

if (targetRatio > imageRatio):
    // Target is wider than image → constrain by width
    cropWidth  = imageWidth
    cropHeight = imageWidth / targetRatio
else:
    // Target is taller or equal → constrain by height
    cropHeight = imageHeight
    cropWidth  = imageHeight * targetRatio
```

#### Step 2: Calculate focal point in pixels

```
focalPxX = (focalX / 100) * imageWidth
focalPxY = (focalY / 100) * imageHeight
```

#### Step 3: Center crop on focal point

```
cropX = focalPxX - (cropWidth / 2)
cropY = focalPxY - (cropHeight / 2)
```

#### Step 4: Clamp to image boundaries

```
cropX = clamp(cropX, 0, imageWidth - cropWidth)
cropY = clamp(cropY, 0, imageHeight - cropHeight)
```

#### Step 5: Round to integers

```
cropX      = Math.round(cropX)
cropY      = Math.round(cropY)
cropWidth  = Math.round(cropWidth)
cropHeight = Math.round(cropHeight)
```

### Edge Cases

| Case                           | Expected Behavior                         |
| ------------------------------ | ----------------------------------------- |
| Focal point at (0, 0)          | Crop anchored to top-left                 |
| Focal point at (100, 100)      | Crop anchored to bottom-right             |
| Focal point at (50, 50)        | Crop perfectly centered                   |
| Target ratio = image ratio     | Crop = entire image                       |
| Target ratio >> image ratio    | Crop is full-width, thin horizontal strip |
| Target ratio << image ratio    | Crop is full-height, thin vertical strip  |
| Very small image (e.g., 10×10) | Still works, crop size may equal image    |
| Ratio of 1:1 on a panorama     | Square crop from center of panorama       |

### Example Calculation

```
Image: 4000 × 3000
Focal: { x: 30, y: 40 }
Target: 16:9 (1.778)

Step 1:
  imageRatio = 4000/3000 = 1.333
  targetRatio (1.778) > imageRatio (1.333)
  → cropWidth = 4000, cropHeight = 4000/1.778 = 2249

Step 2:
  focalPxX = 0.30 × 4000 = 1200
  focalPxY = 0.40 × 3000 = 1200

Step 3:
  cropX = 1200 - 2000 = -800
  cropY = 1200 - 1124.5 = 75.5

Step 4:
  cropX = clamp(-800, 0, 4000-4000) = 0  (clamped!)
  cropY = clamp(75.5, 0, 3000-2249) = 76

Result: { x: 0, y: 76, width: 4000, height: 2249 }
```

### Ratio Parsing

```typescript
function parseRatio(input: string | number): number {
  if (typeof input === 'number') return input;

  // "16:9" or "16/9"
  const parts = input.split(/[:\/]/);
  if (parts.length === 2) {
    const w = parseFloat(parts[0]);
    const h = parseFloat(parts[1]);
    if (w > 0 && h > 0) return w / h;
  }

  // "1.91" (decimal string)
  const decimal = parseFloat(input);
  if (!isNaN(decimal) && decimal > 0) return decimal;

  throw new Error(`Invalid ratio: "${input}"`);
}
```

---

## 13. Implementation Phases

### Phase 1: Project Setup (~0.5 day)

- Create project directory
- `npm init` → `package.json` with all fields
- TypeScript configs: `tsconfig.json`, `tsconfig.build.json`, `tsconfig.react.json`
- Vite configs: `vite.config.ts`, `vite-react.config.ts`, `vite-demo.config.ts`
- ESLint + Prettier configs
- `.gitignore`
- Install dev dependencies: `typescript`, `vite`, `vitest`, `eslint`, `prettier`, `react`, `react-dom`, `@types/react`

### Phase 2: Core Engine (~1 day)

- `src/core/types.ts` — all interfaces
- `src/core/presets.ts` — 8 built-in presets, `parseRatio()`, preset validation
- `src/core/crop-engine.ts` — `calculateCrop()` function
- `tests/crop-engine.test.ts` — comprehensive tests (15+ test cases)
- `tests/presets.test.ts` — ratio parsing, validation

### Phase 3: Utilities (~0.5 day)

- `src/utils/dom.ts` — `createElement()`, `addClass()`, `setStyles()`, etc.
- `src/utils/image.ts` — `loadImage()`, `fileToObjectURL()`, `revokeObjectURL()`
- `tests/image-utils.test.ts` — tests

### Phase 4: UI — Focal Point Picker (~1 day)

- `src/ui/focal-point.ts`
- Render marker (dot + ring + crosshair lines)
- Mouse drag: `pointerdown` → `pointermove` → `pointerup`
- Touch support via PointerEvents
- Keyboard: arrow keys when focused
- Click-to-set on image
- Emit position updates

### Phase 5: UI — Preview Components (~1.5 days)

- `src/ui/preview.ts` — single preview card (image + label + dimensions)
- `src/ui/preview-grid.ts` — grid layout + single/tab layout
- CSS `object-fit: cover` + dynamic `object-position` for crop preview
- Hover interaction → emit hover events for overlay

### Phase 6: UI — Overlay (~1 day)

- `src/ui/overlay.ts`
- Render colored rectangles for each preset
- Darken area outside active crop
- Hover highlighting (respond to preview hover events)
- Smooth transitions

### Phase 7: Main Class + Styles (~1.5 days)

- `src/index.ts` — `CISmartCrop` class wiring everything together
- `autoInit()` + data-attributes parsing
- All public methods
- Custom DOM events
- `src/styles/index.css` — full CSS with custom properties, both themes
- Integration testing: all pieces working together

### Phase 8: React Wrapper (~1 day)

- `react/index.tsx` — `CISmartCropViewer` component
- `react/hooks.ts` — `useCISmartCrop` hook
- `forwardRef` + `useImperativeHandle` for ref API
- Cleanup on unmount (`destroy()`)

### Phase 9: Demo Page (~1 day)

- `demo/index.html` + `demo.ts` + `demo.css`
- Image URL input
- Preset management (add/remove/toggle)
- Layout toggle (grid/single)
- Theme toggle (light/dark)
- JSON export (copy to clipboard)
- Live code example generator

### Phase 10: Polish & Documentation (~0.5 day)

- README.md with quick start, API reference, examples
- Final bundle size check
- Cross-browser testing notes
- `specs.md` (this file) included in repo

**Total estimate: ~9.5 days**

---

## 14. Testing Strategy

### Unit Tests (Vitest)

**crop-engine.test.ts** (~15 tests):

- Correct crop for each of the 8 built-in ratios
- Focal point at center (50, 50)
- Focal point at corners (0,0), (100,0), (0,100), (100,100)
- Focal point at edges (50,0), (0,50), (100,50), (50,100)
- Target ratio equals image ratio → full image
- Very wide target ratio (e.g., 10:1) on a square image
- Very tall target ratio (e.g., 1:10) on a square image
- Crop never exceeds image bounds (property test)
- Crop always matches target aspect ratio (property test)

**presets.test.ts** (~8 tests):

- Parse "16:9" → 1.778
- Parse "1:1" → 1.0
- Parse "1.91:1" → 1.91
- Parse "16/9" → 1.778
- Parse numeric 1.5 → 1.5
- Reject "abc" → error
- Reject "0:0" → error
- Reject negative → error

**image-utils.test.ts** (~4 tests):

- `loadImage()` resolves on valid URL
- `loadImage()` rejects on invalid URL
- `fileToObjectURL()` creates valid URL
- Object URL revocation

### Manual Testing Checklist

- [ ] Drag focal point to all 4 corners → no empty space in previews
- [ ] Drag focal point smoothly → 60fps, no jank
- [ ] Resize browser window → layout adapts (desktop ↔ mobile)
- [ ] Switch theme light ↔ dark → all elements update
- [ ] Switch layout grid ↔ single → smooth transition
- [ ] Hover preview card → correct overlay rectangle highlighted
- [ ] Add custom preset → new preview appears
- [ ] Remove preset → preview disappears
- [ ] Keyboard: Tab → focal point, Arrow → moves, Shift+Arrow → moves 5%
- [ ] Touch device: drag focal point works smoothly
- [ ] Load invalid image URL → error state shown
- [ ] `exportJSON()` → valid JSON with correct crop data
- [ ] CDN usage (UMD) → works without bundler

---

## 15. Performance Requirements

| Metric                                   | Target             |
| ---------------------------------------- | ------------------ |
| Focal point drag FPS                     | ≥ 60fps            |
| Time to first preview (after image load) | < 50ms             |
| Preview update latency                   | < 16ms (one frame) |
| Memory (8 presets, 4000×3000 image)      | < 20MB             |
| DOM nodes (8 presets, grid mode)         | < 100              |
| Initial parse + setup (no image)         | < 10ms             |

**Optimization techniques:**

- `requestAnimationFrame` for drag updates (no unnecessary recalculations)
- CSS `object-position` for previews (no canvas redraw)
- `will-change: object-position` on preview images
- Throttle `ResizeObserver` callbacks
- No layout thrashing: batch DOM reads before DOM writes

---

## 16. Deferred Features (Post-MVP)

These are explicitly **not in scope** for v1.0 but planned for future releases:

| Feature                    | Priority | Description                                                  |
| -------------------------- | -------- | ------------------------------------------------------------ |
| Cloudimage CDN integration | High     | Generate Cloudimage transformation URLs with crop params     |
| Auto focal point (AI)      | Medium   | Use face/object detection to suggest optimal focal point     |
| Batch mode                 | Medium   | Apply same presets to multiple images                        |
| Undo / Redo                | Low      | History stack for focal point changes                        |
| Image comparison           | Low      | Side-by-side comparison of crops from different focal points |
| Built-in upload widget     | Low      | Drag & drop upload zone (MVP: programmatic only)             |
| Canvas export              | Medium   | Export cropped images as Blob/data URI                       |
| Animation presets          | Low      | Animate between focal point positions                        |

---

## 17. Acceptance Criteria

### Must Pass (MVP Release Blockers)

- [ ] Initializes from JavaScript API (`new CISmartCrop(...)`)
- [ ] Initializes from HTML data-attributes (`CISmartCrop.autoInit()`)
- [ ] `src` accepts URL, File, Blob, and base64 data URI
- [ ] Focal point is draggable with mouse (pointer events)
- [ ] Focal point is draggable with touch
- [ ] Focal point is movable with keyboard (Arrow keys, Shift+Arrow)
- [ ] All 8 built-in presets render correct crop previews
- [ ] Custom presets can be added and removed at runtime
- [ ] Overlay rectangles update in real-time during drag
- [ ] Overlay highlights on preview card hover
- [ ] Grid layout mode works (responsive columns)
- [ ] Single layout mode works (tabs + large preview)
- [ ] Light and dark themes apply correctly
- [ ] CSS custom properties override default styles
- [ ] React `CISmartCropViewer` component works
- [ ] React `useCISmartCrop` hook works
- [ ] React ref API exposes all methods
- [ ] `exportJSON()` returns correct, parseable JSON
- [ ] `getCrops()` returns accurate pixel coordinates
- [ ] `destroy()` cleans up all DOM elements and listeners
- [ ] Custom DOM events fire correctly
- [ ] Keyboard accessibility (Tab, Arrow, Shift+Arrow)
- [ ] ARIA labels present on interactive elements
- [ ] `prefers-reduced-motion` disables animations
- [ ] Error state shown for failed image loads
- [ ] Console warnings for invalid presets/ratios
- [ ] Bundle size < 16 KB gzipped total
- [ ] TypeScript strict mode — zero errors
- [ ] All unit tests pass
- [ ] Demo page is functional
- [ ] Works in Chrome 80+, Firefox 78+, Safari 14+, Edge 80+

---

## 18. Glossary

| Term               | Definition                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Focal Point**    | A point on the image (expressed as x%, y%) that defines the center of interest. Crops are centered on this point.                 |
| **Crop Rectangle** | A rectangular region `{ x, y, width, height }` in pixels that defines what part of the image is visible for a given aspect ratio. |
| **Aspect Ratio**   | The proportional relationship between width and height (e.g., 16:9 means 16 units wide for every 9 units tall).                   |
| **Preset**         | A named aspect ratio configuration (e.g., "Landscape 16:9") with optional display label and overlay color.                        |
| **Overlay**        | Semi-transparent layer on the original image showing crop rectangle boundaries.                                                   |
| **Preview**        | A visual representation of how the image looks when cropped to a specific aspect ratio.                                           |
| **Object URL**     | A browser-generated URL (`blob:...`) pointing to a local File or Blob object, created via `URL.createObjectURL()`.                |
| **CDN**            | Content Delivery Network. Cloudimage is a CDN that can apply transformations (crop, resize) to images via URL parameters.         |
| **UMD**            | Universal Module Definition — a module format that works in browsers (via `<script>` tag), Node.js, and AMD loaders.              |
| **ESM**            | ECMAScript Module — the standard JavaScript module format using `import`/`export`.                                                |
