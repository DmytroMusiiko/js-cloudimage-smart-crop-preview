# js-cloudimage-smart-crop-preview

Interactive focal-point-based image crop preview for multiple aspect ratios. Set a focal point and instantly see how your image crops to any format — landscape, portrait, square, banner, and more.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-green.svg)](#)
[![gzip size](https://img.shields.io/badge/gzip-~7_KB-brightgreen.svg)](#)

**[Live Demo](https://dmytromusiiko.github.io/js-cloudimage-smart-crop-preview/)**

---

## Features

- **Focal Point Picker** — click, drag, or use keyboard arrows to set the center of interest
- **Multi-Preset Preview** — see 16:9, 1:1, 9:16, 4:5, OG Image, and custom ratios simultaneously
- **Overlay Rectangles** — hover a preview card to see exactly where the crop falls on the original
- **Export & Download** — export crop coordinates as JSON or download cropped images as PNG, JPEG, or WebP
- **Light & Dark Themes** — toggle themes with 40+ CSS custom properties for full customization
- **Low Resolution Warning** — automatic badge when crop dimensions fall below 1080px
- **React Wrapper** — first-class `<CISmartCropViewer>` component with ref API and hooks
- **Accessible** — WCAG 2.1 AA compliant, full keyboard navigation, ARIA labels, `prefers-reduced-motion` support
- **Zero Dependencies** — no runtime dependencies, under 8 KB gzipped

---

## Installation

### npm

```bash
npm install js-cloudimage-smart-crop-preview
```

### CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/js-cloudimage-smart-crop-preview/dist/index.css">
<script src="https://cdn.jsdelivr.net/npm/js-cloudimage-smart-crop-preview/dist/index.umd.js"></script>
```

---

## Quick Start

### ES Module

```js
import { CISmartCrop } from 'js-cloudimage-smart-crop-preview';
import 'js-cloudimage-smart-crop-preview/css';

const cropper = new CISmartCrop('#my-viewer', {
  src: 'https://example.com/photo.jpg',
  presets: [
    { name: 'landscape', ratio: '16:9' },
    { name: 'square', ratio: '1:1' },
    { name: 'portrait', ratio: '9:16' },
  ],
  onChange: ({ focalPoint, crops }) => {
    console.log('Focal point:', focalPoint);
    console.log('Crops:', crops);
  },
});
```

### CDN / UMD

```html
<div id="my-viewer"></div>

<script>
  new CISmartCrop('#my-viewer', {
    src: 'photo.jpg',
    presets: [
      { name: 'card', ratio: '4:3', label: 'Product Card' },
      { name: 'thumb', ratio: '1:1', label: 'Thumbnail' },
    ],
  });
</script>
```

### Auto-Init from HTML

```html
<div data-ci-smart-crop
  data-ci-smart-crop-src="photo.jpg"
  data-ci-smart-crop-layout="grid"
  data-ci-smart-crop-theme="dark">
</div>

<script>CISmartCrop.autoInit();</script>
```

---

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `src` | `string` | *required* | Image source URL, data URI, or object URL |
| `focalPoint` | `{ x, y }` | `{ x: 50, y: 50 }` | Initial focal point (0–100 percentage) |
| `presets` | `CropPreset[]` | 8 built-in presets | Array of crop preset configurations |
| `layout` | `'grid' \| 'single'` | `'grid'` | Preview layout mode |
| `theme` | `'light' \| 'dark'` | `'light'` | Color theme |
| `showOverlay` | `boolean` | `true` | Show crop overlay rectangles on the image |
| `showDimensions` | `boolean` | `true` | Show pixel dimensions on preview cards |
| `onChange` | `(event) => void` | — | Called when focal point or crops change |
| `onReady` | `(instance) => void` | — | Called after image loads and UI initializes |
| `onError` | `(error) => void` | — | Called when image fails to load |

### Preset Format

```js
{
  name: 'banner',           // Unique identifier (required)
  ratio: '3:1',             // "16:9", "16/9", "1.91:1", 1.778, or "1.91" (required)
  label: 'Banner 3:1',      // Display name (defaults to name)
  color: '#F7DC6F',         // Overlay color (auto-assigned if omitted)
}
```

### Built-in Presets

When no `presets` option is provided, these 8 presets are used:

| Name | Ratio | Color |
|------|-------|-------|
| `landscape` | 16:9 | `#FF6B6B` |
| `ultrawide` | 21:9 | `#4ECDC4` |
| `standard` | 4:3 | `#45B7D1` |
| `square` | 1:1 | `#96CEB4` |
| `portrait` | 9:16 | `#FFEAA7` |
| `social-portrait` | 4:5 | `#DDA0DD` |
| `og-image` | 1.91:1 | `#98D8C8` |
| `banner` | 3:1 | `#F7DC6F` |

---

## API

### Instance Methods

```js
const cropper = new CISmartCrop('#viewer', { src: 'photo.jpg' });
```

#### Focal Point

```js
cropper.setFocalPoint({ x: 30, y: 70 });    // Set position (0–100)
cropper.getFocalPoint();                      // → { x: 30, y: 70 }
```

#### Crops

```js
cropper.getCrops();          // → { landscape: { x, y, width, height }, ... }
cropper.getCrop('square');   // → { x: 200, y: 100, width: 600, height: 600 }
```

#### Presets

```js
cropper.addPreset({ name: 'custom', ratio: '2:1', label: 'Custom' });
cropper.removePreset('custom');   // → true
cropper.getPresets();             // → [{ name, ratio, label, color }, ...]
```

#### Layout & Theme

```js
cropper.setLayout('single');    // Switch to single-preview mode with tabs
cropper.setTheme('dark');       // Toggle dark theme
```

#### Image Source

```js
await cropper.setSrc('https://example.com/another.jpg');
```

#### Export

```js
// JSON with all crop coordinates
const json = cropper.exportJSON();

// Download a specific crop as image blob
const blob = await cropper.exportCropBlob('square', 'webp', 0.85);
```

#### Update & Destroy

```js
// Update multiple options at once
cropper.update({
  showOverlay: false,
  showDimensions: false,
  layout: 'single',
  theme: 'dark',
});

cropper.destroy();   // Clean up DOM and observers
```

---

## Events

All events are dispatched on the container element and bubble up. Access data via `event.detail`.

```js
const el = document.getElementById('viewer');

el.addEventListener('ci-smart-crop:change', (e) => {
  console.log(e.detail.focalPoint, e.detail.crops);
});
```

| Event | Detail | Description |
|-------|--------|-------------|
| `ci-smart-crop:ready` | `{ instance }` | Image loaded, UI ready |
| `ci-smart-crop:change` | `{ focalPoint, crops }` | Focal point or crops changed |
| `ci-smart-crop:error` | `{ error }` | Image load failed |
| `ci-smart-crop:preset-add` | `{ preset }` | Preset added dynamically |
| `ci-smart-crop:preset-remove` | `{ name }` | Preset removed |
| `ci-smart-crop:layout-change` | `{ layout }` | Layout mode switched |
| `ci-smart-crop:theme-change` | `{ theme }` | Theme toggled |

---

## React

### Component

```tsx
import { CISmartCropViewer } from 'js-cloudimage-smart-crop-preview/react';
import 'js-cloudimage-smart-crop-preview/css';

function App() {
  const viewerRef = useRef(null);

  const handleSave = async () => {
    const crops = viewerRef.current.getCrops();
    const blob = await viewerRef.current.exportCropBlob('thumb', 'webp');
    await uploadCrops(crops, blob);
  };

  return (
    <CISmartCropViewer
      ref={viewerRef}
      src="https://example.com/photo.jpg"
      presets={[
        { name: 'card', ratio: '4:3' },
        { name: 'thumb', ratio: '1:1' },
      ]}
      theme="dark"
      onChange={({ crops }) => console.log(crops)}
    />
  );
}
```

### Props

All [configuration options](#configuration) are supported as props, plus:

| Prop | Type | Description |
|------|------|-------------|
| `className` | `string` | CSS class for the container div |
| `style` | `CSSProperties` | Inline styles for the container div |

### Ref API

The ref exposes the full [instance API](#instance-methods): `setFocalPoint`, `getFocalPoint`, `getCrops`, `getCrop`, `addPreset`, `removePreset`, `getPresets`, `setLayout`, `setTheme`, `setSrc`, `update`, `exportJSON`, `exportCropBlob`.

### Hook

```tsx
import { useCISmartCrop } from 'js-cloudimage-smart-crop-preview/react';

function MyComponent() {
  const { containerRef, instance, isReady, error } = useCISmartCrop({
    src: 'photo.jpg',
    presets: [{ name: 'square', ratio: '1:1' }],
  });

  return <div ref={containerRef} />;
}
```

---

## CSS Customization

Override any of the 40+ CSS custom properties on the container element:

```css
#my-viewer {
  --ci-smart-crop-image-width: 60%;
  --ci-smart-crop-grid-columns: 3;
  --ci-smart-crop-grid-gap: 12px;
  --ci-smart-crop-preview-max-height: 200px;
  --ci-smart-crop-card-border-radius: 12px;
  --ci-smart-crop-focal-color: #ff6b6b;
}
```

Or via inline styles:

```html
<div id="my-viewer" style="
  --ci-smart-crop-image-width: 50%;
  --ci-smart-crop-grid-columns: 2;
  --ci-smart-crop-image-max-height: 400px;
"></div>
```

### Key Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--ci-smart-crop-bg` | `#ffffff` | Container background |
| `--ci-smart-crop-image-width` | `45%` | Width of the main image area |
| `--ci-smart-crop-image-max-height` | `none` | Max height of the main image |
| `--ci-smart-crop-grid-columns` | `3` | Number of preview columns (masonry layout) |
| `--ci-smart-crop-grid-gap` | `10px` | Gap between preview cards |
| `--ci-smart-crop-preview-max-height` | `none` | Max height for preview images (caps tall ratios) |
| `--ci-smart-crop-focal-color` | `#2196F3` | Focal point marker color |
| `--ci-smart-crop-card-bg` | `#f5f5f5` | Preview card background |
| `--ci-smart-crop-card-border-radius` | `6px` | Card corner radius |
| `--ci-smart-crop-card-shadow` | `0 1px 3px ...` | Card shadow |
| `--ci-smart-crop-overlay-darken` | `rgba(0,0,0,0.4)` | Overlay darkening mask |
| `--ci-smart-crop-tab-bg-active` | `#2196F3` | Active tab background (single mode) |

Dark theme values are automatically applied with `theme: 'dark'`.

<details>
<summary>All CSS Variables</summary>

**Container:** `--ci-smart-crop-bg`, `--ci-smart-crop-border-radius`, `--ci-smart-crop-padding`, `--ci-smart-crop-gap`, `--ci-smart-crop-font-family`

**Image:** `--ci-smart-crop-image-border-radius`, `--ci-smart-crop-image-bg`, `--ci-smart-crop-image-width`, `--ci-smart-crop-image-max-height`

**Focal Point:** `--ci-smart-crop-focal-color`, `--ci-smart-crop-focal-dot-size`, `--ci-smart-crop-focal-ring-size`, `--ci-smart-crop-focal-ring-border`, `--ci-smart-crop-focal-ring-opacity`, `--ci-smart-crop-focal-crosshair-color`, `--ci-smart-crop-focal-crosshair-width`

**Overlay:** `--ci-smart-crop-overlay-darken`, `--ci-smart-crop-overlay-border-width`, `--ci-smart-crop-overlay-border-width-hover`, `--ci-smart-crop-overlay-opacity`, `--ci-smart-crop-overlay-opacity-hover`, `--ci-smart-crop-overlay-transition`

**Grid:** `--ci-smart-crop-grid-columns`, `--ci-smart-crop-grid-gap`, `--ci-smart-crop-preview-max-height`

**Cards:** `--ci-smart-crop-card-bg`, `--ci-smart-crop-card-border`, `--ci-smart-crop-card-border-radius`, `--ci-smart-crop-card-shadow`, `--ci-smart-crop-card-shadow-hover`, `--ci-smart-crop-card-transition`, `--ci-smart-crop-card-image-transition`

**Labels:** `--ci-smart-crop-label-color`, `--ci-smart-crop-label-font-size`, `--ci-smart-crop-label-font-weight`, `--ci-smart-crop-label-padding`, `--ci-smart-crop-dimensions-color`, `--ci-smart-crop-dimensions-font-size`

**Tabs:** `--ci-smart-crop-tab-bg`, `--ci-smart-crop-tab-bg-active`, `--ci-smart-crop-tab-color`, `--ci-smart-crop-tab-color-active`, `--ci-smart-crop-tab-border-radius`, `--ci-smart-crop-tab-padding`

**Error:** `--ci-smart-crop-error-bg`, `--ci-smart-crop-error-color`, `--ci-smart-crop-error-icon-size`

</details>

---

## Embedding in Projects

### E-Commerce / CMS

```js
const cropper = new CISmartCrop('#product-image', {
  src: product.imageUrl,
  presets: [
    { name: 'card', ratio: '4:3', label: 'Product Card' },
    { name: 'thumb', ratio: '1:1', label: 'Thumbnail' },
    { name: 'banner', ratio: '21:9', label: 'Banner' },
  ],
  onChange: ({ focalPoint, crops }) => {
    fetch(`/api/products/${product.id}/crops`, {
      method: 'POST',
      body: JSON.stringify({ focalPoint, crops }),
    });
  },
});

// Generate a thumbnail client-side
const blob = await cropper.exportCropBlob('thumb', 'webp', 0.85);
uploadToStorage(blob);
```

### Responsive Container

The component automatically switches to a stacked mobile layout when the container is narrower than 768px (using ResizeObserver, not media queries).

---

## Browser Support

All modern browsers: Chrome, Firefox, Safari, Edge (last 2 versions). Requires `ResizeObserver` and `aspect-ratio` CSS support.

---

## Development

```bash
git clone https://github.com/DmytroMusiiko/js-cloudimage-smart-crop-preview.git
cd js-cloudimage-smart-crop-preview
npm install

npm run dev          # Start dev server with demo
npm run build        # Build library (ESM + UMD + types)
npm run build:demo   # Build demo for deployment
npm test             # Run tests (41 tests)
npm run lint         # Lint with ESLint
npm run format       # Format with Prettier
```

---

## License

[MIT](LICENSE) — Made by the [Scaleflex](https://www.scaleflex.com) team.
