import { describe, it, expect, vi } from 'vitest';
import { parseUTCTime } from '../utils/parseTime';

describe('parseUTCTime', () => {
  describe('null/undefined input', () => {
    it('returns current date for null', () => {
      const before = Date.now();
      const result = parseUTCTime(null);
      const after = Date.now();
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });

    it('returns current date for undefined', () => {
      const before = Date.now();
      const result = parseUTCTime(undefined);
      const after = Date.now();
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });

    it('returns current date for empty string', () => {
      const before = Date.now();
      const result = parseUTCTime('');
      const after = Date.now();
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('Z suffix handling', () => {
    it('appends Z suffix when missing', () => {
      const result = parseUTCTime('2024-06-15T10:30:00');
      // Should parse as UTC, not local time
      expect(result.getUTCHours()).toBe(10);
      expect(result.getUTCMinutes()).toBe(30);
    });

    it('preserves Z suffix when already present', () => {
      const result = parseUTCTime('2024-06-15T10:30:00Z');
      expect(result.getUTCHours()).toBe(10);
      expect(result.getUTCMinutes()).toBe(30);
    });

    it('does not double-append Z', () => {
      const withZ = parseUTCTime('2024-06-15T10:30:00Z');
      const withoutZ = parseUTCTime('2024-06-15T10:30:00');
      expect(withZ.getTime()).toBe(withoutZ.getTime());
    });
  });

  describe('ISO date string parsing', () => {
    it('parses a date-only string correctly', () => {
      const result = parseUTCTime('2024-01-01');
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(0); // January is 0
      expect(result.getUTCDate()).toBe(1);
    });

    it('parses a full ISO timestamp correctly', () => {
      const result = parseUTCTime('2024-12-25T14:00:00');
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(11); // December is 11
      expect(result.getUTCDate()).toBe(25);
      expect(result.getUTCHours()).toBe(14);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
    });

    it('parses ISO timestamp with milliseconds', () => {
      const result = parseUTCTime('2024-06-15T10:30:00.123Z');
      expect(result.getUTCMilliseconds()).toBe(123);
      expect(result.getUTCHours()).toBe(10);
    });
  });

  describe('full ISO timestamps with timezone', () => {
    it('handles timestamp already ending with Z', () => {
      const result = parseUTCTime('2025-03-10T08:45:30.000Z');
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(2); // March is 2
      expect(result.getUTCDate()).toBe(10);
      expect(result.getUTCHours()).toBe(8);
      expect(result.getUTCMinutes()).toBe(45);
      expect(result.getUTCSeconds()).toBe(30);
    });

    it('returns a valid Date object, not NaN', () => {
      const result = parseUTCTime('2024-06-15T10:30:00');
      expect(result.getTime()).not.toBeNaN();
    });
  });
});
