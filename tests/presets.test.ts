import { describe, it, expect } from 'vitest';
import { parseRatio, validatePreset, resolvePreset, BUILT_IN_PRESETS } from '../src/core/presets';

describe('parseRatio', () => {
  it('should parse "16:9"', () => {
    expect(parseRatio('16:9')).toBeCloseTo(16 / 9);
  });

  it('should parse "1:1"', () => {
    expect(parseRatio('1:1')).toBe(1);
  });

  it('should parse "1.91:1"', () => {
    expect(parseRatio('1.91:1')).toBeCloseTo(1.91);
  });

  it('should parse "16/9"', () => {
    expect(parseRatio('16/9')).toBeCloseTo(16 / 9);
  });

  it('should parse numeric 1.5', () => {
    expect(parseRatio(1.5)).toBe(1.5);
  });

  it('should parse decimal string "1.91"', () => {
    expect(parseRatio('1.91')).toBeCloseTo(1.91);
  });

  it('should reject "abc"', () => {
    expect(() => parseRatio('abc')).toThrow('Invalid ratio');
  });

  it('should reject "0:0"', () => {
    expect(() => parseRatio('0:0')).toThrow('Invalid ratio');
  });

  it('should reject negative number', () => {
    expect(() => parseRatio(-1)).toThrow('Invalid ratio');
  });

  it('should reject zero', () => {
    expect(() => parseRatio(0)).toThrow('Invalid ratio');
  });

  it('should reject Infinity', () => {
    expect(() => parseRatio(Infinity)).toThrow('Invalid ratio');
  });

  it('should reject NaN', () => {
    expect(() => parseRatio(NaN)).toThrow('Invalid ratio');
  });
});

describe('validatePreset', () => {
  it('should return null for a valid preset', () => {
    expect(validatePreset({ name: 'test', ratio: '16:9' })).toBeNull();
  });

  it('should reject preset without name', () => {
    expect(validatePreset({ name: '', ratio: '16:9' })).toContain('name');
  });

  it('should reject preset without ratio', () => {
    expect(validatePreset({ name: 'test', ratio: undefined as unknown as string })).toContain('ratio');
  });

  it('should reject preset with invalid ratio', () => {
    expect(validatePreset({ name: 'test', ratio: 'abc' })).toContain('invalid ratio');
  });
});

describe('resolvePreset', () => {
  it('should resolve ratio to numeric', () => {
    const resolved = resolvePreset({ name: 'test', ratio: '16:9' }, 0);
    expect(resolved.numericRatio).toBeCloseTo(16 / 9);
  });

  it('should use preset label if provided', () => {
    const resolved = resolvePreset({ name: 'test', ratio: '16:9', label: 'My Label' }, 0);
    expect(resolved.label).toBe('My Label');
  });

  it('should fall back to name for label', () => {
    const resolved = resolvePreset({ name: 'test', ratio: '16:9' }, 0);
    expect(resolved.label).toBe('test');
  });

  it('should use preset color if provided', () => {
    const resolved = resolvePreset({ name: 'test', ratio: '16:9', color: '#000' }, 0);
    expect(resolved.color).toBe('#000');
  });

  it('should auto-assign color from palette', () => {
    const resolved = resolvePreset({ name: 'test', ratio: '16:9' }, 2);
    expect(resolved.color).toBe('#45B7D1'); // 3rd color in palette
  });
});

describe('BUILT_IN_PRESETS', () => {
  it('should have 8 presets', () => {
    expect(BUILT_IN_PRESETS).toHaveLength(8);
  });

  it('should all have unique names', () => {
    const names = BUILT_IN_PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('should all have valid ratios', () => {
    for (const preset of BUILT_IN_PRESETS) {
      expect(() => parseRatio(preset.ratio)).not.toThrow();
    }
  });
});
