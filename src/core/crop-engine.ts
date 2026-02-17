import type { CropRect } from './types';

/**
 * Clamp a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate the crop rectangle for a given image, focal point, and target aspect ratio.
 *
 * The algorithm:
 * 1. Compute the largest rectangle with the target ratio that fits in the image
 * 2. Center it on the focal point
 * 3. Clamp to image boundaries
 * 4. Round to integers
 *
 * @param imageWidth  - Natural width of the image in pixels
 * @param imageHeight - Natural height of the image in pixels
 * @param focalX      - Focal point X position (0–100)
 * @param focalY      - Focal point Y position (0–100)
 * @param targetRatio - Target aspect ratio (width / height), e.g. 16/9 = 1.778
 * @returns CropRect with pixel coordinates
 */
export function calculateCrop(
  imageWidth: number,
  imageHeight: number,
  focalX: number,
  focalY: number,
  targetRatio: number,
): CropRect {
  // Step 1: Calculate maximum crop size that fits in the image
  const imageRatio = imageWidth / imageHeight;

  let cropWidth: number;
  let cropHeight: number;

  if (targetRatio > imageRatio) {
    // Target is wider than image → constrain by width
    cropWidth = imageWidth;
    cropHeight = imageWidth / targetRatio;
  } else {
    // Target is taller or equal → constrain by height
    cropHeight = imageHeight;
    cropWidth = imageHeight * targetRatio;
  }

  // Step 2: Calculate focal point in pixels
  const focalPxX = (focalX / 100) * imageWidth;
  const focalPxY = (focalY / 100) * imageHeight;

  // Step 3: Center crop on focal point
  let cropX = focalPxX - cropWidth / 2;
  let cropY = focalPxY - cropHeight / 2;

  // Step 4: Clamp to image boundaries
  cropX = clamp(cropX, 0, imageWidth - cropWidth);
  cropY = clamp(cropY, 0, imageHeight - cropHeight);

  // Step 5: Round to integers
  return {
    x: Math.round(cropX),
    y: Math.round(cropY),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
  };
}

/**
 * Calculate crops for all presets at once.
 */
export function calculateAllCrops(
  imageWidth: number,
  imageHeight: number,
  focalX: number,
  focalY: number,
  presets: Array<{ name: string; numericRatio: number }>,
): Record<string, CropRect> {
  const crops: Record<string, CropRect> = {};
  for (const preset of presets) {
    crops[preset.name] = calculateCrop(imageWidth, imageHeight, focalX, focalY, preset.numericRatio);
  }
  return crops;
}
