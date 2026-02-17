/**
 * Load an image and return its natural dimensions.
 */
export function loadImage(src: string): Promise<{ img: HTMLImageElement; width: number; height: number }> {
  const isLocal = src.startsWith('data:') || src.startsWith('blob:');

  return new Promise((resolve, reject) => {
    const img = new Image();

    // Try with CORS first for cross-origin URLs (needed for canvas export).
    // Local sources (blob/data URI) never need it.
    if (!isLocal) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      resolve({ img, width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      // If CORS load failed, retry without crossOrigin so the image at
      // least displays (canvas export will be unavailable for this URL).
      if (img.crossOrigin !== null) {
        const retry = new Image();
        retry.onload = () => {
          resolve({ img: retry, width: retry.naturalWidth, height: retry.naturalHeight });
        };
        retry.onerror = () => {
          reject(new Error(`Failed to load image: ${src}`));
        };
        retry.src = src;
        return;
      }
      reject(new Error(`Failed to load image: ${src}`));
    };

    img.src = src;
  });
}

/**
 * Convert a File or Blob to an Object URL.
 */
export function fileToObjectURL(file: File | Blob): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke an Object URL to free memory.
 */
export function revokeObjectURL(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Check if a source is a data URI or blob URL (i.e., not a regular URL).
 */
export function isLocalSource(src: string): boolean {
  return src.startsWith('data:') || src.startsWith('blob:');
}

export type ImageFormat = 'png' | 'jpeg' | 'webp';

/**
 * Crop a region from an image and return it as a Blob.
 */
export function cropToBlob(
  img: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
  format: ImageFormat = 'png',
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D context not available'));
      return;
    }

    ctx.drawImage(
      img,
      crop.x, crop.y, crop.width, crop.height,
      0, 0, crop.width, crop.height,
    );

    const mimeType = `image/${format}`;
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create image blob'));
      },
      mimeType,
      format === 'png' ? undefined : quality,
    );
  });
}
