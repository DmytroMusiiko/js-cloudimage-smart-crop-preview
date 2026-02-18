import { forwardRef, useRef, useEffect, useImperativeHandle } from 'react';
import { CISmartCrop } from '../src/index';
import type {
  CISmartCropConfig,
  CropPreset,
  CropRect,
  CropChangeEvent,
  CISmartCropError,
} from '../src/core/types';

// Re-export types
export type {
  CISmartCropConfig,
  CropPreset,
  CropRect,
  CropChangeEvent,
  CISmartCropError,
};
export { useCISmartCrop } from './hooks';

export interface CISmartCropViewerProps {
  src: string;
  focalPoint?: { x: number; y: number };
  presets?: CropPreset[];
  layout?: 'grid' | 'single';
  theme?: 'light' | 'dark';
  showOverlay?: boolean;
  showDimensions?: boolean;
  onChange?: (event: CropChangeEvent) => void;
  onReady?: (instance: CISmartCrop) => void;
  onError?: (error: CISmartCropError) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface CISmartCropViewerRef {
  setFocalPoint(point: { x: number; y: number }): void;
  getFocalPoint(): { x: number; y: number };
  getCrops(): Record<string, CropRect>;
  getCrop(name: string): CropRect | undefined;
  addPreset(preset: CropPreset): void;
  removePreset(name: string): boolean;
  getPresets(): CropPreset[];
  setLayout(mode: 'grid' | 'single'): void;
  setTheme(theme: 'light' | 'dark'): void;
  setSrc(src: string): Promise<void>;
  exportJSON(): string;
  exportCropBlob(presetName: string, format?: 'png' | 'jpeg' | 'webp', quality?: number): Promise<Blob>;
}

export const CISmartCropViewer = forwardRef<CISmartCropViewerRef, CISmartCropViewerProps>(
  function CISmartCropViewer(props, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<CISmartCrop | null>(null);
    const callbacksRef = useRef({
      onChange: props.onChange,
      onReady: props.onReady,
      onError: props.onError,
    });

    // Keep callbacks ref current
    callbacksRef.current = {
      onChange: props.onChange,
      onReady: props.onReady,
      onError: props.onError,
    };

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
      }, []);

    // Sync src
    useEffect(() => {
      instanceRef.current?.setSrc(props.src);
    }, [props.src]);

    // Sync layout
    useEffect(() => {
      if (props.layout) instanceRef.current?.setLayout(props.layout);
    }, [props.layout]);

    // Sync theme
    useEffect(() => {
      if (props.theme) instanceRef.current?.setTheme(props.theme);
    }, [props.theme]);

    // Sync showOverlay
    useEffect(() => {
      if (props.showOverlay !== undefined) {
        instanceRef.current?.update({ showOverlay: props.showOverlay });
      }
    }, [props.showOverlay]);

    // Sync showDimensions
    useEffect(() => {
      if (props.showDimensions !== undefined) {
        instanceRef.current?.update({ showDimensions: props.showDimensions });
      }
    }, [props.showDimensions]);

    // Expose ref API
    useImperativeHandle(
      ref,
      () => ({
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
        exportCropBlob: (n, f, q) =>
          instanceRef.current?.exportCropBlob(n, f, q) ?? Promise.reject(new Error('Not initialized')),
      }),
      [],
    );

    return <div ref={containerRef} className={props.className} style={props.style} />;
  },
);
