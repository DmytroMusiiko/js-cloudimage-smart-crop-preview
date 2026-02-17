import type { CropPreset, ResolvedPreset } from './types';

/** Default overlay color palette */
const DEFAULT_COLORS = [
  '#FF6B6B', // red
  '#4ECDC4', // teal
  '#45B7D1', // blue
  '#96CEB4', // green
  '#FFEAA7', // yellow
  '#DDA0DD', // plum
  '#98D8C8', // mint
  '#F7DC6F', // gold
  '#A29BFE', // lavender
  '#FD79A8', // pink
];

/** Built-in crop presets */
export const BUILT_IN_PRESETS: CropPreset[] = [
  { name: 'landscape', ratio: '16:9', label: 'Landscape 16:9', color: '#FF6B6B' },
  { name: 'ultrawide', ratio: '21:9', label: 'Ultrawide 21:9', color: '#4ECDC4' },
  { name: 'standard', ratio: '4:3', label: 'Standard 4:3', color: '#45B7D1' },
  { name: 'square', ratio: '1:1', label: 'Square 1:1', color: '#96CEB4' },
  { name: 'portrait', ratio: '9:16', label: 'Portrait 9:16', color: '#FFEAA7' },
  { name: 'social-portrait', ratio: '4:5', label: 'Social Portrait 4:5', color: '#DDA0DD' },
  { name: 'og-image', ratio: '1.91:1', label: 'OG Image 1.91:1', color: '#98D8C8' },
  { name: 'banner', ratio: '3:1', label: 'Banner 3:1', color: '#F7DC6F' },
];

/**
 * Parse a ratio string or number into a numeric ratio (width / height).
 * Supports: "16:9", "16/9", "1.91", 1.778
 */
export function parseRatio(input: string | number): number {
  if (typeof input === 'number') {
    if (input <= 0 || !isFinite(input)) {
      throw new Error(`Invalid ratio: ${input}. Must be a positive finite number.`);
    }
    return input;
  }

  // "16:9" or "16/9"
  const parts = input.split(/[:/]/);
  if (parts.length === 2) {
    const w = parseFloat(parts[0]);
    const h = parseFloat(parts[1]);
    if (w > 0 && h > 0 && isFinite(w) && isFinite(h)) {
      return w / h;
    }
  }

  // "1.91" (decimal string)
  const decimal = parseFloat(input);
  if (!isNaN(decimal) && decimal > 0 && isFinite(decimal)) {
    return decimal;
  }

  throw new Error(`Invalid ratio: "${input}". Expected "W:H", "W/H", or a positive number.`);
}

/**
 * Validate a preset object. Returns null if invalid.
 */
export function validatePreset(preset: CropPreset): string | null {
  if (!preset.name || typeof preset.name !== 'string') {
    return 'Preset must have a non-empty "name" string.';
  }
  if (preset.ratio === undefined || preset.ratio === null) {
    return `Preset "${preset.name}" must have a "ratio" value.`;
  }
  try {
    parseRatio(preset.ratio);
  } catch {
    return `Preset "${preset.name}" has invalid ratio "${preset.ratio}".`;
  }
  return null;
}

/**
 * Resolve a preset by parsing its ratio and filling defaults.
 */
export function resolvePreset(preset: CropPreset, index: number): ResolvedPreset {
  return {
    ...preset,
    numericRatio: parseRatio(preset.ratio),
    label: preset.label || preset.name,
    color: preset.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  };
}
