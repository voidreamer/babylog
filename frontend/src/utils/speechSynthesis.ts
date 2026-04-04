// ============================================================================
// Speech Synthesis Utility
// ============================================================================
// Provides text-to-speech confirmation for voice commands.

import { ParsedCommand } from './voiceCommands';

/**
 * Speak the given text aloud using the Web Speech Synthesis API.
 * Resolves immediately if the API is unavailable.
 */
export function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }

    // Cancel any in-progress speech before starting new
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Generate a natural-language confirmation string for a parsed command.
 */
export function getConfirmationText(command: ParsedCommand): string {
  const { action, params } = command;

  switch (action) {
    case 'feeding': {
      const parts: string[] = ['Logged'];
      if (params.amount_oz) {
        parts.push(`${params.amount_oz} ounce`);
      } else if (params.amount_ml) {
        parts.push(`${params.amount_ml} ml`);
      }
      if (params.type === 'breast') {
        parts.push('breast feeding');
      } else if (params.type === 'formula') {
        parts.push('formula feeding');
      } else if (params.type === 'bottle') {
        parts.push('bottle feeding');
      } else if (params.type === 'breastmilk_bottle') {
        parts.push('breastmilk bottle feeding');
      } else {
        parts.push('feeding');
      }
      if (params.duration_minutes) {
        parts.push(`for ${params.duration_minutes} minutes`);
      }
      return parts.join(' ');
    }

    case 'diaper': {
      if (params.type === 'poo') return 'Logged dirty diaper change';
      if (params.type === 'pee') return 'Logged wet diaper change';
      if (params.type === 'mixed') return 'Logged mixed diaper change';
      return 'Logged diaper change';
    }

    case 'sleep_start':
      return 'Started sleep tracking';

    case 'sleep_end':
      return 'Ended sleep tracking. Baby is awake!';

    case 'tummy_time': {
      if (params.duration_minutes) {
        return `Logged ${params.duration_minutes} minute tummy time`;
      }
      return 'Logged tummy time';
    }

    case 'bath':
      return 'Logged bath time';

    case 'status':
      return 'Here is your daily summary';

    default:
      return 'Command completed';
  }
}
