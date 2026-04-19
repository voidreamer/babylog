/* eslint-disable @typescript-eslint/no-explicit-any */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useBaby } from '../../hooks/useBaby';
import { api } from '../../api/client';
import { hapticSelection } from '../../utils/haptics';
import { Orb } from './Orb';
import { Ribbon } from './Ribbon';
import { SectionLabel } from './UI';
import { Icon } from './Icon';
import type { OrbMode, TimelineEvent } from './types';

const FeedingModal = lazy(() => import('../FeedingModal'));
const DiaperModal = lazy(() => import('../DiaperModal'));
const SleepModal = lazy(() => import('../SleepModal'));
const PumpingModal = lazy(() => import('../PumpingModal'));

type ModalKind = 'feeding' | 'diaper' | 'sleep' | 'pumping' | null;

function parseUTC(time: string): Date {
  return new Date(time.endsWith('Z') ? time : time + 'Z');
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
          <button
            type="button"
            onClick={() => openModal('feeding')}
            aria-label={t('dashboard:quickActionsSection.feeding')}
            style={{
              padding: '20px 16px',
              borderRadius: 22,
              background: 'var(--ml-accent)',
              color: '#0a0706',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 4,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <Icon.Feed />
            <div style={{ fontSize: 17, fontWeight: 600, marginTop: 4 }}>
              {t('dashboard:quickActionsSection.feeding')}
            </div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{t('dashboard:tapToLog')}</div>
          </button>
          <button
            type="button"
            onClick={() => openModal('sleep')}
            aria-label={t('dashboard:quickActionsSection.sleep')}
            style={{
              padding: '20px 16px',
              borderRadius: 22,
              background: 'var(--ml-surface)',
              color: 'var(--ml-text)',
              border: '0.5px solid var(--ml-line)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 4,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ color: '#8BA5C4' }}>
              <Icon.Sleep />
            </div>
            <div style={{ fontSize: 17, fontWeight: 500, marginTop: 4 }}>
              {t('dashboard:quickActionsSection.sleep')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ml-text-3)' }}>
              {t('dashboard:tapToLog')}
            </div>
          </button>
        </div>
      )}

      {selectedBaby && (
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            type="button"
            onClick={() => openModal('diaper')}
            aria-label={t('dashboard:quickActionsSection.diaper')}
            style={{
              padding: '14px 12px',
              borderRadius: 18,
              background: 'var(--ml-surface)',
              color: 'var(--ml-text)',
              border: '0.5px solid var(--ml-line)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 4,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ color: '#D9C388' }}>
              <Icon.Diaper />
            </div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {t('dashboard:quickActionsSection.diaper')}
            </div>
          </button>
          <button
            type="button"
            onClick={() => openModal('pumping')}
            aria-label={t('dashboard:quickActionsSection.pump')}
            style={{
              padding: '14px 12px',
              borderRadius: 18,
              background: 'var(--ml-surface)',
              color: 'var(--ml-text)',
              border: '0.5px solid var(--ml-line)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 4,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ color: '#9BC29E' }}>
              <Icon.Plus />
            </div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {t('dashboard:quickActionsSection.pump')}
            </div>
          </button>
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
