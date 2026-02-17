/** Configuration for a crop preset */
export interface CropPreset {
  /** Unique name identifier */
  name: string;
  /** Aspect ratio — "16:9", "1:1", "1.91:1", or number */
  ratio: string | number;
  /** Display label (defaults to name if not provided) */
  label?: string;
  /** Overlay color for this preset (CSS color value) */
  color?: string;
}

/** Crop rectangle in pixels */
export interface CropRect {
  /** X offset from left in pixels */
  x: number;
  /** Y offset from top in pixels */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/** Event emitted when focal point or crops change */
export interface CropChangeEvent {
  /** Current focal point position (0–100) */
  focalPoint: { x: number; y: number };
  /** Computed crop rectangles for each preset */
  crops: Record<string, CropRect>;
}

/** Error object */
export interface CISmartCropError {
  code: 'IMAGE_LOAD_FAILED' | 'INVALID_RATIO' | 'INVALID_PRESET' | 'CONTAINER_NOT_FOUND';
  message: string;
  details?: unknown;
}

/** Main plugin configuration */
export interface CISmartCropConfig {
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
  onReady?: (instance: unknown) => void;
  /** Callback when an error occurs */
  onError?: (error: CISmartCropError) => void;
}

/** Resolved configuration with all defaults applied */
export type ResolvedConfig = Required<Omit<CISmartCropConfig, 'onChange' | 'onReady' | 'onError'>> & {
  onChange?: CISmartCropConfig['onChange'];
  onReady?: CISmartCropConfig['onReady'];
  onError?: CISmartCropConfig['onError'];
};

/** Internal preset with resolved numeric ratio */
export interface ResolvedPreset extends CropPreset {
  /** Parsed numeric ratio (width / height) */
  numericRatio: number;
  /** Resolved label */
  label: string;
  /** Resolved color */
  color: string;
}

/** Export JSON format */
export interface ExportData {
  version: string;
  focalPoint: { x: number; y: number };
  image: {
    src: string;
    width: number;
    height: number;
  };
  crops: Record<string, CropRect & { preset: CropPreset }>;
}
