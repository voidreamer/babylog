import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, recordAttempt, getTimeUntilReset, clearRateLimit } from '../utils/rateLimiter';

describe('rateLimiter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('checkRateLimit', () => {
    it('allows first attempt', () => {
      const result = checkRateLimit('test-action');
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(3);
    });

    it('blocks after max attempts', () => {
      recordAttempt('test-action');
      recordAttempt('test-action');
      recordAttempt('test-action');
      const result = checkRateLimit('test-action');
      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
    });

    it('respects custom maxAttempts', () => {
      recordAttempt('custom', 60000);
      const result = checkRateLimit('custom', 1);
      expect(result.allowed).toBe(false);
    });

    it('returns correct remaining attempts', () => {
      recordAttempt('test');
      const result = checkRateLimit('test');
      expect(result.remainingAttempts).toBe(2);
    });

    it('returns resetTime', () => {
      recordAttempt('test');
      const result = checkRateLimit('test');
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe('clearRateLimit', () => {
    it('clears rate limit for action', () => {
      recordAttempt('test');
      recordAttempt('test');
      recordAttempt('test');
      clearRateLimit('test');
      const result = checkRateLimit('test');
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(3);
    });
  });

  describe('getTimeUntilReset', () => {
    it('returns empty string for null', () => {
      expect(getTimeUntilReset(null)).toBe('');
    });

    it('returns empty string for past time', () => {
      expect(getTimeUntilReset(Date.now() - 1000)).toBe('');
    });

    it('returns seconds for near future', () => {
      const result = getTimeUntilReset(Date.now() + 30000);
      expect(result).toMatch(/second/);
    });

    it('returns minutes for further future', () => {
      const result = getTimeUntilReset(Date.now() + 120000);
      expect(result).toMatch(/minute/);
    });
  });
});
