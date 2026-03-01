/**
 * Voice transcript parser — converts natural language into structured event payloads.
 * Deterministic keyword-based, runs client-side, no network needed.
 * English-only; architecture supports per-language keyword maps later.
 */

// ============================================================================
// Types
// ============================================================================

export type VoiceEventType =
  | 'feeding'
  | 'diaper'
  | 'sleep'
  | 'pumping'
  | 'potty'
  | 'tummy_time'
  | 'bath'
  | 'supplement';

export type FeedType = 'formula' | 'breast' | 'bottle' | 'solid';
export type DiaperType = 'pee' | 'poo' | 'mixed';
export type SleepAction = 'start' | 'end';
export type PottyResult = 'success' | 'accident' | 'attempt';
export type PottyType = 'pee' | 'poo' | 'both';
export type SupplementName = 'vitamin_d' | 'iron' | 'dha' | 'probiotic' | 'multivitamin' | 'other';
export type Confidence = 'high' | 'medium' | 'low';

export interface ParsedVoiceEvent {
  event_type: VoiceEventType;
  confidence: Confidence;
  transcript: string;
  notes?: string;

  // Feeding
  feed_type?: FeedType;
  amount_ml?: number;
  duration_minutes?: number;

  // Diaper
  diaper_type?: DiaperType;

  // Sleep
  sleep_action?: SleepAction;

  // Pumping (uses amount_ml + duration_minutes)

  // Potty
  potty_result?: PottyResult;
  potty_type?: PottyType;

  // Supplement
  supplement_name?: SupplementName;
  dosage?: string;
}

// ============================================================================
// Keyword maps
// ============================================================================

const FEEDING_KEYWORDS = [
  'fed', 'feed', 'feeding', 'ate', 'eat', 'eating',
  'bottle', 'breast', 'breastfed', 'breastfeeding', 'nursed', 'nursing',
  'formula', 'solid', 'solids', 'puree', 'cereal',
];

const DIAPER_KEYWORDS = [
  'diaper', 'nappy', 'changed', 'change',
  'wet', 'pee', 'peed',
  'poop', 'poopy', 'pooped', 'poo', 'dirty',
  'blowout', 'blow out', 'blow-out',
];

const SLEEP_KEYWORDS = [
  'sleep', 'sleeping', 'slept', 'nap', 'napping', 'napped',
  'asleep', 'fell asleep', 'bedtime', 'bed time',
  'woke', 'woken', 'wake', 'waking', 'awake', 'woke up', 'got up',
];

const PUMPING_KEYWORDS = [
  'pump', 'pumped', 'pumping', 'expressed', 'expressing',
];

const POTTY_KEYWORDS = [
  'potty', 'toilet', 'pottied',
];

const TUMMY_KEYWORDS = [
  'tummy time', 'tummy-time', 'tummytime',
  'on belly', 'on tummy', 'on stomach',
];

const BATH_KEYWORDS = [
  'bath', 'bathed', 'bathing', 'bath time', 'bathtime',
  'shower', 'washed',
];

const SUPPLEMENT_KEYWORDS = [
  'vitamin', 'vitamins', 'vitamin d', 'vitamin-d',
  'iron', 'dha', 'omega',
  'probiotic', 'probiotics',
  'multivitamin', 'supplement', 'drops',
];

// ============================================================================
// Extraction helpers
// ============================================================================

const OZ_TO_ML = 29.5735;

/** Extract a numeric amount with unit (oz or ml). Returns ml. */
export function extractAmount(text: string): number | undefined {
  // Match patterns like "4 oz", "4oz", "4 ounces", "120 ml", "120ml"
  const ozMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces)\b/i);
  if (ozMatch) {
    return Math.round(parseFloat(ozMatch[1]) * OZ_TO_ML);
  }

  const mlMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ml|milliliter|milliliters|millilitres)\b/i);
  if (mlMatch) {
    return Math.round(parseFloat(mlMatch[1]));
  }

  // Bare number in feeding/pumping context — assume oz if small, ml if large
  // This is intentionally NOT matched here; caller handles context-aware bare numbers
  return undefined;
}

/** Extract duration in minutes. */
export function extractDuration(text: string): number | undefined {
  // "15 minutes", "15 min", "15min"
  const minMatch = text.match(/(\d+)\s*(?:min|mins|minute|minutes)\b/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }

  // "1 hour", "2 hours", "1.5 hours"
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs)\b/i);
  if (hourMatch) {
    return Math.round(parseFloat(hourMatch[1]) * 60);
  }

  // "for 15" — bare number after "for"
  const forMatch = text.match(/\bfor\s+(\d+)\b/i);
  if (forMatch) {
    return parseInt(forMatch[1], 10);
  }

  return undefined;
}

/** Detect feed type from keywords. */
function detectFeedType(text: string): FeedType | undefined {
  if (/\b(?:breast|breastfed|breastfeeding|nursed|nursing)\b/i.test(text)) return 'breast';
  if (/\bformula\b/i.test(text)) return 'formula';
  if (/\bbottle\b/i.test(text)) return 'bottle';
  if (/\b(?:solid|solids|puree|cereal)\b/i.test(text)) return 'solid';
  return undefined;
}

/** Detect diaper type. */
function detectDiaperType(text: string): DiaperType {
  const hasPoo = /\b(?:poop|poopy|pooped|poo|dirty|blowout|blow.?out)\b/i.test(text);
  const hasPee = /\b(?:wet|pee|peed)\b/i.test(text);

  if (hasPoo && hasPee) return 'mixed';
  if (/\b(?:blowout|blow.?out)\b/i.test(text)) return 'mixed';
  if (hasPoo) return 'poo';
  if (hasPee) return 'pee';
  return 'mixed'; // default if just "diaper" or "changed"
}

/** Detect sleep start vs end. */
function detectSleepAction(text: string): SleepAction {
  if (/\b(?:woke|woken|wake|waking|awake|got up|woke up)\b/i.test(text)) return 'end';
  return 'start'; // default: fell asleep, nap, bedtime, etc.
}

/** Detect supplement name. */
function detectSupplementName(text: string): SupplementName {
  if (/\b(?:vitamin\s*d|vitamin-d|vit\s*d)\b/i.test(text)) return 'vitamin_d';
  if (/\biron\b/i.test(text)) return 'iron';
  if (/\b(?:dha|omega)\b/i.test(text)) return 'dha';
  if (/\b(?:probiotic|probiotics)\b/i.test(text)) return 'probiotic';
  if (/\bmultivitamin\b/i.test(text)) return 'multivitamin';
  return 'other';
}

/** Detect potty result. */
function detectPottyResult(text: string): PottyResult {
  if (/\b(?:accident|oops)\b/i.test(text)) return 'accident';
  if (/\b(?:success|successful|went|did it|made it)\b/i.test(text)) return 'success';
  return 'attempt';
}

/** Detect potty type. */
function detectPottyType(text: string): PottyType | undefined {
  const hasPoo = /\b(?:poop|poopy|poo|number two|number 2)\b/i.test(text);
  const hasPee = /\b(?:pee|peed|number one|number 1)\b/i.test(text);
  if (hasPoo && hasPee) return 'both';
  if (hasPoo) return 'poo';
  if (hasPee) return 'pee';
  return undefined;
}

// ============================================================================
// Main parser
// ============================================================================

function containsKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => {
    // For multi-word keywords, check as substring
    if (kw.includes(' ') || kw.includes('-')) {
      return lower.includes(kw);
    }
    // For single words, check word boundary
    return new RegExp(`\\b${kw}\\b`, 'i').test(text);
  });
}

/**
 * Parse a voice transcript into a structured event payload.
 * Returns a ParsedVoiceEvent ready to send to POST /voice/log.
 */
export function parseVoiceTranscript(transcript: string): ParsedVoiceEvent {
  const text = transcript.trim();
  const lower = text.toLowerCase();

  // Priority order matters — more specific first
  // Tummy time before general keywords (contains "tummy" which could match other things)
  if (containsKeyword(lower, TUMMY_KEYWORDS)) {
    const duration = extractDuration(text);
    return {
      event_type: 'tummy_time',
      confidence: duration ? 'high' : 'medium',
      transcript: text,
      duration_minutes: duration,
    };
  }

  // Bath
  if (containsKeyword(lower, BATH_KEYWORDS)) {
    return {
      event_type: 'bath',
      confidence: 'medium',
      transcript: text,
    };
  }

  // Supplement — check before feeding (both could mention "gave")
  if (containsKeyword(lower, SUPPLEMENT_KEYWORDS)) {
    const name = detectSupplementName(text);
    return {
      event_type: 'supplement',
      confidence: name !== 'other' ? 'high' : 'medium',
      transcript: text,
      supplement_name: name,
    };
  }

  // Pumping — check before feeding (both involve amounts)
  if (containsKeyword(lower, PUMPING_KEYWORDS)) {
    const amount = extractAmount(text);
    const duration = extractDuration(text);
    return {
      event_type: 'pumping',
      confidence: amount || duration ? 'high' : 'medium',
      transcript: text,
      amount_ml: amount,
      duration_minutes: duration,
    };
  }

  // Sleep
  if (containsKeyword(lower, SLEEP_KEYWORDS)) {
    const action = detectSleepAction(text);
    return {
      event_type: 'sleep',
      confidence: 'high',
      transcript: text,
      sleep_action: action,
    };
  }

  // Potty — check before diaper (both could mention pee/poo)
  if (containsKeyword(lower, POTTY_KEYWORDS)) {
    const result = detectPottyResult(text);
    const pottyType = detectPottyType(text);
    return {
      event_type: 'potty',
      confidence: 'medium',
      transcript: text,
      potty_result: result,
      potty_type: pottyType,
    };
  }

  // Diaper
  if (containsKeyword(lower, DIAPER_KEYWORDS)) {
    const diaperType = detectDiaperType(text);
    return {
      event_type: 'diaper',
      confidence: diaperType !== 'mixed' ? 'high' : 'medium',
      transcript: text,
      diaper_type: diaperType,
    };
  }

  // Feeding (last of the common event types)
  if (containsKeyword(lower, FEEDING_KEYWORDS)) {
    const feedType = detectFeedType(text);
    const amount = extractAmount(text);
    const duration = extractDuration(text);
    const hasDetails = feedType || amount || duration;
    return {
      event_type: 'feeding',
      confidence: hasDetails ? 'high' : 'medium',
      transcript: text,
      feed_type: feedType,
      amount_ml: amount,
      duration_minutes: duration,
    };
  }

  // Fallback — couldn't parse, return as feeding note with low confidence
  return {
    event_type: 'feeding',
    confidence: 'low',
    transcript: text,
    notes: text,
  };
}
