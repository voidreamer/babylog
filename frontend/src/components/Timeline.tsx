/* eslint-disable @typescript-eslint/no-explicit-any */
import { format } from 'date-fns';
import Icon from './Icon';
import { ClipboardList } from 'lucide-react';
import { parseUTCTime } from '../utils/parseTime';
import { useTranslation } from 'react-i18next';


interface TimelineProps { events: any[]; onRefresh?: () => void; }
export default function Timeline({ events, onRefresh }: TimelineProps) {
    const { t } = useTranslation('dashboard');

    const EVENT_CONFIG: Record<string, { label: string }> = {
        feeding: { label: t('feeding.title') },
        diaper: { label: t('diaper.title') },
        sleep: { label: t('sleep.title') },
        pumping: { label: t('pumping.title') },
        potty: { label: t('potty.title', { defaultValue: 'Potty' }) },
        tummy: { label: t('tummy.title', { defaultValue: 'Tummy Time' }) },
        bath: { label: t('bath.title', { defaultValue: 'Bath' }) },
        supplement: { label: t('supplement.title', { defaultValue: 'Supplement' }) },
        solid: { label: t('solid.title', { defaultValue: 'Solids' }) },
    };
    if (!events || events.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon" style={{ opacity: 0.5 }}><ClipboardList size={32} /></div>
                <p className="empty-state-text">{t('timeline.noEventsToday')}</p>
            </div>
        );
    }

    const getEventTitle = (event: any): string => {
        const config = EVENT_CONFIG[event.event_type] || { label: event.event_type };

        switch (event.event_type) {
            case 'feeding': {
                const feedTypeMap: Record<string, string> = {
                    breast: t('feeding.breast'),
                    bottle: t('feeding.bottle'),
                    breastmilk_bottle: t('feeding.breastBottle'),
                    formula: t('feeding.formula'),
                    solid: t('feeding.solid'),
                };
                return `${config.label} - ${feedTypeMap[event.details.type] || event.details.type}`;
            }
            case 'diaper': {
                const diaperTypeMap: Record<string, string> = { pee: t('diaper.pee'), poo: t('diaper.poo'), mixed: t('diaper.both') };
                let diaperLabel = `${config.label} - ${diaperTypeMap[event.details.type] || event.details.type}`;
                if (event.details.poo_amount) diaperLabel += ` (${event.details.poo_amount})`;
                return diaperLabel;
            }
            case 'sleep':
                return event.details.end_time
                    ? `${config.label} - ${event.details.duration_minutes || 0}min`
                    : `${config.label} - ${t('timeline.inProgress')}`;
            case 'pumping':
                return event.details.amount_ml
                    ? `${config.label} - ${event.details.amount_ml}ml`
                    : config.label;
            case 'solid':
                return event.details.food_name
                    ? `${config.label} - ${event.details.food_name}`
                    : config.label;
            case 'potty':
                return event.details.success
                    ? `${config.label} - ${t('timeline.success', { defaultValue: 'Success' })}`
                    : config.label;
            case 'tummy':
                return event.details.duration_minutes
                    ? `${config.label} - ${event.details.duration_minutes}min`
                    : config.label;
            default:
                return config.label;
        }
    };

    const getEventSubtitle = (event: any): string | null => {
        switch (event.event_type) {
            case 'feeding':
                const parts = [];
                if (event.details.duration_minutes) parts.push(`${event.details.duration_minutes}min`);
                if (event.details.amount_ml) parts.push(`${event.details.amount_ml}ml`);
                if (event.details.notes) parts.push(event.details.notes);
                return parts.join(' • ') || null;
            case 'diaper':
                const diaperParts = [];
                if (event.details.poo_color) diaperParts.push(event.details.poo_color);
                if (event.details.poo_consistency) diaperParts.push(event.details.poo_consistency);
                if (event.details.notes) diaperParts.push(event.details.notes);
                return diaperParts.join(' • ') || null;
            case 'sleep':
                return event.details.notes || null;
            case 'pumping':
                const pumpParts = [];
                if (event.details.duration_minutes) pumpParts.push(`${event.details.duration_minutes}min`);
                if (event.details.notes) pumpParts.push(event.details.notes);
                return pumpParts.join(' • ') || null;
            case 'solid':
                const solidParts = [];
                if (event.details.amount) solidParts.push(event.details.amount);
                if (event.details.reaction) solidParts.push(event.details.reaction);
                if (event.details.notes) solidParts.push(event.details.notes);
                return solidParts.join(' • ') || null;
            default:
                return event.details?.notes || null;
        }
    };

    return (
        <div className="timeline">
            {events.map((event) => (
                <div key={`${event.event_type}-${event.id}`} className="timeline-item">
                    <div className={`timeline-icon ${event.event_type}`}>
                        <Icon name={event.event_type} size={28} />
                    </div>
                    <div className="timeline-content">
                        <div className="timeline-title">{getEventTitle(event)}</div>
                        {getEventSubtitle(event) && (
                            <div className="timeline-subtitle">{getEventSubtitle(event)}</div>
                        )}
                    </div>
                    <div className="timeline-time">
                        {format(parseUTCTime(event.time), 'h:mm a')}
                    </div>
                </div>
            ))}
        </div>
    );
}
