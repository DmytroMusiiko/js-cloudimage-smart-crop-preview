/**
 * Load an image and return its natural dimensions.
 */
export function loadImage(src: string): Promise<{ img: HTMLImageElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      resolve({ img, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
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
