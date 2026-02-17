import { describe, it, expect } from 'vitest';
import { calculateCrop } from '../src/core/crop-engine';

describe('calculateCrop', () => {
  const W = 4000;
  const H = 3000;

  it('should return a crop centered on focal point (50, 50) for 16:9', () => {
    const crop = calculateCrop(W, H, 50, 50, 16 / 9);
    expect(crop.width).toBe(W);
    expect(crop.height).toBe(Math.round(W / (16 / 9)));
    // Centered vertically
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(Math.round((H - crop.height) / 2));
  });

  it('should return full image when target ratio equals image ratio', () => {
    const ratio = W / H; // 4:3 = 1.333...
    const crop = calculateCrop(W, H, 50, 50, ratio);
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(0);
    expect(crop.width).toBe(W);
    expect(crop.height).toBe(H);
  });

  it('should anchor crop to top-left when focal point is (0, 0)', () => {
    const crop = calculateCrop(W, H, 0, 0, 16 / 9);
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(0);
  });

  it('should anchor crop to bottom-right when focal point is (100, 100)', () => {
    const crop = calculateCrop(W, H, 100, 100, 16 / 9);
    expect(crop.x + crop.width).toBe(W);
    expect(crop.y + crop.height).toBe(H);
  });

  it('should anchor crop to top-right when focal point is (100, 0)', () => {
    const crop = calculateCrop(W, H, 100, 0, 1); // square
    expect(crop.x + crop.width).toBe(W);
    expect(crop.y).toBe(0);
  });

  it('should anchor crop to bottom-left when focal point is (0, 100)', () => {
    const crop = calculateCrop(W, H, 0, 100, 1); // square
    expect(crop.x).toBe(0);
    expect(crop.y + crop.height).toBe(H);
  });

  it('should clamp crop within image bounds for focal near left edge', () => {
    const crop = calculateCrop(W, H, 10, 50, 16 / 9);
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(W);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.y + crop.height).toBeLessThanOrEqual(H);
  });

  it('should produce correct crop for 1:1 (square) on a landscape image', () => {
    const crop = calculateCrop(W, H, 50, 50, 1);
    // Square: constrained by height
    expect(crop.width).toBe(H);
    expect(crop.height).toBe(H);
    // Centered horizontally
    expect(crop.x).toBe(Math.round((W - H) / 2));
    expect(crop.y).toBe(0);
  });

  it('should produce correct crop for 9:16 (portrait) on a landscape image', () => {
    const crop = calculateCrop(W, H, 50, 50, 9 / 16);
    // Portrait: constrained by height
    expect(crop.height).toBe(H);
    expect(crop.width).toBe(Math.round(H * (9 / 16)));
  });

  it('should produce correct crop for 21:9 (ultrawide)', () => {
    const crop = calculateCrop(W, H, 50, 50, 21 / 9);
    // Ultrawide is wider than 4:3 image, so constrained by width
    expect(crop.width).toBe(W);
    expect(crop.height).toBe(Math.round(W / (21 / 9)));
  });

  it('should produce correct crop for 3:1 (banner)', () => {
    const crop = calculateCrop(W, H, 50, 50, 3);
    expect(crop.width).toBe(W);
    expect(crop.height).toBe(Math.round(W / 3));
  });

  it('should handle very wide ratio (10:1) on a square image', () => {
    const crop = calculateCrop(1000, 1000, 50, 50, 10);
    expect(crop.width).toBe(1000);
    expect(crop.height).toBe(100);
    expect(crop.y).toBe(450); // centered: (1000 - 100) / 2
  });

  it('should handle very tall ratio (1:10) on a square image', () => {
    const crop = calculateCrop(1000, 1000, 50, 50, 0.1);
    expect(crop.height).toBe(1000);
    expect(crop.width).toBe(100);
    expect(crop.x).toBe(450); // centered: (1000 - 100) / 2
  });

  it('should never exceed image bounds (property test)', () => {
    const ratios = [16 / 9, 1, 9 / 16, 4 / 3, 21 / 9, 3, 0.5, 2, 1.91];
    const focals = [0, 10, 25, 50, 75, 90, 100];

    for (const ratio of ratios) {
      for (const fx of focals) {
        for (const fy of focals) {
          const crop = calculateCrop(W, H, fx, fy, ratio);
          expect(crop.x).toBeGreaterThanOrEqual(0);
          expect(crop.y).toBeGreaterThanOrEqual(0);
          expect(crop.x + crop.width).toBeLessThanOrEqual(W + 1); // +1 for rounding
          expect(crop.y + crop.height).toBeLessThanOrEqual(H + 1);
          expect(crop.width).toBeGreaterThan(0);
          expect(crop.height).toBeGreaterThan(0);
        }
      }
    }
  });

  it('should always match target aspect ratio (property test)', () => {
    const ratios = [16 / 9, 1, 9 / 16, 4 / 3, 21 / 9, 3];

    for (const ratio of ratios) {
      const crop = calculateCrop(W, H, 50, 50, ratio);
      const actualRatio = crop.width / crop.height;
      // Allow small error due to rounding
      expect(Math.abs(actualRatio - ratio)).toBeLessThan(0.01);
    }
  });

  it('should work with small images', () => {
    const crop = calculateCrop(10, 10, 50, 50, 1);
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(0);
    expect(crop.width).toBe(10);
    expect(crop.height).toBe(10);
  });

  it('should handle the example from specs', () => {
    // Image: 4000 × 3000, Focal: {x:30, y:40}, Target: 16:9
    const crop = calculateCrop(4000, 3000, 30, 40, 16 / 9);
    expect(crop.x).toBe(0); // clamped to 0
    expect(crop.width).toBe(4000);
    expect(crop.height).toBe(Math.round(4000 / (16 / 9)));
  });
});
