/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  addDays,
  differenceInMinutes,
  format,
  isToday,
  startOfDay,
  subDays,
} from 'date-fns';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
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

const HOUR_PX = 80;
const DAY_MINUTES = 24 * 60;
const MIN_BLOCK_PX = 30;
const POINT_EVENT_DEFAULT_MIN = 15;

function parseUTC(t: string): Date {
  return new Date(t.endsWith('Z') ? t : t + 'Z');
}

function eventKey(e: any): string {
  return `${e.event_type}-${e.id}`;
}

/** Map the full 9-type set onto the 4-type Ribbon palette for the day-glance bar. */
function toRibbonType(kind: EventType): MoonlightRibbonEvent['type'] {
  if (kind === 'feeding' || kind === 'pumping' || kind === 'supplement' || kind === 'solid') return 'feed';
  if (kind === 'sleep') return 'sleep';
  if (kind === 'diaper') return 'diaper';
  return 'play';
}

/**
 * End-minutes from day-start for an event. Mirrors the production algorithm
 * so moonlight overlap/duration layout matches the classic Timeline exactly.
 */
function getEventEndMinutes(event: any, dayStart: Date): number {
  const eventTime = parseUTC(event.time);
  const dayEnd = DAY_MINUTES;
  const startMins = differenceInMinutes(eventTime, dayStart);
  const details = event.details || {};

  if (event.event_type === 'sleep' && details.end_time) {
    const endMins = differenceInMinutes(parseUTC(details.end_time), dayStart);
    return Math.min(endMins, dayEnd);
  }
  if (details.duration_minutes) {
    return startMins + details.duration_minutes;
  }
  return startMins + POINT_EVENT_DEFAULT_MIN;
}

type ColumnInfo = { column: number; totalColumns: number };

/**
 * Assigns each event to a column so overlapping blocks can render side-by-side.
 * Two-pass algorithm:
 *   1. Sort by start; for each event, find the first free column among its
 *      overlappers.
 *   2. Propagate the max totalColumns across each overlap cluster so all
 *      members draw at the same width.
 */
function calculateEventColumns(
  events: any[],
  dayStart: Date,
): Map<string, ColumnInfo> {
  const sorted = [...events].sort(
    (a, b) => parseUTC(a.time).getTime() - parseUTC(b.time).getTime(),
  );
  const columns = new Map<string, ColumnInfo>();

  sorted.forEach((event, idx) => {
    const eventStart = differenceInMinutes(parseUTC(event.time), dayStart);
    const eventEnd = getEventEndMinutes(event, dayStart);
    const used = new Set<number>();
    let maxCol = -1;

    for (let i = 0; i < idx; i++) {
      const prev = sorted[i];
      const prevStart = differenceInMinutes(parseUTC(prev.time), dayStart);
      const prevEnd = getEventEndMinutes(prev, dayStart);
      if (eventStart < prevEnd && eventEnd > prevStart) {
        const prevCol = columns.get(eventKey(prev));
        if (prevCol) {
          used.add(prevCol.column);
          maxCol = Math.max(maxCol, prevCol.totalColumns - 1);
        }
      }
    }

    let column = 0;
    while (used.has(column)) column++;
    columns.set(eventKey(event), {
      column,
      totalColumns: Math.max(maxCol + 1, column + 1),
    });
  });

  // Propagate totalColumns: every event that overlaps any member of a cluster
  // gets the cluster's max column count so widths line up.
  sorted.forEach((event) => {
    const eventStart = differenceInMinutes(parseUTC(event.time), dayStart);
    const eventEnd = getEventEndMinutes(event, dayStart);
    let maxColInCluster = columns.get(eventKey(event))!.column;
    sorted.forEach((other) => {
      const otherStart = differenceInMinutes(parseUTC(other.time), dayStart);
      const otherEnd = getEventEndMinutes(other, dayStart);
      if (eventStart < otherEnd && eventEnd > otherStart) {
        maxColInCluster = Math.max(
          maxColInCluster,
          columns.get(eventKey(other))!.column,
        );
      }
    });
    const current = columns.get(eventKey(event))!;
    columns.set(eventKey(event), { ...current, totalColumns: maxColInCluster + 1 });
  });

  return columns;
}

function buildRibbon(events: any[], selectedDate: Date) {
  const start = startOfDay(selectedDate);
  const now = new Date();
  const nowFrac = isToday(selectedDate)
    ? (now.getTime() - start.getTime()) / (DAY_MINUTES * 60000)
    : 1;

  const ribbon: MoonlightRibbonEvent[] = [];
  for (const e of events) {
    const evStart = parseUTC(e.time);
    const tHours = (evStart.getTime() - start.getTime()) / 3600000;
    if (tHours < 0 || tHours >= 24) continue;
    let durHours = 0.2;
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

function hourLabel(h: number): string {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function formatEventDetail(e: any, t: (k: string, o?: any) => string): string {
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
}

export default function MoonlightTimeline() {
  const { t } = useTranslation(['dashboard', 'common', 'health']);
  const { selectedBaby } = useBaby();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!selectedBaby) return;
    setLoading(true);
    try {
      const localDate = format(selectedDate, 'yyyy-MM-dd');
      const tzOffset = new Date().getTimezoneOffset();
      const data = await api.getTimeline(selectedBaby.id, localDate, tzOffset);
      setEvents(data || []);
      setSelectedKey(null);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedBaby, selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

  // Scroll the grid to ~2 hours before "now" on today, 6am for past days.
  useEffect(() => {
    if (loading || !gridRef.current) return;
    const now = new Date();
    const hour = isToday(selectedDate) ? Math.max(0, now.getHours() - 2) : 6;
    gridRef.current.scrollTop = hour * HOUR_PX;
  }, [loading, selectedDate]);

  const navigateDay = useCallback((delta: number) => {
    hapticSelection();
    setSelectedDate((prev) => (delta > 0 ? addDays(prev, 1) : subDays(prev, 1)));
    setSelectedKey(null);
  }, []);

  const goToToday = useCallback(() => {
    hapticSelection();
    setSelectedDate(new Date());
    setSelectedKey(null);
  }, []);

  const dayStart = useMemo(() => startOfDay(selectedDate), [selectedDate]);
  const columns = useMemo(
    () => calculateEventColumns(events, dayStart),
    [events, dayStart],
  );
  const ribbon = useMemo(() => buildRibbon(events, selectedDate), [events, selectedDate]);

  const getEventStyle = useCallback(
    (event: any) => {
      const eventTime = parseUTC(event.time);
      const startMins = differenceInMinutes(eventTime, dayStart);
      const clippedStart = Math.max(0, startMins);
      const top = (clippedStart / 60) * HOUR_PX;

      const endMins = getEventEndMinutes(event, dayStart);
      const clippedEnd = Math.min(endMins, DAY_MINUTES);
      const visibleMins = clippedEnd - clippedStart;
      const height = Math.max(MIN_BLOCK_PX, (visibleMins / 60) * HOUR_PX);

      const col = columns.get(eventKey(event)) || { column: 0, totalColumns: 1 };
      const widthPercent = 100 / col.totalColumns;
      const leftPercent = col.column * widthPercent;

      return {
        top: `${top}px`,
        height: `${height}px`,
        width: `calc(${widthPercent}% - 4px)`,
        left: `calc(${leftPercent}% + 2px)`,
      };
    },
    [columns, dayStart],
  );

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

  const currentHour = isToday(selectedDate) ? new Date().getHours() : -1;
  const nowTopPx = isToday(selectedDate)
    ? (differenceInMinutes(new Date(), dayStart) / 60) * HOUR_PX
    : null;

  return (
    <div style={{ padding: '12px 20px 8px', color: 'var(--ml-text)' }}>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
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

      {/* Hour grid */}
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
        <div
          ref={gridRef}
          style={{
            position: 'relative',
            height: '60vh',
            maxHeight: 620,
            overflowY: 'auto',
            overflowX: 'hidden',
            borderTop: '0.5px solid var(--ml-line)',
            borderBottom: '0.5px solid var(--ml-line)',
            background: 'var(--ml-surface)',
            borderRadius: 14,
          }}
        >
          {/* Full-day grid container */}
          <div
            style={{
              position: 'relative',
              height: 24 * HOUR_PX,
              paddingLeft: 56,
              paddingRight: 6,
            }}
          >
            {/* Hour guide rows */}
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                style={{
                  position: 'absolute',
                  top: h * HOUR_PX,
                  left: 0,
                  right: 0,
                  height: HOUR_PX,
                  borderTop: '0.5px solid var(--ml-line)',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: 4,
                    fontFamily:
                      'Geist Mono Variable, Geist Mono, ui-monospace, monospace',
                    fontSize: 10,
                    letterSpacing: 0.4,
                    color: h === currentHour ? 'var(--ml-accent)' : 'var(--ml-text-3)',
                    width: 44,
                  }}
                >
                  {hourLabel(h)}
                </div>
              </div>
            ))}

            {/* Current-time indicator */}
            {nowTopPx !== null && (
              <>
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: nowTopPx - 1,
                    left: 56,
                    right: 6,
                    height: 2,
                    background: 'var(--ml-accent)',
                    zIndex: 2,
                    borderRadius: 2,
                  }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: nowTopPx - 4,
                    left: 52,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--ml-accent)',
                    zIndex: 2,
                  }}
                />
              </>
            )}

            {/* Event blocks */}
            {events.map((event) => {
              const style = EVENT_STYLE[event.event_type as EventType];
              if (!style) return null;
              const position = getEventStyle(event);
              const label = t(style.labelKey);
              const detail = formatEventDetail(event, t);
              const time = format(parseUTC(event.time), 'h:mm a').toLowerCase();
              const key = eventKey(event);
              const isSelected = selectedKey === key;

              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-label={`${label} ${time}`}
                  aria-pressed={isSelected}
                  onClick={() => {
                    hapticSelection();
                    setSelectedKey(isSelected ? null : key);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedKey(isSelected ? null : key);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    ...position,
                    zIndex: isSelected ? 3 : 1,
                    padding: '6px 8px 6px 10px',
                    borderRadius: 10,
                    background: style.color + '22',
                    borderLeft: `3px solid ${style.color}`,
                    outline: isSelected ? '1.5px solid var(--ml-accent)' : 'none',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    color: 'var(--ml-text)',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        textTransform: 'capitalize',
                      }}
                    >
                      {label}
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: 10, letterSpacing: 0.4 }}
                    >
                      {time}
                    </span>
                  </div>
                  {detail && (
                    <div style={{ fontSize: 11, color: 'var(--ml-text-2)' }}>{detail}</div>
                  )}
                  {isSelected && (
                    <div
                      style={{
                        marginTop: 'auto',
                        display: 'flex',
                        gap: 6,
                        paddingTop: 6,
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditEvent(event);
                        }}
                        aria-label={t('dashboard:timeline.edit', { defaultValue: 'Edit' })}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          borderRadius: 999,
                          border: 'none',
                          background: 'var(--ml-text)',
                          color: 'var(--ml-bg)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          fontFamily: 'inherit',
                        }}
                      >
                        <Pencil size={11} />
                        {t('dashboard:timeline.edit', { defaultValue: 'Edit' })}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(event);
                        }}
                        aria-label={t('common:delete')}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          borderRadius: 999,
                          border: '0.5px solid var(--ml-line)',
                          background: 'transparent',
                          color: 'var(--ml-text)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          fontFamily: 'inherit',
                        }}
                      >
                        <Trash2 size={11} />
                        {t('dashboard:timeline.delete', { defaultValue: 'Delete' })}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {events.length === 0 && !loading && (
              <div
                className="serif italic"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 56,
                  right: 6,
                  transform: 'translateY(-50%)',
                  textAlign: 'center',
                  color: 'var(--ml-text-3)',
                  fontSize: 15,
                }}
              >
                {t('dashboard:timeline.noEventsRecorded', {
                  defaultValue: 'No events recorded for this day.',
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit modal */}
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
            <TummyTimeModal editEvent={editEvent} onClose={() => setEditEvent(null)} onSave={onModalSave} />
          )}
          {editEvent.event_type === 'bath' && (
            <BathModal editEvent={editEvent} onClose={() => setEditEvent(null)} onSave={onModalSave} />
          )}
          {editEvent.event_type === 'supplement' && (
            <SupplementModal editEvent={editEvent} onClose={() => setEditEvent(null)} onSave={onModalSave} />
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
