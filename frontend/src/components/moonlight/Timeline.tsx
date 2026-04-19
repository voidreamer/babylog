/* eslint-disable @typescript-eslint/no-explicit-any */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays, format, isToday, subDays } from 'date-fns';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { useBaby } from '../../hooks/useBaby';
import { hapticSelection } from '../../utils/haptics';
import { Ribbon } from './Ribbon';
import { SectionLabel } from './UI';
import { Icon } from './Icon';
import ConfirmModal from '../ConfirmModal';
import type { TimelineEvent as MoonlightRibbonEvent } from './types';

const FeedingModal = lazy(() => import('../FeedingModal'));
const DiaperModal = lazy(() => import('../DiaperModal'));
const SleepModal = lazy(() => import('../SleepModal'));
const PumpingModal = lazy(() => import('../PumpingModal'));
const PottyModal = lazy(() => import('../PottyModal'));
const TummyTimeModal = lazy(() => import('../TummyTimeModal'));
const BathModal = lazy(() => import('../BathModal'));
const SupplementModal = lazy(() => import('../SupplementModal'));
const SolidModal = lazy(() => import('../SolidModal'));

type EventType =
  | 'feeding'
  | 'diaper'
  | 'sleep'
  | 'pumping'
  | 'potty'
  | 'tummy'
  | 'bath'
  | 'supplement'
  | 'solid';

// Moonlight-aligned palette — extends the established coral/blue/butter/mint
// set with 5 muted tones for the less-frequent event kinds.
const EVENT_STYLE: Record<EventType, { color: string; labelKey: string }> = {
  feeding: { color: '#E89580', labelKey: 'dashboard:feeding.title' },
  diaper: { color: '#D9C388', labelKey: 'dashboard:diaper.title' },
  sleep: { color: '#8BA5C4', labelKey: 'dashboard:sleep.title' },
  pumping: { color: '#9BC29E', labelKey: 'dashboard:pumping.title' },
  potty: { color: '#B89BC4', labelKey: 'dashboard:potty.title' },
  tummy: { color: '#E8A564', labelKey: 'dashboard:tummyTime.title' },
  bath: { color: '#8BC4D9', labelKey: 'dashboard:bath.title' },
  supplement: { color: '#A6C49B', labelKey: 'dashboard:supplement.title' },
  solid: { color: '#D98571', labelKey: 'dashboard:solid.title' },
};

function parseUTC(t: string): Date {
  return new Date(t.endsWith('Z') ? t : t + 'Z');
}

/** Map the full 9-type set onto the 4-type Ribbon palette for the day-glance bar. */
function toRibbonType(kind: EventType): MoonlightRibbonEvent['type'] {
  if (kind === 'feeding' || kind === 'pumping' || kind === 'supplement' || kind === 'solid') return 'feed';
  if (kind === 'sleep') return 'sleep';
  if (kind === 'diaper') return 'diaper';
  return 'play';
}

/**
 * Build Ribbon events for the day — each timeline event becomes a bar on a
 * 24-hour axis. Duration comes from sleep end_time or details.duration_minutes;
 * point events get a small 12-minute bar so they're visible.
 */
function buildRibbon(events: any[], selectedDate: Date): {
  events: MoonlightRibbonEvent[];
  nowFrac: number;
} {
  const start = new Date(selectedDate);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  const nowFrac = isToday(selectedDate)
    ? (now.getTime() - start.getTime()) / (24 * 3600 * 1000)
    : 1;

  const ribbon: MoonlightRibbonEvent[] = [];
  for (const e of events) {
    const evStart = parseUTC(e.time);
    const tHours = (evStart.getTime() - start.getTime()) / 3600000;
    if (tHours < 0 || tHours >= 24) continue;
    let durHours = 0.2; // 12min default for point events
    const details = e.details || {};
    if (e.event_type === 'sleep' && details.end_time) {
      durHours = Math.max(
        0.2,
        (parseUTC(details.end_time).getTime() - evStart.getTime()) / 3600000,
      );
    } else if (details.duration_minutes) {
      durHours = Math.max(0.2, details.duration_minutes / 60);
    }
    ribbon.push({
      t: tHours,
      duration: Math.min(durHours, 24 - tHours),
      type: toRibbonType(e.event_type as EventType),
    });
  }
  return { events: ribbon, nowFrac };
}

export default function MoonlightTimeline() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { selectedBaby } = useBaby();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!selectedBaby) return;
    setLoading(true);
    try {
      const localDate = format(selectedDate, 'yyyy-MM-dd');
      const tzOffset = new Date().getTimezoneOffset();
      const data = await api.getTimeline(selectedBaby.id, localDate, tzOffset);
      setEvents(data || []);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedBaby, selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

  // Scroll to current hour (or 6am for non-today views) after events load.
  useEffect(() => {
    if (loading || !scrollRef.current) return;
    const now = new Date();
    const hour = isToday(selectedDate) ? Math.max(0, now.getHours() - 2) : 6;
    // Find the hour row element. Rows have ids ml-hour-{h}.
    const target = scrollRef.current.querySelector(
      `#ml-hour-${hour}`,
    ) as HTMLElement | null;
    if (target) target.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [loading, selectedDate]);

  const navigateDay = useCallback((delta: number) => {
    hapticSelection();
    setSelectedDate((prev) => (delta > 0 ? addDays(prev, 1) : subDays(prev, 1)));
  }, []);

  const goToToday = useCallback(() => {
    hapticSelection();
    setSelectedDate(new Date());
  }, []);

  // Group events by hour of the local selected day.
  const { byHour, ribbon } = useMemo(() => {
    const map: Record<number, any[]> = {};
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    for (const e of events) {
      const evTime = parseUTC(e.time);
      const h = evTime.getHours();
      if (!map[h]) map[h] = [];
      map[h].push(e);
    }
    // Sort each hour bucket by time asc
    Object.values(map).forEach((bucket) =>
      bucket.sort((a, b) => parseUTC(a.time).getTime() - parseUTC(b.time).getTime()),
    );
    return { byHour: map, ribbon: buildRibbon(events, selectedDate) };
  }, [events, selectedDate]);

  const onModalSave = useCallback(() => {
    setEditEvent(null);
    void load();
  }, [load]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      const id = confirmDelete.id;
      switch (confirmDelete.event_type as EventType) {
        case 'feeding':
          await api.deleteFeeding(id);
          break;
        case 'diaper':
          await api.deleteDiaper(id);
          break;
        case 'sleep':
          await api.deleteSleep(id);
          break;
        case 'pumping':
          await api.deletePumping(id);
          break;
        case 'potty':
          await api.deletePottyLog(id);
          break;
        case 'tummy':
          await api.deleteTummyTime(id);
          break;
        case 'bath':
          await api.deleteBath(id);
          break;
        case 'supplement':
          await api.deleteSupplement(id);
          break;
        case 'solid':
          await api.deleteSolid(id);
          break;
      }
      toast.success(t('dashboard:toast_deletedSuccessfully'));
      await load();
    } catch {
      toast.error(t('dashboard:toast_failedToDelete'));
    }
    setConfirmDelete(null);
  }, [confirmDelete, load, t]);

  const hours = Array.from({ length: 24 }, (_, i) => 23 - i);

  const hourLabel = (h: number) => {
    if (h === 0) return '12am';
    if (h < 12) return `${h}am`;
    if (h === 12) return '12pm';
    return `${h - 12}pm`;
  };

  const currentHour = isToday(selectedDate) ? new Date().getHours() : -1;

  const formatEventDetail = (e: any): string => {
    const d = e.details || {};
    if (e.event_type === 'feeding') {
      const parts: string[] = [];
      if (d.type) parts.push(String(d.type));
      if (d.duration_minutes) parts.push(`${d.duration_minutes} min`);
      if (d.amount_ml) parts.push(`${d.amount_ml} ml`);
      return parts.join(' · ');
    }
    if (e.event_type === 'sleep') {
      if (d.end_time) {
        const mins = Math.round(
          (parseUTC(d.end_time).getTime() - parseUTC(e.time).getTime()) / 60000,
        );
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
      }
      return t('dashboard:sleep.ongoing', { defaultValue: 'ongoing' });
    }
    if (e.event_type === 'diaper' && d.type) return String(d.type);
    if (e.event_type === 'pumping' && d.amount_ml) return `${d.amount_ml} ml`;
    if (d.duration_minutes) return `${d.duration_minutes} min`;
    return '';
  };

  return (
    <div
      ref={scrollRef}
      className="ml-timeline"
      style={{
        minHeight: '100%',
        padding: '12px 20px 8px',
        color: 'var(--ml-text)',
      }}
    >
      {/* Header */}
      <div className="mono" style={{ marginBottom: 2 }}>
        {format(selectedDate, 'EEEE · MMMM d').toLowerCase()}
      </div>
      <h1
        style={{
          fontFamily: 'Geist Variable, Geist, -apple-system, sans-serif',
          fontWeight: 300,
          fontSize: 34,
          margin: '2px 0 0',
          letterSpacing: -1,
          color: 'var(--ml-text)',
        }}
      >
        {isToday(selectedDate)
          ? t('dashboard:timeline.todayAtGlance', { defaultValue: 'Today at a ' })
          : t('dashboard:timeline.dayAtGlance', { defaultValue: 'This day at a ' })}
        <em
          className="serif"
          style={{ color: 'var(--ml-accent)', fontStyle: 'italic' }}
        >
          {t('dashboard:timeline.glance', { defaultValue: 'glance' })}
        </em>
      </h1>

      {/* Date stepper */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 14,
        }}
      >
        <button
          type="button"
          onClick={() => navigateDay(-1)}
          aria-label={t('common:back')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            border: '0.5px solid var(--ml-line)',
            background: 'var(--ml-surface)',
            color: 'var(--ml-text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'inherit',
          }}
        >
          <Icon.Back />
        </button>
        {!isToday(selectedDate) && (
          <button
            type="button"
            onClick={goToToday}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: '0.5px solid var(--ml-accent)',
              background: 'transparent',
              color: 'var(--ml-accent)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.2,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('common:time.today', { defaultValue: 'today' }).toLowerCase()}
          </button>
        )}
        <button
          type="button"
          onClick={() => navigateDay(1)}
          aria-label={t('common:next')}
          disabled={isToday(selectedDate)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            border: '0.5px solid var(--ml-line)',
            background: 'var(--ml-surface)',
            color: 'var(--ml-text)',
            cursor: isToday(selectedDate) ? 'not-allowed' : 'pointer',
            opacity: isToday(selectedDate) ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'inherit',
          }}
        >
          <Icon.Arrow />
        </button>
      </div>

      {/* 24h Ribbon */}
      <div style={{ marginTop: 16 }}>
        <Ribbon events={ribbon.events} nowFrac={ribbon.nowFrac} />
      </div>

      {/* Hour-by-hour */}
      <SectionLabel>
        {t('dashboard:timeline.hourByHour', { defaultValue: 'hour by hour' })}
      </SectionLabel>

      {loading && events.length === 0 ? (
        <div
          className="serif italic"
          style={{ color: 'var(--ml-text-3)', padding: '20px 0', textAlign: 'center' }}
        >
          {t('common:loading')}
        </div>
      ) : (
        <div>
          {hours.map((h) => {
            const bucket = byHour[h] || [];
            const isNow = h === currentHour;
            return (
              <div
                id={`ml-hour-${h}`}
                key={h}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '10px 0',
                  borderTop: '0.5px solid var(--ml-line)',
                }}
              >
                <div
                  style={{
                    width: 48,
                    flexShrink: 0,
                    paddingTop: 2,
                    fontFamily:
                      'Geist Mono Variable, Geist Mono, ui-monospace, monospace',
                    fontSize: 11,
                    color: isNow ? 'var(--ml-accent)' : 'var(--ml-text-3)',
                    letterSpacing: 0.4,
                  }}
                >
                  {hourLabel(h)}
                  {isNow && (
                    <div
                      style={{
                        fontSize: 9,
                        marginTop: 2,
                        letterSpacing: 1.2,
                        textTransform: 'uppercase',
                      }}
                    >
                      now
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {bucket.length === 0 ? (
                    <div
                      className="serif italic"
                      style={{ fontSize: 13, color: 'var(--ml-text-3)', paddingTop: 2 }}
                    >
                      —
                    </div>
                  ) : (
                    bucket.map((e) => {
                      const style = EVENT_STYLE[e.event_type as EventType];
                      if (!style) return null;
                      const label = t(style.labelKey);
                      const detail = formatEventDetail(e);
                      const time = format(parseUTC(e.time), 'h:mm a').toLowerCase();
                      return (
                        <div
                          key={`${e.event_type}-${e.id}`}
                          style={{
                            padding: '8px 10px 8px 12px',
                            borderRadius: 12,
                            background: style.color + '22',
                            border: `0.5px solid ${style.color}55`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              hapticSelection();
                              setEditEvent(e);
                            }}
                            aria-label={`${label} ${time}`}
                            style={{
                              flex: 1,
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--ml-text)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              padding: 0,
                              fontFamily: 'inherit',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                textTransform: 'capitalize',
                              }}
                            >
                              {label}
                              <span
                                className="mono"
                                style={{ marginLeft: 8, letterSpacing: 0.6 }}
                              >
                                {time}
                              </span>
                            </span>
                            {detail && (
                              <span style={{ fontSize: 11, color: 'var(--ml-text-2)' }}>
                                {detail}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setConfirmDelete(e);
                            }}
                            aria-label={t('common:delete')}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 999,
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--ml-text-3)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: 'inherit',
                            }}
                          >
                            <Icon.Close />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal — routes by event_type */}
      {editEvent && selectedBaby && (
        <Suspense fallback={null}>
          {editEvent.event_type === 'feeding' && (
            <FeedingModal
              babyId={selectedBaby.id}
              editEvent={editEvent}
              onClose={() => setEditEvent(null)}
              onSave={onModalSave}
            />
          )}
          {editEvent.event_type === 'diaper' && (
            <DiaperModal
              babyId={selectedBaby.id}
              editEvent={editEvent}
              onClose={() => setEditEvent(null)}
              onSave={onModalSave}
            />
          )}
          {editEvent.event_type === 'sleep' && (
            <SleepModal
              babyId={selectedBaby.id}
              editEvent={editEvent}
              onClose={() => setEditEvent(null)}
              onSave={onModalSave}
            />
          )}
          {editEvent.event_type === 'pumping' && (
            <PumpingModal
              babyId={selectedBaby.id}
              editEvent={editEvent}
              onClose={() => setEditEvent(null)}
              onSave={onModalSave}
            />
          )}
          {editEvent.event_type === 'potty' && (
            <PottyModal editEvent={editEvent} onClose={() => setEditEvent(null)} onSave={onModalSave} />
          )}
          {editEvent.event_type === 'tummy' && (
            <TummyTimeModal
              editEvent={editEvent}
              onClose={() => setEditEvent(null)}
              onSave={onModalSave}
            />
          )}
          {editEvent.event_type === 'bath' && (
            <BathModal editEvent={editEvent} onClose={() => setEditEvent(null)} onSave={onModalSave} />
          )}
          {editEvent.event_type === 'supplement' && (
            <SupplementModal
              editEvent={editEvent}
              onClose={() => setEditEvent(null)}
              onSave={onModalSave}
            />
          )}
          {editEvent.event_type === 'solid' && (
            <SolidModal editEvent={editEvent} onClose={() => setEditEvent(null)} onSave={onModalSave} />
          )}
        </Suspense>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title={t('dashboard:timeline.deleteTitle', { defaultValue: 'Delete event?' })}
        message={t('dashboard:timeline.deleteMessage', {
          defaultValue: 'This action cannot be undone.',
        })}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
