import { useRef, useEffect, useState } from 'react';
import { CISmartCrop } from '../src/index';
import type { CISmartCropConfig, CISmartCropError } from '../src/core/types';

export interface UseCISmartCropReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  instance: CISmartCrop | null;
  isReady: boolean;
  error: CISmartCropError | null;
}

export function useCISmartCrop(config: CISmartCropConfig): UseCISmartCropReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<CISmartCrop | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<CISmartCropError | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    setIsReady(false);
    setError(null);

    instanceRef.current = new CISmartCrop(containerRef.current, {
      ...config,
      onReady: () => {
        setIsReady(true);
        config.onReady?.(instanceRef.current!);
      },
      onError: (err) => {
        setError(err);
        config.onError?.(err);
      },
    });

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
      setIsReady(false);
    };
  }, [config.src]);

  return {
    containerRef,
    instance: instanceRef.current,
    isReady,
    error,
  };
}
