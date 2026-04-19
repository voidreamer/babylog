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
import { Orb } from './Orb';
import { Ribbon } from './Ribbon';
import { SectionLabel } from './UI';
import { Icon } from './Icon';
import { HoldButton } from './HoldButton';
import type { OrbMode, TimelineEvent } from './types';

const FeedingModal = lazy(() => import('../FeedingModal'));
const DiaperModal = lazy(() => import('../DiaperModal'));
const SleepModal = lazy(() => import('../SleepModal'));
const PumpingModal = lazy(() => import('../PumpingModal'));

type ModalKind = 'feeding' | 'diaper' | 'sleep' | 'pumping' | null;

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
export default function MoonlightHome() {
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
  const onModalSave = useCallback(() => {
    setActiveModal(null);
    void load();
  }, [load]);

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
      await load();
    } catch {
      toast.error(t('dashboard:toast_failedToSavePumping'));
    } finally {
      setSavingChip(null);
    }
  }, [selectedBaby, load, t]);

  const now = new Date();
  const orb = useMemo(() => deriveOrbState(dashboard), [dashboard]);
  const ribbon = useMemo(() => buildRibbonEvents(dashboard), [dashboard]);
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
        <Orb size={170} mode={orb.mode} urgency={orb.urgency} />
      </div>

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
        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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

          {/* Sleep — toggle based on current_sleep */}
          <HoldButton
            ariaLabel={`${t('dashboard:quickActionsSection.sleep')}. ${t('common:moonlight.holdForOptions')}`}
            onHold={() => openModal('sleep')}
            borderRadius={22}
            style={{
              padding: '18px 16px 14px',
              borderRadius: 22,
              background: 'var(--ml-surface)',
              color: 'var(--ml-text)',
              border: '0.5px solid var(--ml-line)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
              textAlign: 'left',
            }}
          >
            <div style={{ color: '#8BA5C4' }}>
              <Icon.Sleep />
            </div>
            <div style={{ fontSize: 17, fontWeight: 500, marginTop: 2 }}>
              {t('dashboard:quickActionsSection.sleep')}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              {dashboard?.current_sleep?.id ? (
                <Chip
                  variant="ghost"
                  disabled={savingChip !== null}
                  onTap={quickWakeUp}
                  ariaLabel={t('dashboard:toast_babyIsAwake')}
                >
                  {savingChip === 'sleep:end' ? '…' : t('dashboard:sleep.wakeUp')}
                </Chip>
              ) : (
                <Chip
                  variant="ghost"
                  disabled={savingChip !== null}
                  onTap={quickStartSleep}
                  ariaLabel={t('dashboard:sleep.startSleep')}
                >
                  {savingChip === 'sleep:start' ? '…' : t('dashboard:sleep.startSleep')}
                </Chip>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ml-text-3)', marginTop: 2 }}>
              {t('common:moonlight.holdForOptions')}
            </div>
          </HoldButton>
        </div>
      )}

      {selectedBaby && (
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {/* Diaper — chip row */}
          <HoldButton
            ariaLabel={`${t('dashboard:quickActionsSection.diaper')}. ${t('common:moonlight.holdForOptions')}`}
            onHold={() => openModal('diaper')}
            borderRadius={18}
            style={{
              padding: '12px',
              borderRadius: 18,
              background: 'var(--ml-surface)',
              color: 'var(--ml-text)',
              border: '0.5px solid var(--ml-line)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ color: '#D9C388' }}>
                <Icon.Diaper />
              </div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {t('dashboard:quickActionsSection.diaper')}
              </div>
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

          {/* Pump — single quick 60ml chip; hold → modal for custom amount */}
          <HoldButton
            ariaLabel={`${t('dashboard:quickActionsSection.pump')}. ${t('common:moonlight.holdForOptions')}`}
            onHold={() => openModal('pumping')}
            borderRadius={18}
            style={{
              padding: '12px',
              borderRadius: 18,
              background: 'var(--ml-surface)',
              color: 'var(--ml-text)',
              border: '0.5px solid var(--ml-line)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ color: '#9BC29E' }}>
                <Icon.Plus />
              </div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {t('dashboard:quickActionsSection.pump')}
              </div>
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
            <FeedingModal babyId={selectedBaby.id} onClose={closeModal} onSave={onModalSave} />
          )}
          {activeModal === 'diaper' && (
            <DiaperModal babyId={selectedBaby.id} onClose={closeModal} onSave={onModalSave} />
          )}
          {activeModal === 'sleep' && (
            <SleepModal babyId={selectedBaby.id} onClose={closeModal} onSave={onModalSave} />
          )}
          {activeModal === 'pumping' && (
            <PumpingModal babyId={selectedBaby.id} onClose={closeModal} onSave={onModalSave} />
          )}
        </Suspense>
      )}
    </div>
  );
}
