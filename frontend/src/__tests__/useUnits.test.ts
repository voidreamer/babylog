import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUnits } from '../hooks/useUnits';

describe('useUnits', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('default metric mode', () => {
    it('starts in metric mode', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.units).toBe('metric');
      expect(result.current.isImperial).toBe(false);
    });

    it('formatWeight returns kg', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.formatWeight(3.5)).toBe('3.5 kg');
    });

    it('formatLength returns cm', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.formatLength(50)).toBe('50.0 cm');
    });

    it('formatVolume returns ml', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.formatVolume(120)).toBe('120 ml');
    });

    it('formatTemp returns Celsius', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.formatTemp(37)).toBe('37.0\u00B0C');
    });

    it('convertWeight returns same value in metric', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.convertWeight(5)).toBe(5);
    });

    it('convertLength returns same value in metric', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.convertLength(100)).toBe(100);
    });

    it('convertVolume returns same value in metric', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.convertVolume(250)).toBe(250);
    });

    it('convertTemp returns same value in metric', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.convertTemp(36.5)).toBe(36.5);
    });
  });

  describe('imperial mode', () => {
    it('formatWeight returns lbs after switching to imperial', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      expect(result.current.formatWeight(3.5)).toBe('7.7 lbs');
    });

    it('formatLength returns inches after switching to imperial', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      expect(result.current.formatLength(50)).toBe('19.7 in');
    });

    it('formatVolume returns oz after switching to imperial', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      expect(result.current.formatVolume(120)).toBe('4 oz');
    });

    it('formatTemp returns Fahrenheit after switching to imperial', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      expect(result.current.formatTemp(37)).toBe('98.6\u00B0F');
    });

    it('isImperial is true after switching', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      expect(result.current.isImperial).toBe(true);
    });
  });

  describe('null handling', () => {
    it('formatWeight returns -- for null', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.formatWeight(null)).toBe('--');
    });

    it('formatWeight returns -- for undefined', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.formatWeight(undefined)).toBe('--');
    });

    it('formatLength returns -- for null', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.formatLength(null)).toBe('--');
    });

    it('formatVolume returns -- for null', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.formatVolume(null)).toBe('--');
    });

    it('formatTemp returns -- for null', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.formatTemp(null)).toBe('--');
    });
  });

  describe('conversion accuracy', () => {
    it('converts kg to lbs accurately', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      // 1 kg = 2.20462 lbs
      expect(result.current.convertWeight(1)).toBeCloseTo(2.20462, 4);
    });

    it('converts cm to inches accurately', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      // 1 cm = 0.393701 in
      expect(result.current.convertLength(1)).toBeCloseTo(0.393701, 5);
    });

    it('converts ml to oz accurately', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      // 1 ml = 0.033814 oz
      expect(result.current.convertVolume(1)).toBeCloseTo(0.033814, 5);
    });

    it('converts celsius to fahrenheit accurately', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      // 0°C = 32°F
      expect(result.current.convertTemp(0)).toBeCloseTo(32, 1);
      // 100°C = 212°F
      expect(result.current.convertTemp(100)).toBeCloseTo(212, 1);
      // 37°C = 98.6°F
      expect(result.current.convertTemp(37)).toBeCloseTo(98.6, 1);
    });
  });

  describe('parse functions (reverse conversions)', () => {
    it('parseWeight is identity in metric mode', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.parseWeight(5)).toBe(5);
    });

    it('parseWeight converts lbs back to kg in imperial', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      // 2.20462 lbs -> 1 kg
      expect(result.current.parseWeight(2.20462)).toBeCloseTo(1, 4);
    });

    it('parseLength is identity in metric mode', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.parseLength(50)).toBe(50);
    });

    it('parseLength converts inches back to cm in imperial', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      // 0.393701 in -> 1 cm
      expect(result.current.parseLength(0.393701)).toBeCloseTo(1, 4);
    });

    it('parseVolume converts oz back to ml in imperial', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      // 0.033814 oz -> 1 ml
      expect(result.current.parseVolume(0.033814)).toBeCloseTo(1, 4);
    });

    it('parseTemp converts fahrenheit back to celsius in imperial', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      expect(result.current.parseTemp(98.6)).toBeCloseTo(37, 1);
      expect(result.current.parseTemp(32)).toBeCloseTo(0, 1);
      expect(result.current.parseTemp(212)).toBeCloseTo(100, 1);
    });

    it('roundtrip: convert then parse returns original value', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      const originalKg = 3.5;
      const lbs = result.current.convertWeight(originalKg);
      const backToKg = result.current.parseWeight(lbs);
      expect(backToKg).toBeCloseTo(originalKg, 5);
    });
  });

  describe('unit labels', () => {
    it('shows metric labels by default', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.weightUnit).toBe('kg');
      expect(result.current.lengthUnit).toBe('cm');
      expect(result.current.volumeUnit).toBe('ml');
      expect(result.current.tempUnit).toBe('\u00B0C');
    });

    it('shows imperial labels after switching', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      expect(result.current.weightUnit).toBe('lbs');
      expect(result.current.lengthUnit).toBe('in');
      expect(result.current.volumeUnit).toBe('oz');
      expect(result.current.tempUnit).toBe('\u00B0F');
    });
  });

  describe('localStorage integration', () => {
    it('persists unit selection to localStorage', () => {
      const { result } = renderHook(() => useUnits());
      act(() => {
        result.current.setUnits('imperial');
      });
      expect(localStorage.setItem).toHaveBeenCalledWith('heybub-units', 'imperial');
    });

    it('reads initial unit from localStorage', () => {
      localStorage.setItem('heybub-units', 'imperial');
      const { result } = renderHook(() => useUnits());
      expect(result.current.units).toBe('imperial');
      expect(result.current.isImperial).toBe(true);
    });

    it('defaults to metric when localStorage is empty', () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.units).toBe('metric');
    });

    it('can switch back to metric from imperial', () => {
      localStorage.setItem('heybub-units', 'imperial');
      const { result } = renderHook(() => useUnits());
      expect(result.current.isImperial).toBe(true);
      act(() => {
        result.current.setUnits('metric');
      });
      expect(result.current.isImperial).toBe(false);
      expect(result.current.units).toBe('metric');
      expect(localStorage.setItem).toHaveBeenCalledWith('heybub-units', 'metric');
    });
  });
});
