import { describe, it, expect } from 'vitest';
import { parseVoiceTranscript, extractAmount, extractDuration } from '../voiceParser';

describe('voiceParser', () => {
  // ===========================================================================
  // Feeding
  // ===========================================================================
  describe('feeding', () => {
    it('parses "bottle 4 ounces"', () => {
      const result = parseVoiceTranscript('bottle 4 ounces');
      expect(result.event_type).toBe('feeding');
      expect(result.feed_type).toBe('bottle');
      expect(result.amount_ml).toBeCloseTo(118, 0); // 4 * 29.57 ≈ 118
      expect(result.confidence).toBe('high');
    });

    it('parses "breastfed for 15 minutes"', () => {
      const result = parseVoiceTranscript('breastfed for 15 minutes');
      expect(result.event_type).toBe('feeding');
      expect(result.feed_type).toBe('breast');
      expect(result.duration_minutes).toBe(15);
      expect(result.confidence).toBe('high');
    });

    it('parses "formula 120 ml"', () => {
      const result = parseVoiceTranscript('formula 120 ml');
      expect(result.event_type).toBe('feeding');
      expect(result.feed_type).toBe('formula');
      expect(result.amount_ml).toBe(120);
    });

    it('parses "nursed for 20 minutes"', () => {
      const result = parseVoiceTranscript('nursed for 20 minutes');
      expect(result.event_type).toBe('feeding');
      expect(result.feed_type).toBe('breast');
      expect(result.duration_minutes).toBe(20);
    });

    it('parses "baby ate solids"', () => {
      const result = parseVoiceTranscript('baby ate solids');
      expect(result.event_type).toBe('feeding');
      expect(result.feed_type).toBe('solid');
    });

    it('parses "fed the baby" with medium confidence', () => {
      const result = parseVoiceTranscript('fed the baby');
      expect(result.event_type).toBe('feeding');
      expect(result.confidence).toBe('medium');
    });

    it('parses "bottle 6 oz" shorthand', () => {
      const result = parseVoiceTranscript('bottle 6 oz');
      expect(result.event_type).toBe('feeding');
      expect(result.feed_type).toBe('bottle');
      expect(result.amount_ml).toBeCloseTo(177, 0);
    });
  });

  // ===========================================================================
  // Diaper
  // ===========================================================================
  describe('diaper', () => {
    it('parses "wet diaper"', () => {
      const result = parseVoiceTranscript('wet diaper');
      expect(result.event_type).toBe('diaper');
      expect(result.diaper_type).toBe('pee');
      expect(result.confidence).toBe('high');
    });

    it('parses "poopy diaper"', () => {
      const result = parseVoiceTranscript('poopy diaper');
      expect(result.event_type).toBe('diaper');
      expect(result.diaper_type).toBe('poo');
    });

    it('parses "poopy blowout"', () => {
      const result = parseVoiceTranscript('poopy blowout');
      expect(result.event_type).toBe('diaper');
      expect(result.diaper_type).toBe('mixed');
    });

    it('parses "dirty diaper"', () => {
      const result = parseVoiceTranscript('dirty diaper');
      expect(result.event_type).toBe('diaper');
      expect(result.diaper_type).toBe('poo');
    });

    it('parses "changed diaper" as mixed (default)', () => {
      const result = parseVoiceTranscript('changed diaper');
      expect(result.event_type).toBe('diaper');
      expect(result.diaper_type).toBe('mixed');
      expect(result.confidence).toBe('medium');
    });

    it('parses "wet and poopy diaper"', () => {
      const result = parseVoiceTranscript('wet and poopy diaper');
      expect(result.event_type).toBe('diaper');
      expect(result.diaper_type).toBe('mixed');
    });

    it('parses "baby peed"', () => {
      const result = parseVoiceTranscript('baby peed');
      expect(result.event_type).toBe('diaper');
      expect(result.diaper_type).toBe('pee');
    });
  });

  // ===========================================================================
  // Sleep
  // ===========================================================================
  describe('sleep', () => {
    it('parses "baby fell asleep"', () => {
      const result = parseVoiceTranscript('baby fell asleep');
      expect(result.event_type).toBe('sleep');
      expect(result.sleep_action).toBe('start');
      expect(result.confidence).toBe('high');
    });

    it('parses "baby woke up"', () => {
      const result = parseVoiceTranscript('baby woke up');
      expect(result.event_type).toBe('sleep');
      expect(result.sleep_action).toBe('end');
    });

    it('parses "nap time"', () => {
      const result = parseVoiceTranscript('nap time');
      expect(result.event_type).toBe('sleep');
      expect(result.sleep_action).toBe('start');
    });

    it('parses "baby is awake"', () => {
      const result = parseVoiceTranscript('baby is awake');
      expect(result.event_type).toBe('sleep');
      expect(result.sleep_action).toBe('end');
    });

    it('parses "bedtime"', () => {
      const result = parseVoiceTranscript('bedtime');
      expect(result.event_type).toBe('sleep');
      expect(result.sleep_action).toBe('start');
    });

    it('parses "started sleeping"', () => {
      const result = parseVoiceTranscript('started sleeping');
      expect(result.event_type).toBe('sleep');
      expect(result.sleep_action).toBe('start');
    });
  });

  // ===========================================================================
  // Pumping
  // ===========================================================================
  describe('pumping', () => {
    it('parses "pumped 3 oz"', () => {
      const result = parseVoiceTranscript('pumped 3 oz');
      expect(result.event_type).toBe('pumping');
      expect(result.amount_ml).toBeCloseTo(89, 0);
      expect(result.confidence).toBe('high');
    });

    it('parses "pumped for 20 minutes"', () => {
      const result = parseVoiceTranscript('pumped for 20 minutes');
      expect(result.event_type).toBe('pumping');
      expect(result.duration_minutes).toBe(20);
    });

    it('parses "expressed 100 ml"', () => {
      const result = parseVoiceTranscript('expressed 100 ml');
      expect(result.event_type).toBe('pumping');
      expect(result.amount_ml).toBe(100);
    });

    it('parses "pumping" with medium confidence', () => {
      const result = parseVoiceTranscript('pumping');
      expect(result.event_type).toBe('pumping');
      expect(result.confidence).toBe('medium');
    });
  });

  // ===========================================================================
  // Supplement
  // ===========================================================================
  describe('supplement', () => {
    it('parses "gave vitamin D drops"', () => {
      const result = parseVoiceTranscript('gave vitamin D drops');
      expect(result.event_type).toBe('supplement');
      expect(result.supplement_name).toBe('vitamin_d');
      expect(result.confidence).toBe('high');
    });

    it('parses "iron supplement"', () => {
      const result = parseVoiceTranscript('iron supplement');
      expect(result.event_type).toBe('supplement');
      expect(result.supplement_name).toBe('iron');
    });

    it('parses "gave probiotic"', () => {
      const result = parseVoiceTranscript('gave probiotic');
      expect(result.event_type).toBe('supplement');
      expect(result.supplement_name).toBe('probiotic');
    });

    it('parses "DHA drops"', () => {
      const result = parseVoiceTranscript('DHA drops');
      expect(result.event_type).toBe('supplement');
      expect(result.supplement_name).toBe('dha');
    });

    it('parses "multivitamin"', () => {
      const result = parseVoiceTranscript('multivitamin');
      expect(result.event_type).toBe('supplement');
      expect(result.supplement_name).toBe('multivitamin');
    });
  });

  // ===========================================================================
  // Tummy time
  // ===========================================================================
  describe('tummy time', () => {
    it('parses "tummy time"', () => {
      const result = parseVoiceTranscript('tummy time');
      expect(result.event_type).toBe('tummy_time');
      expect(result.confidence).toBe('medium');
    });

    it('parses "tummy time for 10 minutes"', () => {
      const result = parseVoiceTranscript('tummy time for 10 minutes');
      expect(result.event_type).toBe('tummy_time');
      expect(result.duration_minutes).toBe(10);
      expect(result.confidence).toBe('high');
    });
  });

  // ===========================================================================
  // Bath
  // ===========================================================================
  describe('bath', () => {
    it('parses "bath time"', () => {
      const result = parseVoiceTranscript('bath time');
      expect(result.event_type).toBe('bath');
      expect(result.confidence).toBe('medium');
    });

    it('parses "gave baby a bath"', () => {
      const result = parseVoiceTranscript('gave baby a bath');
      expect(result.event_type).toBe('bath');
    });
  });

  // ===========================================================================
  // Potty
  // ===========================================================================
  describe('potty', () => {
    it('parses "potty success"', () => {
      const result = parseVoiceTranscript('potty success');
      expect(result.event_type).toBe('potty');
      expect(result.potty_result).toBe('success');
    });

    it('parses "potty accident"', () => {
      const result = parseVoiceTranscript('potty accident');
      expect(result.event_type).toBe('potty');
      expect(result.potty_result).toBe('accident');
    });

    it('parses "tried the potty" as attempt', () => {
      const result = parseVoiceTranscript('tried the potty');
      expect(result.event_type).toBe('potty');
      expect(result.potty_result).toBe('attempt');
    });
  });

  // ===========================================================================
  // Ambiguous / fallback
  // ===========================================================================
  describe('fallback', () => {
    it('returns low confidence for ambiguous input', () => {
      const result = parseVoiceTranscript('something happened with the baby');
      expect(result.confidence).toBe('low');
      expect(result.notes).toBe('something happened with the baby');
    });

    it('preserves transcript on all results', () => {
      const result = parseVoiceTranscript('bottle 4 oz');
      expect(result.transcript).toBe('bottle 4 oz');
    });
  });

  // ===========================================================================
  // Amount extraction
  // ===========================================================================
  describe('extractAmount', () => {
    it('converts oz to ml', () => {
      expect(extractAmount('4 oz')).toBeCloseTo(118, 0);
      expect(extractAmount('4 ounces')).toBeCloseTo(118, 0);
      expect(extractAmount('6oz')).toBeCloseTo(177, 0);
    });

    it('parses ml directly', () => {
      expect(extractAmount('120 ml')).toBe(120);
      expect(extractAmount('90ml')).toBe(90);
    });

    it('returns undefined for no amount', () => {
      expect(extractAmount('bottle feeding')).toBeUndefined();
    });
  });

  // ===========================================================================
  // Duration extraction
  // ===========================================================================
  describe('extractDuration', () => {
    it('parses minutes', () => {
      expect(extractDuration('15 minutes')).toBe(15);
      expect(extractDuration('15 min')).toBe(15);
      expect(extractDuration('15min')).toBe(15);
    });

    it('parses hours to minutes', () => {
      expect(extractDuration('1 hour')).toBe(60);
      expect(extractDuration('1.5 hours')).toBe(90);
      expect(extractDuration('2 hrs')).toBe(120);
    });

    it('parses "for N" as minutes', () => {
      expect(extractDuration('for 15')).toBe(15);
    });

    it('returns undefined for no duration', () => {
      expect(extractDuration('bottle feeding')).toBeUndefined();
    });
  });
});
