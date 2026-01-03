import { useState, useEffect } from 'react';
import { Baby, Droplets, Moon, Heart, BarChart3, Toilet, Timer, Bath as BathIcon } from 'lucide-react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { format, subDays } from 'date-fns';

export default function DailySummary({ summary, visibleWidgets = ['feeding', 'diaper', 'sleep', 'pumping'] }) {
    const { selectedBaby } = useBaby();
    const [activeTab, setActiveTab] = useState('today');
    const [yesterdaySummary, setYesterdaySummary] = useState(null);
    const [loadingYesterday, setLoadingYesterday] = useState(false);

    // Fetch yesterday's data when tab switches
    useEffect(() => {
        if (activeTab === 'yesterday' && !yesterdaySummary && selectedBaby) {
            setLoadingYesterday(true);
            const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
            const tzOffset = new Date().getTimezoneOffset();

            api.getDashboard(selectedBaby.id, yesterday, tzOffset)
                .then(data => {
                    setYesterdaySummary(data?.daily_summary || null);
                })
                .catch(() => {
                    setYesterdaySummary(null);
                })
                .finally(() => {
                    setLoadingYesterday(false);
                });
        }
    }, [activeTab, selectedBaby, yesterdaySummary]);

    if (!summary) return null;

    const formatTime = (minutes) => {
        if (!minutes) return '0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    // Build diaper detail string including mixed
    const buildDiaperDetail = (data) => {
        const parts = [];
        if (data.pee_count > 0) parts.push(`${data.pee_count} wet`);
        if (data.poo_count > 0) parts.push(`${data.poo_count} dirty`);
        if (data.mixed_count > 0) parts.push(`${data.mixed_count} mixed`);
        return parts.length > 0 ? parts.join(', ') : null;
    };

    const buildStats = (data) => {
        if (!data) return [];
        const allStats = [
            {
                id: 'feeding',
                icon: Baby,
                value: data.total_feedings || 0,
                label: 'feedings',
                color: 'var(--feeding)',
                extra: data.total_ml > 0 ? `${data.total_ml}ml` : null
            },
            {
                id: 'diaper',
                icon: Droplets,
                value: data.total_diapers || 0,
                label: 'diapers',
                color: 'var(--diaper)',
                extra: buildDiaperDetail(data)
            },
            {
                id: 'sleep',
                icon: Moon,
                value: formatTime(data.total_sleep_minutes),
                label: 'sleep',
                color: 'var(--sleep)',
                extra: `${data.sleep_count || 0} naps`
            },
            ...(data.pumping_count > 0 ? [{
                id: 'pumping',
                icon: Heart,
                value: data.pumping_count,
                label: 'pumps',
                color: 'var(--pumping)',
                extra: data.total_pumping_ml > 0 ? `${data.total_pumping_ml}ml` : null
            }] : []),
            ...(data.potty_count > 0 ? [{
                id: 'potty',
                icon: Toilet,
                value: data.potty_count,
                label: 'potty',
                color: 'var(--potty)',
                extra: data.potty_success_count > 0 ? `${data.potty_success_count} success` : null
            }] : []),
            ...(data.tummy_count > 0 ? [{
                id: 'tummy',
                icon: Timer,
                value: data.tummy_count,
                label: 'tummy time',
                color: 'var(--tummy)',
                extra: data.tummy_minutes > 0 ? formatTime(data.tummy_minutes) : null
            }] : []),
            ...(data.bath_count > 0 ? [{
                id: 'bath',
                icon: BathIcon,
                value: data.bath_count,
                label: data.bath_count === 1 ? 'bath' : 'baths',
                color: 'var(--bath)',
                extra: null
            }] : [])
        ];
        // Filter to only show visible widgets
        return allStats.filter(stat => visibleWidgets.includes(stat.id));
    };

    const currentData = activeTab === 'today' ? summary : yesterdaySummary;
    const stats = buildStats(currentData);

    return (
        <div className="daily-summary">
            <div className="daily-summary-header">
                <div className="daily-summary-title">
                    <BarChart3 size={18} />
                    <span>Daily Summary</span>
                </div>

                {/* Tab Switcher */}
                <div className="summary-tabs">
                    <button
                        className={`summary-tab ${activeTab === 'today' ? 'active' : ''}`}
                        onClick={() => setActiveTab('today')}
                    >
                        Today
                    </button>
                    <button
                        className={`summary-tab ${activeTab === 'yesterday' ? 'active' : ''}`}
                        onClick={() => setActiveTab('yesterday')}
                    >
                        Yesterday
                    </button>
                </div>
            </div>

            <div className="daily-summary-content">
                {loadingYesterday ? (
                    <div className="daily-summary-loading">Loading...</div>
                ) : stats.length > 0 ? (
                    stats.map((stat, index) => (
                        <div key={index} className="daily-summary-stat">
                            <stat.icon size={24} style={{ color: stat.color }} />
                            <div className="daily-summary-stat-value" style={{ color: stat.color }}>
                                {stat.value}
                            </div>
                            <div className="daily-summary-stat-label">{stat.label}</div>
                            {stat.extra && (
                                <div className="daily-summary-stat-extra">{stat.extra}</div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="daily-summary-empty">
                        No data for {activeTab === 'today' ? 'today' : 'yesterday'}
                    </div>
                )}
            </div>
        </div>
    );
}
