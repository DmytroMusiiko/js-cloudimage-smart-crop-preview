import { CISmartCrop } from '../src/index';
import { fileToObjectURL, revokeObjectURL } from '../src/utils/image';
import '../src/styles/index.css';

let cropper: CISmartCrop | null = null;
let currentObjectURL: string | null = null;

function init() {
  const imageUrl = currentObjectURL || (document.getElementById('image-url') as HTMLInputElement).value;

  // Destroy previous instance
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }

  // Create new instance
  cropper = new CISmartCrop('#crop-viewer', {
    src: imageUrl,
    presets: [
      { name: 'landscape', ratio: '16:9', label: 'Landscape 16:9' },
      { name: 'square', ratio: '1:1', label: 'Square 1:1' },
      { name: 'portrait', ratio: '9:16', label: 'Portrait 9:16' },
      { name: 'social', ratio: '4:5', label: 'Social 4:5' },
      { name: 'og-image', ratio: '1.91:1', label: 'OG Image 1.91:1' },
      { name: 'banner', ratio: '3:1', label: 'Banner 3:1' },
    ],
    layout: (document.getElementById('layout-select') as HTMLSelectElement).value as 'grid' | 'single',
    theme: (document.getElementById('theme-select') as HTMLSelectElement).value as 'light' | 'dark',
    showOverlay: (document.getElementById('overlay-toggle') as HTMLInputElement).checked,
    showDimensions: (document.getElementById('dimensions-toggle') as HTMLInputElement).checked,
    onChange: (event) => {
      console.log('Change:', event.focalPoint, Object.keys(event.crops).length, 'crops');
    },
    onReady: () => {
      console.log('Smart Crop Preview ready!');
      buildPresetBar();
      addDownloadButtons();
    },
    onError: (err) => {
      console.error('Error:', err);
    },
  });
}

// === Preset Filter Bar (unified for grid + single) ===

const activePresets = new Set(['landscape', 'square', 'portrait', 'social', 'og-image', 'banner']);
let singleActivePreset = 'landscape';

function getCurrentLayout(): 'grid' | 'single' {
  return (document.getElementById('layout-select') as HTMLSelectElement).value as 'grid' | 'single';
}

function buildPresetBar() {
  const bar = document.getElementById('preset-bar')!;
  bar.innerHTML = '';

  if (!cropper) return;
  const presets = cropper.getPresets();
  const layout = getCurrentLayout();

  for (const preset of presets) {
    const pill = document.createElement('button');
    pill.dataset.preset = preset.name;
    pill.textContent = preset.label || preset.name;

    if (layout === 'grid') {
      pill.className = 'demo-preset-pill' + (activePresets.has(preset.name) ? ' demo-preset-pill--active' : '');
    } else {
      pill.className = 'demo-preset-pill' + (singleActivePreset === preset.name ? ' demo-preset-pill--active' : '');
    }

    pill.addEventListener('click', () => {
      if (layout === 'grid') {
        // Grid: toggle on/off
        if (activePresets.has(preset.name)) {
          if (activePresets.size <= 1) return;
          activePresets.delete(preset.name);
          pill.classList.remove('demo-preset-pill--active');
        } else {
          activePresets.add(preset.name);
          pill.classList.add('demo-preset-pill--active');
        }
      } else {
        // Single: select one
        singleActivePreset = preset.name;
        bar.querySelectorAll('.demo-preset-pill').forEach((p) => p.classList.remove('demo-preset-pill--active'));
        pill.classList.add('demo-preset-pill--active');
      }
      applyPresetFilter();
    });

    bar.appendChild(pill);
  }
}

function applyPresetFilter() {
  const layout = getCurrentLayout();
  const cards = document.querySelectorAll<HTMLElement>('#crop-viewer [data-preset]');
  cards.forEach((card) => {
    const name = card.dataset.preset || '';
    if (layout === 'grid') {
      card.style.display = activePresets.has(name) ? '' : 'none';
    } else {
      card.style.display = name === singleActivePreset ? '' : 'none';
    }
  });
}

// === Download Buttons on Preview Cards ===

function addDownloadButtons() {
  const cards = document.querySelectorAll<HTMLElement>('#crop-viewer [data-preset]');
  cards.forEach((card) => {
    const wrapper = card.querySelector('.ci-smart-crop__preview-image-wrapper');
    if (!wrapper || wrapper.querySelector('.demo-card-download')) return;

    const btn = document.createElement('button');
    btn.className = 'demo-card-download';
    btn.title = 'Download crop';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const presetName = card.dataset.preset!;
      if (!cropper) return;
      try {
        const blob = await cropper.exportCropBlob(presetName, getExportFormat(), getExportQuality());
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${presetName}.${getExportFormat()}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Download failed:', err);
      }
    });

    wrapper.appendChild(btn);
  });
}

// Load button — clear object URL so we use the typed URL
document.getElementById('load-btn')?.addEventListener('click', () => {
  if (currentObjectURL) {
    revokeObjectURL(currentObjectURL);
    currentObjectURL = null;
  }
  init();
});

// Layout select
document.getElementById('layout-select')?.addEventListener('change', (e) => {
  const layout = (e.target as HTMLSelectElement).value as 'grid' | 'single';
  cropper?.setLayout(layout);
  buildPresetBar();
  applyPresetFilter();
});

// Theme select
document.getElementById('theme-select')?.addEventListener('change', (e) => {
  cropper?.setTheme((e.target as HTMLSelectElement).value as 'light' | 'dark');
});

// Overlay toggle
document.getElementById('overlay-toggle')?.addEventListener('change', (e) => {
  cropper?.update({ showOverlay: (e.target as HTMLInputElement).checked });
});

// Dimensions toggle
document.getElementById('dimensions-toggle')?.addEventListener('change', (e) => {
  cropper?.update({ showDimensions: (e.target as HTMLInputElement).checked });
});

// Export JSON
document.getElementById('export-btn')?.addEventListener('click', () => {
  if (!cropper) return;
  const json = cropper.exportJSON();
  const output = document.getElementById('json-output')!;
  const codeEl = output.querySelector('code')!;
  codeEl.textContent = json;
  output.style.display = 'block';

  // Show copy button
  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) copyBtn.style.display = '';
});

// Copy JSON
document.getElementById('copy-btn')?.addEventListener('click', () => {
  const content = document.getElementById('json-output')?.textContent;
  if (content) {
    navigator.clipboard.writeText(content).then(() => {
      const btn = document.getElementById('copy-btn')!;
      const original = btn.innerHTML;
      btn.textContent = 'Copied!';
      setTimeout(() => (btn.innerHTML = original), 2000);
    });
  }
});

// Reset focal point
document.getElementById('reset-btn')?.addEventListener('click', () => {
  cropper?.setFocalPoint({ x: 50, y: 50 });
});

// Enter key on URL input
document.getElementById('image-url')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (currentObjectURL) {
      revokeObjectURL(currentObjectURL);
      currentObjectURL = null;
    }
    init();
  }
});

// === Image Upload ===

function loadFile(file: File) {
  if (!file.type.startsWith('image/')) return;

  // Cleanup previous object URL
  if (currentObjectURL) {
    revokeObjectURL(currentObjectURL);
  }

  currentObjectURL = fileToObjectURL(file);
  const urlInput = document.getElementById('image-url') as HTMLInputElement;
  urlInput.value = file.name;

  if (cropper) {
    cropper.setSrc(currentObjectURL);
  } else {
    init();
  }
}

// Upload button → file picker
document.getElementById('upload-btn')?.addEventListener('click', () => {
  document.getElementById('file-input')?.click();
});

document.getElementById('file-input')?.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) loadFile(file);
});

// Drag & Drop
const dropOverlay = document.getElementById('drop-overlay')!;
let dragCounter = 0;

document.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  if (e.dataTransfer?.types.includes('Files')) {
    dropOverlay.classList.add('demo-drop-overlay--visible');
  }
});

document.addEventListener('dragleave', () => {
  dragCounter--;
  if (dragCounter === 0) {
    dropOverlay.classList.remove('demo-drop-overlay--visible');
  }
});

document.addEventListener('dragover', (e) => {
  e.preventDefault();
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.remove('demo-drop-overlay--visible');
  const file = e.dataTransfer?.files[0];
  if (file) loadFile(file);
});

// Clipboard paste
document.addEventListener('paste', (e) => {
  const file = e.clipboardData?.files[0];
  if (file && file.type.startsWith('image/')) {
    e.preventDefault();
    loadFile(file);
  }
});

// === Download Controls ===

function getExportFormat(): 'png' | 'jpeg' | 'webp' {
  return (document.getElementById('format-select') as HTMLSelectElement).value as 'png' | 'jpeg' | 'webp';
}

function getExportQuality(): number {
  return parseInt((document.getElementById('quality-slider') as HTMLInputElement).value, 10) / 100;
}

// Quality slider display
document.getElementById('quality-slider')?.addEventListener('input', (e) => {
  const val = (e.target as HTMLInputElement).value;
  document.getElementById('quality-value')!.textContent = `${val}%`;
});

// Toggle quality slider visibility (only for JPEG/WebP)
document.getElementById('format-select')?.addEventListener('change', (e) => {
  const format = (e.target as HTMLSelectElement).value;
  const qualityGroup = document.getElementById('quality-group')!;
  qualityGroup.style.opacity = format === 'png' ? '0.4' : '1';
});

// Per-preview download — double-click on preview cards
document.getElementById('crop-viewer')?.addEventListener('dblclick', async (e) => {
  const card = (e.target as HTMLElement).closest('[data-preset]') as HTMLElement | null;
  if (!card || !cropper) return;

  const presetName = card.dataset.preset!;
  try {
    const blob = await cropper.exportCropBlob(presetName, getExportFormat(), getExportQuality());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${presetName}.${getExportFormat()}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download failed:', err);
  }
});

// === ZIP Download ===

function crc32(buf: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createZip(files: { name: string; data: Uint8Array }[]): Blob {
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);

    // Local file header (30 + name + data)
    const local = new ArrayBuffer(30 + nameBytes.length);
    const lv = new DataView(local);
    lv.setUint32(0, 0x04034b50, true);  // signature
    lv.setUint16(4, 20, true);          // version needed
    lv.setUint16(6, 0, true);           // flags
    lv.setUint16(8, 0, true);           // compression (store)
    lv.setUint16(10, 0, true);          // mod time
    lv.setUint16(12, 0, true);          // mod date
    lv.setUint32(14, crc, true);        // crc32
    lv.setUint32(18, file.data.length, true); // compressed size
    lv.setUint32(22, file.data.length, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true); // name length
    lv.setUint16(28, 0, true);          // extra length
    new Uint8Array(local).set(nameBytes, 30);

    parts.push(new Uint8Array(local));
    parts.push(file.data);

    // Central directory entry
    const central = new ArrayBuffer(46 + nameBytes.length);
    const cv = new DataView(central);
    cv.setUint32(0, 0x02014b50, true);  // signature
    cv.setUint16(4, 20, true);          // version made by
    cv.setUint16(6, 20, true);          // version needed
    cv.setUint16(8, 0, true);           // flags
    cv.setUint16(10, 0, true);          // compression
    cv.setUint16(12, 0, true);          // mod time
    cv.setUint16(14, 0, true);          // mod date
    cv.setUint32(16, crc, true);        // crc32
    cv.setUint32(20, file.data.length, true); // compressed
    cv.setUint32(24, file.data.length, true); // uncompressed
    cv.setUint16(28, nameBytes.length, true); // name length
    cv.setUint16(30, 0, true);          // extra length
    cv.setUint16(32, 0, true);          // comment length
    cv.setUint16(34, 0, true);          // disk start
    cv.setUint16(36, 0, true);          // internal attrs
    cv.setUint32(38, 0, true);          // external attrs
    cv.setUint32(42, offset, true);     // local header offset
    new Uint8Array(central).set(nameBytes, 46);

    centralDir.push(new Uint8Array(central));
    offset += 30 + nameBytes.length + file.data.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const cd of centralDir) {
    parts.push(cd);
    centralDirSize += cd.length;
  }

  // End of central directory
  const eocd = new ArrayBuffer(22);
  const ev = new DataView(eocd);
  ev.setUint32(0, 0x06054b50, true);          // signature
  ev.setUint16(4, 0, true);                   // disk number
  ev.setUint16(6, 0, true);                   // disk with CD
  ev.setUint16(8, files.length, true);         // entries on disk
  ev.setUint16(10, files.length, true);        // total entries
  ev.setUint32(12, centralDirSize, true);      // CD size
  ev.setUint32(16, centralDirOffset, true);    // CD offset
  ev.setUint16(20, 0, true);                  // comment length
  parts.push(new Uint8Array(eocd));

  return new Blob(parts, { type: 'application/zip' });
}

document.getElementById('download-all-btn')?.addEventListener('click', async () => {
  if (!cropper) return;

  const btn = document.getElementById('download-all-btn')!;
  btn.textContent = 'Generating...';
  btn.setAttribute('disabled', '');

  try {
    const presets = cropper.getPresets();
    const format = getExportFormat();
    const quality = getExportQuality();
    const files: { name: string; data: Uint8Array }[] = [];

    for (const preset of presets) {
      const blob = await cropper.exportCropBlob(preset.name, format, quality);
      const buffer = await blob.arrayBuffer();
      files.push({ name: `${preset.name}.${format}`, data: new Uint8Array(buffer) });
    }

    const zipBlob = createZip(files);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crops-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('ZIP download failed:', err);
  } finally {
    btn.textContent = 'Download All (ZIP)';
    btn.removeAttribute('disabled');
  }
});

// === Navigation ===

// Burger menu toggle
document.getElementById('nav-burger')?.addEventListener('click', () => {
  document.querySelector('.demo-nav-links')?.classList.toggle('open');
});

// Close mobile menu on link click
document.querySelectorAll('.demo-nav-links a').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelector('.demo-nav-links')?.classList.remove('open');
  });
});

// Active nav link on scroll
const navLinks = document.querySelectorAll('.demo-nav-links a');
const sections = document.querySelectorAll('.demo-section');

function updateActiveNav() {
  const scrollY = window.scrollY + 100;
  let currentId = '';

  sections.forEach((section) => {
    const el = section as HTMLElement;
    if (el.offsetTop <= scrollY) {
      currentId = el.id;
    }
  });

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === `#${currentId}`) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });

// === Code Copy Buttons ===

document.querySelectorAll('.demo-code-wrap').forEach((wrap) => {
  const btn = document.createElement('button');
  btn.className = 'demo-code-copy';
  btn.title = 'Copy to clipboard';
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';

  btn.addEventListener('click', () => {
    const code = wrap.querySelector('code');
    if (!code) return;
    navigator.clipboard.writeText(code.textContent || '').then(() => {
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      btn.classList.add('demo-code-copy--done');
      setTimeout(() => {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
        btn.classList.remove('demo-code-copy--done');
      }, 2000);
    });
  });

  wrap.appendChild(btn);
});

// Initialize on load
init();
