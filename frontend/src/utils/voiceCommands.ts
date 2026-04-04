// ============================================================================
// Voice Command Parser
// ============================================================================
// Parses natural language voice commands into structured baby-tracking actions.
// Supports feeding, diaper, sleep, tummy time, bath, and status commands.

export type CommandAction =
  | 'feeding'
  | 'diaper'
  | 'sleep_start'
  | 'sleep_end'
  | 'tummy_time'
  | 'bath'
  | 'status'
  | 'unknown';

export interface ParsedCommand {
  action: CommandAction;
  params: Record<string, unknown>;
  confidence: number; // 0-1
  rawText: string;
}

// ---------------------------------------------------------------------------
// Unit conversion helpers
// ---------------------------------------------------------------------------

const OZ_TO_ML = 30;

function ozToMl(oz: number): number {
  return Math.round(oz * OZ_TO_ML);
}

// ---------------------------------------------------------------------------
// Pattern matchers
// ---------------------------------------------------------------------------

interface MatchResult {
  action: CommandAction;
  params: Record<string, unknown>;
  confidence: number;
}

function tryParseFeeding(text: string): MatchResult | null {
  const feedingKeywords = [
    'fed', 'feed', 'feeding', 'bottle', 'formula', 'breast',
    'breastfed', 'breastfeeding', 'nursed', 'nursing', 'ate', 'milk',
    'breastmilk', 'breast milk',
  ];

  const hasKeyword = feedingKeywords.some((kw) => text.includes(kw));
  if (!hasKeyword) return null;

  let confidence = 0.5;
  const params: Record<string, unknown> = {};

  // Determine feeding type
  if (/\bbreast\s*milk\b/.test(text) || /\bbreastmilk\b/.test(text)) {
    if (/\bbottle\b/.test(text)) {
      params.type = 'breastmilk_bottle';
      confidence += 0.15;
    } else {
      params.type = 'breast';
      confidence += 0.15;
    }
  } else if (/\bbreast\b|\bnursed?\b|\bnursing\b|\bbreastfe[ed]/.test(text)) {
    params.type = 'breast';
    confidence += 0.15;
  } else if (/\bformula\b/.test(text)) {
    params.type = 'formula';
    confidence += 0.15;
  } else if (/\bbottle\b/.test(text)) {
    params.type = 'bottle';
    confidence += 0.1;
  }

  // Parse amount: "4 ounces", "4oz", "120 ml", "120ml"
  const ozMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:oz|ounces?)\b/);
  if (ozMatch) {
    const oz = parseFloat(ozMatch[1]);
    params.amount_ml = ozToMl(oz);
    params.amount_oz = oz;
    confidence += 0.15;
  }

  const mlMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ml|milliliters?|millilitres?)\b/);
  if (mlMatch) {
    params.amount_ml = Math.round(parseFloat(mlMatch[1]));
    confidence += 0.15;
  }

  // Parse duration: "15 minutes", "10 min"
  const durationMatch = text.match(/(\d+)\s*(?:min(?:utes?)?)\b/);
  if (durationMatch) {
    params.duration_minutes = parseInt(durationMatch[1], 10);
    confidence += 0.1;
  }

  // Parse side for breast feeding: "left", "right", "both"
  if (params.type === 'breast') {
    if (/\bleft\b/.test(text)) {
      params.side = 'left';
      confidence += 0.05;
    } else if (/\bright\b/.test(text)) {
      params.side = 'right';
      confidence += 0.05;
    } else if (/\bboth\b/.test(text)) {
      params.side = 'both';
      confidence += 0.05;
    }
  }

  return { action: 'feeding', params, confidence: Math.min(confidence, 1) };
}

function tryParseDiaper(text: string): MatchResult | null {
  const diaperKeywords = [
    'diaper', 'nappy', 'change', 'changed', 'poo', 'poop', 'poopy',
    'pee', 'wet', 'dirty', 'soiled', 'number one', 'number two',
  ];

  const hasKeyword = diaperKeywords.some((kw) => text.includes(kw));
  if (!hasKeyword) return null;

  // Require at least "diaper" OR a combination of poo/pee + change context
  const hasDiaper = /\bdiaper|nappy\b/.test(text);
  const hasType = /\bpoo|poop|poopy|dirty|soiled|number two|pee|wet|number one\b/.test(text);

  if (!hasDiaper && !hasType) return null;

  let confidence = hasDiaper ? 0.55 : 0.4;
  const params: Record<string, unknown> = {};

  // Determine type
  const hasPoo = /\bpoo|poop|poopy|dirty|soiled|number two\b/.test(text);
  const hasPee = /\bpee|wet|number one\b/.test(text);

  if (hasPoo && hasPee) {
    params.type = 'mixed';
    confidence += 0.2;
  } else if (hasPoo) {
    params.type = 'poo';
    confidence += 0.2;
  } else if (hasPee) {
    params.type = 'pee';
    confidence += 0.2;
  }

  if (hasDiaper && hasType) {
    confidence += 0.1;
  }

  return { action: 'diaper', params, confidence: Math.min(confidence, 1) };
}

function tryParseSleepStart(text: string): MatchResult | null {
  const sleepStartPatterns = [
    /\bstart(?:ed|ing)?\s+(?:a\s+)?(?:sleep|nap|sleeping|napping)\b/,
    /\bbaby\s+(?:is\s+)?(?:sleep|sleeping|napping|asleep|fell\s+asleep)\b/,
    /\bnap\s+time\b/,
    /\bfell\s+asleep\b/,
    /\bgoing\s+to\s+sleep\b/,
    /\bput(?:ting)?\s+(?:baby\s+)?(?:to\s+sleep|down)\b/,
    /\bbed\s*time\b/,
    /\btime\s+to\s+sleep\b/,
  ];

  const matched = sleepStartPatterns.filter((p) => p.test(text));
  if (matched.length === 0) return null;

  const confidence = Math.min(0.6 + matched.length * 0.15, 1);
  return { action: 'sleep_start', params: {}, confidence };
}

function tryParseSleepEnd(text: string): MatchResult | null {
  const sleepEndPatterns = [
    /\bwoke\s+up\b/,
    /\bwake\s+up\b/,
    /\bawake\b/,
    /\bend(?:ed|ing)?\s+(?:a\s+)?(?:sleep|nap)\b/,
    /\bnap\s+(?:is\s+)?over\b/,
    /\bstop(?:ped)?\s+sleep/,
    /\bbaby\s+(?:is\s+)?(?:awake|up)\b/,
    /\bgot\s+up\b/,
    /\bfinished?\s+(?:sleep|nap)/,
  ];

  const matched = sleepEndPatterns.filter((p) => p.test(text));
  if (matched.length === 0) return null;

  const confidence = Math.min(0.6 + matched.length * 0.15, 1);
  return { action: 'sleep_end', params: {}, confidence };
}

function tryParseTummyTime(text: string): MatchResult | null {
  const tummyKeywords = /\btummy\s*time\b|\btummy\b/;

  if (!tummyKeywords.test(text)) return null;

  let confidence = 0.6;
  const params: Record<string, unknown> = {};

  // Parse duration
  const durationMatch = text.match(/(\d+)\s*(?:min(?:utes?)?)\b/);
  if (durationMatch) {
    params.duration_minutes = parseInt(durationMatch[1], 10);
    confidence += 0.2;
  }

  if (/\bstart/.test(text)) {
    confidence += 0.1;
  }

  return { action: 'tummy_time', params, confidence: Math.min(confidence, 1) };
}

function tryParseBath(text: string): MatchResult | null {
  const bathPatterns = [
    /\bbath\s*time\b/,
    /\bgave\s+(?:a\s+)?bath\b/,
    /\bbath(?:ed)?\b/,
    /\bwash(?:ed)?\b/,
    /\bbathe[ds]?\b/,
    /\bshower\b/,
  ];

  const matched = bathPatterns.filter((p) => p.test(text));
  if (matched.length === 0) return null;

  const confidence = Math.min(0.55 + matched.length * 0.15, 1);
  return { action: 'bath', params: {}, confidence };
}

function tryParseStatus(text: string): MatchResult | null {
  const statusPatterns = [
    /\bstatus\b/,
    /\bsummary\b/,
    /\bhow(?:'s| is)\s+(?:the|today|baby)\b/,
    /\bwhat(?:'s| has)?\s+happened?\b/,
    /\btoday(?:'s)?\s+(?:summary|status|log|recap)\b/,
    /\brecap\b/,
    /\bwhat\s+did\s+(?:we|the\s+baby)\b/,
    /\bhow\s+(?:are|were)\s+things\b/,
  ];

  const matched = statusPatterns.filter((p) => p.test(text));
  if (matched.length === 0) return null;

  const confidence = Math.min(0.6 + matched.length * 0.15, 1);
  return { action: 'status', params: {}, confidence };
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseVoiceCommand(text: string): ParsedCommand {
  const normalized = text.toLowerCase().trim();

  if (!normalized) {
    return { action: 'unknown', params: {}, confidence: 0, rawText: text };
  }

  // Try all parsers and pick the one with highest confidence.
  // Sleep end must be checked before sleep start because "woke up" could
  // loosely match start patterns if we checked start first.
  const candidates: (MatchResult | null)[] = [
    tryParseSleepEnd(normalized),
    tryParseSleepStart(normalized),
    tryParseFeeding(normalized),
    tryParseDiaper(normalized),
    tryParseTummyTime(normalized),
    tryParseBath(normalized),
    tryParseStatus(normalized),
  ];

  const validCandidates = candidates.filter(
    (c): c is MatchResult => c !== null
  );

  if (validCandidates.length === 0) {
    return { action: 'unknown', params: {}, confidence: 0, rawText: text };
  }

  // Sort by confidence descending, pick the best
  validCandidates.sort((a, b) => b.confidence - a.confidence);
  const best = validCandidates[0];

  return {
    action: best.action,
    params: best.params,
    confidence: best.confidence,
    rawText: text,
  };
}

// ---------------------------------------------------------------------------
// Human-readable description of a parsed command (for confirmation UI)
// ---------------------------------------------------------------------------

export function describeCommand(command: ParsedCommand): string {
  const { action, params } = command;

  switch (action) {
    case 'feeding': {
      const parts: string[] = [];
      if (params.amount_oz) {
        parts.push(`${params.amount_oz} oz`);
      } else if (params.amount_ml) {
        parts.push(`${params.amount_ml} ml`);
      }
      if (params.type === 'breast') {
        parts.push('breast feeding');
        if (params.side) parts.push(`(${params.side as string} side)`);
      } else if (params.type === 'formula') {
        parts.push('formula feeding');
      } else if (params.type === 'bottle') {
        parts.push('bottle feeding');
      } else if (params.type === 'breastmilk_bottle') {
        parts.push('breastmilk bottle');
      } else {
        parts.push('feeding');
      }
      if (params.duration_minutes) {
        parts.push(`for ${params.duration_minutes} min`);
      }
      return parts.join(' ');
    }

    case 'diaper': {
      if (params.type === 'poo') return 'poo diaper change';
      if (params.type === 'pee') return 'wet diaper change';
      if (params.type === 'mixed') return 'mixed diaper change';
      return 'diaper change';
    }

    case 'sleep_start':
      return 'start sleep tracking';

    case 'sleep_end':
      return 'end sleep tracking';

    case 'tummy_time': {
      if (params.duration_minutes) {
        return `${params.duration_minutes} minute tummy time`;
      }
      return 'tummy time';
    }

    case 'bath':
      return 'bath';

    case 'status':
      return 'daily summary';

    default:
      return 'unrecognized command';
  }
}
