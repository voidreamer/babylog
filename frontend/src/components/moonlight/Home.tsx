/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useBaby } from '../../hooks/useBaby';
import { api } from '../../api/client';
import { hapticImpact, hapticNotification, hapticSelection } from '../../utils/haptics';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { Orb } from './Orb';
import { BabyFace } from './BabyFace';
import { Ribbon } from './Ribbon';
import { SectionLabel } from './UI';
import { Icon } from './Icon';
import { HoldButton } from './HoldButton';
import { bumpUsage, getRankedActions, type SecondaryKind } from './usage';
import { SECONDARY_META, getApplicableSecondaryActions } from './secondaryActions';
import { calculateAgeInMonths } from '../../utils/ageUtils';
import type { OrbMode, TimelineEvent } from './types';

const FeedingModal = lazy(() => import('../FeedingModal'));
const DiaperModal = lazy(() => import('../DiaperModal'));
const SleepModal = lazy(() => import('../SleepModal'));
const PumpingModal = lazy(() => import('../PumpingModal'));
const BubsenseChat = lazy(() => import('./BubsenseChat'));
const UpgradeDialog = lazy(() => import('../UpgradeDialog'));
const TummyTimeModal = lazy(() => import('../TummyTimeModal'));
const PottyModal = lazy(() => import('../PottyModal'));
const BathModal = lazy(() => import('../BathModal'));
const SupplementModal = lazy(() => import('../SupplementModal'));
const SolidModal = lazy(() => import('../SolidModal'));

type ModalKind =
  | 'feeding'
  | 'diaper'
  | 'sleep'
  | 'pumping'
  | 'tummy'
  | 'potty'
  | 'bath'
  | 'supplement'
  | 'solid'
  | null;

const SLEEP_ACCENT = '#8BA5C4';

function parseUTC(time: string): Date {
  return new Date(time.endsWith('Z') ? time : time + 'Z');
}

/** Inline quick-log chip. stopPropagation so the tap doesn't trigger the parent HoldButton. */
function Chip({
  onTap,
  disabled,
  children,
  ariaLabel,
  variant = 'ghost',
}: {
  onTap: () => void;
  disabled?: boolean;
  children: ReactNode;
  ariaLabel: string;
  variant?: 'solid' | 'ghost';
}) {
  const stop = (e: PointerEvent<HTMLButtonElement>) => e.stopPropagation();
  const styles: CSSProperties =
    variant === 'solid'
      ? {
          background: 'rgba(10, 7, 6, 0.18)',
          color: 'inherit',
          border: 'none',
        }
      : {
          background: 'rgba(255, 255, 255, 0.10)',
          color: 'inherit',
          border: '0.5px solid rgba(255, 255, 255, 0.18)',
        };
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={stop}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onTap();
      }}
      style={{
        padding: '8px 12px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        ...styles,
      }}
    >
      {children}
    </button>
  );
}

function minutesSince(time: string): number {
  return Math.max(0, Math.round((Date.now() - parseUTC(time).getTime()) / 60000));
}

function greetingKey(hour: number): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  if (hour < 12) return 'goodMorning';
  if (hour < 17) return 'goodAfternoon';
  return 'goodEvening';
}

/** Orb mode/urgency signaled by time since last feed (readonly signal; no prediction). */
function deriveOrbState(dashboard: any): { mode: OrbMode; urgency: number } {
  if (dashboard?.current_sleep?.start_time) return { mode: 'sleepy', urgency: 0.15 };
  const lastFeed = dashboard?.last_feeding?.time;
  if (!lastFeed) return { mode: 'calm', urgency: 0.3 };
  const mins = minutesSince(lastFeed);
  if (mins > 210) return { mode: 'hungry', urgency: 0.85 };
  if (mins > 150) return { mode: 'alert', urgency: 0.6 };
  if (mins < 30) return { mode: 'content', urgency: 0.25 };
  return { mode: 'calm', urgency: 0.35 };
}

/** Build a 24h Ribbon from the dashboard's last_* fields (clipped to today local). */
function buildRibbonEvents(dashboard: any): { events: TimelineEvent[]; nowFrac: number } {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const nowFrac = (now.getTime() - dayStart.getTime()) / (24 * 3600 * 1000);
  const events: TimelineEvent[] = [];

  const addEvt = (
    time: string | undefined,
    type: TimelineEvent['type'],
    endTime?: string,
    durationMin?: number,
  ) => {
    if (!time) return;
    const start = parseUTC(time);
    if (start < dayStart || start > now) return;
    const tHours = (start.getTime() - dayStart.getTime()) / 3600000;
    let durHours = 0.2;
    if (endTime) {
      const end = parseUTC(endTime);
      durHours = Math.max(0.2, (end.getTime() - start.getTime()) / 3600000);
    } else if (durationMin) {
      durHours = Math.max(0.2, durationMin / 60);
    }
    events.push({ t: tHours, duration: durHours, type });
  };

  addEvt(
    dashboard?.last_feeding?.time,
    'feed',
    undefined,
    dashboard?.last_feeding?.duration_minutes,
  );
  addEvt(dashboard?.last_diaper?.time, 'diaper');
  addEvt(
    dashboard?.last_sleep?.start_time,
    'sleep',
    dashboard?.last_sleep?.end_time,
    dashboard?.last_sleep?.duration_minutes,
  );
  if (dashboard?.current_sleep?.start_time) {
    addEvt(
      dashboard.current_sleep.start_time,
      'sleep',
      undefined,
      Math.max(5, minutesSince(dashboard.current_sleep.start_time)),
    );
  }

  return { events, nowFrac };
}

/**
 * Moonlight Home — quick-actions wired. Phase 2b.
 *
 * Renders greeting · orb (mode from last-feed gap) · big "last feed" headline ·
 * hero + secondary quick actions · 24h ribbon · soft placeholder card.
 *
 * Quick actions open the existing modals (FeedingModal, DiaperModal, SleepModal,
 * PumpingModal); on save we re-fetch the dashboard so the orb / headline / ribbon
 * reflect the new event immediately.
 */
type MoonlightHomeProps = { isPremium?: boolean };

export default function MoonlightHome({ isPremium = false }: MoonlightHomeProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const { selectedBaby } = useBaby();
  const cacheKey = selectedBaby ? `heybub_dashboard_${selectedBaby.id}` : '';

  const [dashboard, setDashboard] = useState<any>(() => {
    if (!cacheKey) return null;
    try {
      const raw = localStorage.getItem(cacheKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [showBubsense, setShowBubsense] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const load = useCallback(async () => {
    if (!selectedBaby) return;
    try {
      const localDate = format(new Date(), 'yyyy-MM-dd');
      const tzOffset = new Date().getTimezoneOffset();
      const data = await api.getDashboard(selectedBaby.id, localDate, tzOffset);
      setDashboard(data);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        /* quota */
      }
    } catch {
      /* keep cached; silent */
    }
  }, [selectedBaby, cacheKey]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  const openModal = useCallback((kind: ModalKind) => {
    hapticSelection();
    setActiveModal(kind);
  }, []);
  const closeModal = useCallback(() => setActiveModal(null), []);
  /**
   * Saved-from-modal handler. Bumps usage for tracked secondary kinds so the
   * dynamic-layout ranking updates immediately; feed/sleep aren't tracked
   * (they're fixed heroes).
   */
  const onModalSave = useCallback(
    (kind: ModalKind) => {
      // Map the ModalKind back to a SecondaryKind for usage tracking.
      // feed/sleep are fixed heroes and aren't tracked.
      const secondary: SecondaryKind | null =
        kind === 'pumping'
          ? 'pump'
          : kind === 'diaper' ||
              kind === 'tummy' ||
              kind === 'potty' ||
              kind === 'bath' ||
              kind === 'supplement' ||
              kind === 'solid'
            ? kind
            : null;
      if (secondary) bumpUsage(secondary);
      setActiveModal(null);
      void load();
    },
    [load],
  );

  // Quick-log handlers mirror the production widgets' api payloads so offline
  // sync + cache invalidation remain identical.
  const [savingChip, setSavingChip] = useState<string | null>(null);

  const quickLogFeed = useCallback(
    async (type: 'breast' | 'formula' | 'bottle', amountMl: number | null) => {
      if (!selectedBaby) return;
      setSavingChip(`feed:${type}`);
      try {
        await api.createFeeding({
          baby_id: selectedBaby.id,
          time: new Date().toISOString(),
          type,
          duration_minutes: null,
          amount_ml: amountMl,
          notes: null,
        });
        hapticNotification();
        const label =
          type === 'breast'
            ? t('dashboard:feeding.breast')
            : type === 'formula'
              ? t('dashboard:feeding.formula')
              : t('dashboard:feeding.breastBottle');
        toast.success(t('dashboard:feeding.quickLogged', { type: label }));
        await load();
      } catch {
        toast.error(t('dashboard:toast_failedToSaveFeeding'));
      } finally {
        setSavingChip(null);
      }
    },
    [selectedBaby, load, t],
  );

  const quickLogDiaper = useCallback(
    async (type: 'pee' | 'poo' | 'mixed') => {
      if (!selectedBaby) return;
      setSavingChip(`diaper:${type}`);
      try {
        await api.createDiaper({
          baby_id: selectedBaby.id,
          time: new Date().toISOString(),
          type,
          poo_color: null,
          poo_consistency: null,
          poo_amount: null,
          notes: null,
        });
        hapticNotification();
        const label =
          type === 'pee'
            ? t('dashboard:diaper.pee')
            : type === 'poo'
              ? t('dashboard:diaper.poo')
              : t('dashboard:diaper.both');
        toast.success(t('dashboard:diaper.diaperLogged', { type: label }));
        bumpUsage('diaper');
        await load();
      } catch {
        toast.error(t('dashboard:toast_failedToLogDiaper'));
      } finally {
        setSavingChip(null);
      }
    },
    [selectedBaby, load, t],
  );

  const quickStartSleep = useCallback(async () => {
    if (!selectedBaby) return;
    setSavingChip('sleep:start');
    try {
      await api.createSleep({
        baby_id: selectedBaby.id,
        start_time: new Date().toISOString(),
        end_time: null,
        notes: null,
      });
      hapticImpact();
      toast.success(t('dashboard:toast_sleepStarted'));
      await load();
    } catch {
      toast.error(t('dashboard:toast_failedToStartSleep'));
    } finally {
      setSavingChip(null);
    }
  }, [selectedBaby, load, t]);

  const quickWakeUp = useCallback(async () => {
    const current = dashboard?.current_sleep;
    if (!current?.id) return;
    setSavingChip('sleep:end');
    try {
      await api.endSleep(current.id);
      hapticNotification();
      toast.success(t('dashboard:toast_babyIsAwake'));
      await load();
    } catch {
      toast.error(t('dashboard:toast_failedToEndSleep'));
    } finally {
      setSavingChip(null);
    }
  }, [dashboard, load, t]);

  const quickLogPumpTimerless = useCallback(async () => {
    if (!selectedBaby) return;
    setSavingChip('pump:60');
    try {
      await api.createPumping({
        baby_id: selectedBaby.id,
        time: new Date().toISOString(),
        duration_minutes: null,
        amount_ml: 60,
        notes: null,
      });
      hapticNotification();
      toast.success(t('dashboard:pumping.quickLogged', { amount: '60 ml' }));
      bumpUsage('pump');
      await load();
    } catch {
      toast.error(t('dashboard:toast_failedToSavePumping'));
    } finally {
      setSavingChip(null);
    }
  }, [selectedBaby, load, t]);

  // Derive the ordered list of secondary actions for this baby's age, then
  // rank by recent usage. Top 2 render as "large" tiles; rest render compact.
  const ageMonths = selectedBaby?.birth_date
    ? calculateAgeInMonths(selectedBaby.birth_date)
    : null;
  const rankedSecondaries = useMemo(() => {
    const applicable = getApplicableSecondaryActions(ageMonths);
    return getRankedActions(applicable);
  }, [ageMonths, dashboard]);
  const largeSecondaries = rankedSecondaries.slice(0, 2);
  const compactSecondaries = rankedSecondaries.slice(2);

  // Map secondary kind → ModalKind (pump → pumping, else identical).
  const modalKindFor = (k: SecondaryKind): ModalKind =>
    k === 'pump' ? 'pumping' : k;

  // Map kind → rendered icon. Kept local so the registry stays tree-shakeable.
  const iconFor = (k: SecondaryKind) => {
    switch (k) {
      case 'diaper':
        return <Icon.Diaper />;
      case 'pump':
        return <Icon.Plus />;
      case 'tummy':
        return <Icon.Play />;
      case 'potty':
        return <Icon.Check />;
      case 'bath':
        return <Icon.Home />;
      case 'supplement':
        return <Icon.Plus />;
      case 'solid':
        return <Icon.Feed />;
    }
  };

  const largeTileStyle: CSSProperties = {
    padding: '12px',
    borderRadius: 18,
    background: 'var(--ml-surface)',
    color: 'var(--ml-text)',
    border: '0.5px solid var(--ml-line)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  };

  const compactTileStyle: CSSProperties = {
    padding: '12px 8px',
    borderRadius: 14,
    background: 'var(--ml-surface)',
    color: 'var(--ml-text)',
    border: '0.5px solid var(--ml-line)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };

  const renderLargeTile = (kind: SecondaryKind) => {
    const meta = SECONDARY_META[kind];
    const label = t(meta.labelKey);
    const IconNode = iconFor(kind);

    if (kind === 'diaper') {
      return (
        <HoldButton
          key={kind}
          ariaLabel={`${label}. ${t('common:moonlight.holdForOptions')}`}
          onHold={() => openModal('diaper')}
          borderRadius={18}
          style={largeTileStyle}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ color: meta.color }}>{IconNode}</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Chip
              variant="ghost"
              disabled={savingChip !== null}
              onTap={() => quickLogDiaper('pee')}
              ariaLabel={t('dashboard:diaper.pee')}
            >
              {savingChip === 'diaper:pee' ? '…' : t('dashboard:diaper.pee')}
            </Chip>
            <Chip
              variant="ghost"
              disabled={savingChip !== null}
              onTap={() => quickLogDiaper('poo')}
              ariaLabel={t('dashboard:diaper.poo')}
            >
              {savingChip === 'diaper:poo' ? '…' : t('dashboard:diaper.poo')}
            </Chip>
            <Chip
              variant="ghost"
              disabled={savingChip !== null}
              onTap={() => quickLogDiaper('mixed')}
              ariaLabel={t('dashboard:diaper.both')}
            >
              {savingChip === 'diaper:mixed' ? '…' : t('dashboard:diaper.both')}
            </Chip>
          </div>
        </HoldButton>
      );
    }

    if (kind === 'pump') {
      return (
        <HoldButton
          key={kind}
          ariaLabel={`${label}. ${t('common:moonlight.holdForOptions')}`}
          onHold={() => openModal('pumping')}
          borderRadius={18}
          style={largeTileStyle}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ color: meta.color }}>{IconNode}</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Chip
              variant="ghost"
              disabled={savingChip !== null}
              onTap={quickLogPumpTimerless}
              ariaLabel="60 ml"
            >
              {savingChip === 'pump:60' ? '…' : '60 ml'}
            </Chip>
          </div>
        </HoldButton>
      );
    }

    // No chips → plain tap-to-modal button (hold gesture not meaningful here).
    return (
      <button
        key={kind}
        type="button"
        onClick={() => openModal(modalKindFor(kind))}
        aria-label={label}
        style={{ ...largeTileStyle, cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: meta.color }}>{IconNode}</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ml-text-3)' }}>
          {t('dashboard:tapToLog')}
        </div>
      </button>
    );
  };

  const renderCompactTile = (kind: SecondaryKind) => {
    const meta = SECONDARY_META[kind];
    const label = t(meta.labelKey);
    return (
      <button
        key={kind}
        type="button"
        onClick={() => openModal(modalKindFor(kind))}
        aria-label={label}
        style={compactTileStyle}
      >
        <div style={{ color: meta.color }}>{iconFor(kind)}</div>
        <div style={{ fontSize: 11, fontWeight: 500, textAlign: 'center' }}>{label}</div>
      </button>
    );
  };

  const now = new Date();
  const derivedOrb = useMemo(() => deriveOrbState(dashboard), [dashboard]);
  const ribbon = useMemo(() => buildRibbonEvents(dashboard), [dashboard]);

  // Bubsense voice — orb long-press starts listening. Voice state overrides
  // the orb's mood so the user gets immediate visual feedback while the mic
  // is open, and so the orb "answers back" on confirmation.
  const voice = useVoiceAssistant(selectedBaby?.id ?? null, () => {
    void load();
  });
  const voiceActive = voice.state !== 'idle';
  const orb = useMemo(() => {
    switch (voice.state) {
      case 'listening':
        return { mode: 'alert' as OrbMode, urgency: 0.85 };
      case 'processing':
        return { mode: 'alert' as OrbMode, urgency: 0.65 };
      case 'confirming':
        return { mode: 'alert' as OrbMode, urgency: 0.5 };
      case 'executing':
      case 'speaking':
        return { mode: 'content' as OrbMode, urgency: 0.4 };
      case 'error':
        return { mode: 'hungry' as OrbMode, urgency: 0.55 };
      default:
        return derivedOrb;
    }
  }, [voice.state, derivedOrb]);
  const lastFeed = dashboard?.last_feeding?.time
    ? minutesSince(dashboard.last_feeding.time)
    : null;

  const hours = lastFeed != null ? Math.floor(lastFeed / 60) : null;
  const mins = lastFeed != null ? lastFeed % 60 : null;

  return (
    <div
      className="ml-home"
      style={{
        minHeight: '100%',
        padding: '16px 20px 8px',
        color: 'var(--ml-text)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="mono">{format(now, 'h:mm a').toLowerCase()}</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginTop: 2 }}>
            {t(`dashboard:greeting.${greetingKey(now.getHours())}`)}
            {selectedBaby?.name ? `, ${selectedBaby.name}` : ''}.
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 0 0', textAlign: 'center' }}>
        <Orb
          size={170}
          mode={orb.mode}
          urgency={orb.urgency}
          onLongPress={
            voice.isSupported && selectedBaby
              ? () => {
                  hapticImpact();
                  void voice.startListening();
                }
              : undefined
          }
          onPress={voiceActive ? voice.cancel : undefined}
          ariaLabel={
            voiceActive
              ? t('common:voice.tapToCancel', { defaultValue: 'Tap to cancel voice' })
              : t('common:voice.holdToSpeak', { defaultValue: 'Hold to speak' })
          }
          iconSrc={
            !voiceActive && orb.mode === 'sleepy'
              ? `${import.meta.env.BASE_URL}icons/sleep2.png`
              : undefined
          }
          iconNode={
            !voiceActive && orb.mode !== 'sleepy' ? (
              <div style={{ color: '#2a1f1a', width: '100%', height: '100%' }}>
                <BabyFace mood={orb.mode as 'calm' | 'content' | 'alert' | 'hungry'} />
              </div>
            ) : undefined
          }
          iconScale={orb.mode === 'sleepy' ? 0.55 : 0.5}
        />
      </div>

      {/* Voice status card — only rendered while bubsense is active. */}
      {voiceActive && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: 14,
            padding: '12px 14px',
            borderRadius: 16,
            background: 'var(--ml-surface)',
            border: '0.5px solid color-mix(in srgb, var(--ml-accent) 35%, var(--ml-line))',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--ml-text)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="mono"
              style={{
                color: 'var(--ml-accent)',
                fontSize: 9,
                marginBottom: 4,
              }}
            >
              {voice.state === 'listening'
                ? t('common:voice.listening', { defaultValue: 'listening' })
                : voice.state === 'processing'
                  ? t('common:voice.thinking', { defaultValue: 'thinking' })
                  : voice.state === 'confirming'
                    ? t('common:voice.confirming', { defaultValue: 'confirm' })
                    : voice.state === 'executing'
                      ? t('common:voice.saving', { defaultValue: 'saving' })
                      : voice.state === 'speaking'
                        ? t('common:voice.done', { defaultValue: 'done' })
                        : t('common:voice.error', { defaultValue: 'error' })}
            </div>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.35,
                color:
                  voice.state === 'error' ? '#D98571' : 'var(--ml-text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {voice.state === 'listening'
                ? voice.transcript ||
                  t('common:voice.listeningHint', {
                    defaultValue: 'I\u2019m listening\u2026',
                  })
                : voice.state === 'error'
                  ? voice.error || t('common:voice.errorGeneric', { defaultValue: 'Try again.' })
                  : voice.displayText || voice.transcript}
              {voice.state === 'listening' && (
                <span style={{ marginLeft: 6 }}>
                  <span className="bub-dot" />
                  <span className="bub-dot" />
                  <span className="bub-dot" />
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={voice.cancel}
            aria-label={t('common:cancel')}
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              border: '0.5px solid var(--ml-line)',
              background: 'transparent',
              color: 'var(--ml-text-2)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >
            <Icon.Close />
          </button>
        </div>
      )}

      <div style={{ padding: '16px 0 0', textAlign: 'center' }}>
        <div className="mono" style={{ color: 'var(--ml-accent)' }}>
          last feed
        </div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 300,
            marginTop: 6,
            letterSpacing: -1,
            lineHeight: 1.02,
          }}
        >
          {lastFeed == null ? (
            <span className="serif italic" style={{ color: 'var(--ml-accent)' }}>
              no feeds yet
            </span>
          ) : hours! > 0 ? (
            <>
              <span className="serif italic" style={{ color: 'var(--ml-accent)' }}>
                {hours}h {mins}m
              </span>
              {' '}ago
            </>
          ) : (
            <>
              <span className="serif italic" style={{ color: 'var(--ml-accent)' }}>
                {mins} min
              </span>
              {' '}ago
            </>
          )}
        </div>
        {dashboard?.current_sleep?.start_time && (
          <div style={{ fontSize: 13, color: 'var(--ml-text-2)', marginTop: 6 }}>
            sleeping · started {minutesSince(dashboard.current_sleep.start_time)} min ago
          </div>
        )}
      </div>

      {selectedBaby && (
        <button
          type="button"
          onClick={() => {
            hapticSelection();
            setShowBubsense(true);
          }}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '12px 16px',
            borderRadius: 16,
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--ml-accent) 14%, transparent), color-mix(in srgb, var(--ml-accent) 4%, transparent))',
            border: '0.5px solid color-mix(in srgb, var(--ml-accent) 35%, transparent)',
            color: 'var(--ml-text)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            textAlign: 'left',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="mono"
              style={{ color: 'var(--ml-accent)', marginBottom: 2 }}
            >
              {isPremium
                ? t('dashboard:bubsense.askBubsense', { defaultValue: 'ask bubsense' })
                : t('dashboard:bubsense.premium', { defaultValue: 'premium' })}
            </div>
            <div
              className="serif italic"
              style={{ fontSize: 15, lineHeight: 1.3, color: 'var(--ml-text)' }}
            >
              {isPremium
                ? t('dashboard:bubsense.promptHint', {
                    defaultValue: 'Ask anything about your baby.',
                  })
                : t('dashboard:bubsense.upgradeHint', {
                    defaultValue: 'Unlock a private baby expert, always on.',
                  })}
            </div>
          </div>
          <Icon.Arrow />
        </button>
      )}

      {selectedBaby && (
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Feeding — hero, accent */}
          <HoldButton
            ariaLabel={`${t('dashboard:quickActionsSection.feeding')}. ${t('common:moonlight.holdForOptions')}`}
            onHold={() => openModal('feeding')}
            borderRadius={22}
            style={{
              padding: '18px 16px 14px',
              borderRadius: 22,
              background: 'var(--ml-accent)',
              color: '#0a0706',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
              textAlign: 'left',
            }}
          >
            <Icon.Feed />
            <div style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>
              {t('dashboard:quickActionsSection.feeding')}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              <Chip
                variant="solid"
                disabled={savingChip !== null}
                onTap={() => quickLogFeed('breast', null)}
                ariaLabel={t('dashboard:feeding.breast')}
              >
                {savingChip === 'feed:breast' ? '…' : t('dashboard:feeding.breast')}
              </Chip>
              <Chip
                variant="solid"
                disabled={savingChip !== null}
                onTap={() => quickLogFeed('formula', 60)}
                ariaLabel={t('dashboard:feeding.formula')}
              >
                {savingChip === 'feed:formula' ? '…' : t('dashboard:feeding.formula')}
              </Chip>
              <Chip
                variant="solid"
                disabled={savingChip !== null}
                onTap={() => quickLogFeed('bottle', 60)}
                ariaLabel={t('dashboard:feeding.breastBottle')}
              >
                {savingChip === 'feed:bottle' ? '…' : t('dashboard:feeding.breastBottle')}
              </Chip>
            </div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
              {t('common:moonlight.holdForOptions')}
            </div>
          </HoldButton>

          {/* Sleep — soft blue filled, toggle based on current_sleep */}
          <HoldButton
            ariaLabel={`${t('dashboard:quickActionsSection.sleep')}. ${t('common:moonlight.holdForOptions')}`}
            onHold={() => openModal('sleep')}
            borderRadius={22}
            style={{
              padding: '18px 16px 14px',
              borderRadius: 22,
              background: SLEEP_ACCENT,
              color: '#0a0706',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
              textAlign: 'left',
            }}
          >
            <Icon.Sleep />
            <div style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>
              {t('dashboard:quickActionsSection.sleep')}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              {dashboard?.current_sleep?.id ? (
                <Chip
                  variant="solid"
                  disabled={savingChip !== null}
                  onTap={quickWakeUp}
                  ariaLabel={t('dashboard:toast_babyIsAwake')}
                >
                  {savingChip === 'sleep:end' ? '…' : t('dashboard:sleep.wakeUp')}
                </Chip>
              ) : (
                <Chip
                  variant="solid"
                  disabled={savingChip !== null}
                  onTap={quickStartSleep}
                  ariaLabel={t('dashboard:sleep.startSleep')}
                >
                  {savingChip === 'sleep:start' ? '…' : t('dashboard:sleep.startSleep')}
                </Chip>
              )}
            </div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
              {t('common:moonlight.holdForOptions')}
            </div>
          </HoldButton>
        </div>
      )}

      {selectedBaby && largeSecondaries.length > 0 && (
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {largeSecondaries.map((kind) => renderLargeTile(kind))}
        </div>
      )}

      {selectedBaby && compactSecondaries.length > 0 && (
        <div
          style={{
            marginTop: 10,
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(4, compactSecondaries.length)}, 1fr)`,
            gap: 8,
          }}
        >
          {compactSecondaries.map((kind) => renderCompactTile(kind))}
        </div>
      )}

      <SectionLabel extra={format(now, 'h:mm a').toLowerCase()}>today</SectionLabel>
      <Ribbon events={ribbon.events} nowFrac={ribbon.nowFrac} />

      <SectionLabel>tonight's story</SectionLabel>
      <div className="card card-accent">
        <div className="mono" style={{ color: 'var(--ml-accent)' }}>
          quiet observation
        </div>
        <div className="serif" style={{ fontSize: 17, lineHeight: 1.4, marginTop: 8 }}>
          {lastFeed == null
            ? 'Log a first feed to start seeing patterns here.'
            : `We'll surface rhythms as more data comes in. Keep logging as you go.`}
        </div>
      </div>

      {activeModal && selectedBaby && (
        <Suspense fallback={null}>
          {activeModal === 'feeding' && (
            <FeedingModal
              babyId={selectedBaby.id}
              onClose={closeModal}
              onSave={() => onModalSave('feeding')}
            />
          )}
          {activeModal === 'diaper' && (
            <DiaperModal
              babyId={selectedBaby.id}
              onClose={closeModal}
              onSave={() => onModalSave('diaper')}
            />
          )}
          {activeModal === 'sleep' && (
            <SleepModal
              babyId={selectedBaby.id}
              onClose={closeModal}
              onSave={() => onModalSave('sleep')}
            />
          )}
          {activeModal === 'pumping' && (
            <PumpingModal
              babyId={selectedBaby.id}
              onClose={closeModal}
              onSave={() => onModalSave('pumping')}
            />
          )}
          {activeModal === 'tummy' && (
            <TummyTimeModal
              onClose={closeModal}
              onSave={() => onModalSave('tummy')}
            />
          )}
          {activeModal === 'potty' && (
            <PottyModal onClose={closeModal} onSave={() => onModalSave('potty')} />
          )}
          {activeModal === 'bath' && (
            <BathModal onClose={closeModal} onSave={() => onModalSave('bath')} />
          )}
          {activeModal === 'supplement' && (
            <SupplementModal onClose={closeModal} onSave={() => onModalSave('supplement')} />
          )}
          {activeModal === 'solid' && (
            <SolidModal onClose={closeModal} onSave={() => onModalSave('solid')} />
          )}
        </Suspense>
      )}

      {showBubsense && selectedBaby && (
        <Suspense fallback={null}>
          <BubsenseChat
            babyId={selectedBaby.id}
            isPremium={isPremium}
            onClose={() => setShowBubsense(false)}
            onUpgrade={() => setShowUpgrade(true)}
            onCommandExecuted={() => void load()}
          />
        </Suspense>
      )}

      {showUpgrade && (
        <Suspense fallback={null}>
          <UpgradeDialog onClose={() => setShowUpgrade(false)} />
        </Suspense>
      )}
    </div>
  );
}
