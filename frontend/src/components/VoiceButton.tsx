import { useState, useEffect, useCallback } from 'react';
import { Mic, X, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { parseVoiceTranscript, ParsedVoiceEvent } from '../utils/voiceParser';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import './VoiceButton.css';

type VoiceState = 'idle' | 'listening' | 'confirm';

interface Props {
  onEventLogged?: () => void;
}

export default function VoiceButton({ onEventLogged }: Props) {
  const { t } = useTranslation('dashboard');
  const { selectedBaby } = useBaby();
  const { isListening, transcript, error, isSupported, startListening, stopListening, reset } = useVoiceInput();
  const [state, setState] = useState<VoiceState>('idle');
  const [parsed, setParsed] = useState<ParsedVoiceEvent | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Don't render if voice not supported or no baby selected
  if (!isSupported || !selectedBaby) return null;

  // When transcript arrives, parse it and show confirmation
  useEffect(() => {
    if (transcript) {
      const result = parseVoiceTranscript(transcript);
      setParsed(result);
      setState('confirm');
    }
  }, [transcript]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error(t('voice.error', { defaultValue: 'Voice input error' }), {
        description: error,
      });
      setState('idle');
    }
  }, [error, t]);

  const handleMicPress = useCallback(async () => {
    if (state === 'listening') {
      await stopListening();
    } else {
      reset();
      setParsed(null);
      setState('listening');
      await startListening();
    }
  }, [state, startListening, stopListening, reset]);

  const handleConfirm = useCallback(async () => {
    if (!parsed || !selectedBaby) return;
    setSubmitting(true);
    try {
      const result = await api.logVoiceEvent({
        baby_id: selectedBaby.id,
        event_type: parsed.event_type,
        transcript: parsed.transcript,
        notes: parsed.notes,
        feed_type: parsed.feed_type,
        amount_ml: parsed.amount_ml,
        duration_minutes: parsed.duration_minutes,
        diaper_type: parsed.diaper_type,
        sleep_action: parsed.sleep_action,
        potty_result: parsed.potty_result,
        potty_type: parsed.potty_type,
        supplement_name: parsed.supplement_name,
        dosage: parsed.dosage,
      });

      // Haptic feedback on native
      if (Capacitor.isNativePlatform()) {
        try {
          const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
          await Haptics.impact({ style: ImpactStyle.Medium });
        } catch {
          // Haptics not available
        }
      }

      toast.success(t('voice.logged', { defaultValue: 'Logged' }), {
        description: result.summary,
      });
      onEventLogged?.();
    } catch (e) {
      toast.error(t('voice.failedToLog', { defaultValue: 'Failed to log event' }), {
        description: (e as Error).message,
      });
    } finally {
      setSubmitting(false);
      setState('idle');
      setParsed(null);
      reset();
    }
  }, [parsed, selectedBaby, onEventLogged, reset, t]);

  const handleCancel = useCallback(() => {
    setState('idle');
    setParsed(null);
    reset();
  }, [reset]);

  const formatSummary = (p: ParsedVoiceEvent): string => {
    const parts: string[] = [];
    const typeLabel = p.event_type.replace('_', ' ');
    parts.push(typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1));

    if (p.feed_type) parts.push(`(${p.feed_type})`);
    if (p.diaper_type) parts.push(`(${p.diaper_type})`);
    if (p.sleep_action) parts.push(`- ${p.sleep_action}`);
    if (p.amount_ml) parts.push(`${p.amount_ml}ml`);
    if (p.duration_minutes) parts.push(`${p.duration_minutes}min`);
    if (p.supplement_name) parts.push(`(${p.supplement_name.replace('_', ' ')})`);

    return parts.join(' ');
  };

  return (
    <>
      {/* Confirmation card overlay */}
      {state === 'confirm' && parsed && (
        <div className="voice-confirm-overlay" onClick={handleCancel}>
          <div className="voice-confirm-card" onClick={(e) => e.stopPropagation()}>
            <p className="voice-confirm-transcript">"{parsed.transcript}"</p>
            <p className="voice-confirm-summary">{formatSummary(parsed)}</p>
            {parsed.confidence === 'low' && (
              <p className="voice-confirm-warning">
                {t('voice.lowConfidence', { defaultValue: "Couldn't parse clearly — will log as note" })}
              </p>
            )}
            <div className="voice-confirm-actions">
              <button
                className="voice-confirm-btn voice-confirm-cancel"
                onClick={handleCancel}
                disabled={submitting}
              >
                <X size={18} />
              </button>
              <button
                className="voice-confirm-btn voice-confirm-ok"
                onClick={handleConfirm}
                disabled={submitting}
              >
                <Check size={18} />
                {submitting
                  ? t('voice.logging', { defaultValue: 'Logging...' })
                  : t('voice.confirm', { defaultValue: 'Confirm' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating mic button */}
      <button
        className={`voice-fab ${state === 'listening' ? 'voice-fab--listening' : ''}`}
        onClick={handleMicPress}
        aria-label={state === 'listening'
          ? t('voice.stopListening', { defaultValue: 'Stop listening' })
          : t('voice.startListening', { defaultValue: 'Start voice input' })}
      >
        <Mic size={24} />
        {state === 'listening' && <span className="voice-fab-pulse" />}
      </button>
    </>
  );
}
