import { useState, useEffect } from 'react';
import { Baby, Droplets, Moon, Heart, BarChart3, ArrowLeftRight } from 'lucide-react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { format, subDays } from 'date-fns';

export default function DailySummary({ summary }) {
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

    const buildStats = (data) => {
        if (!data) return [];
        return [
            {
                icon: Baby,
                value: data.total_feedings || 0,
                label: 'feedings',
                color: 'var(--feeding)',
                extra: data.total_ml > 0 ? `${data.total_ml}ml` : null
            },
            {
                icon: Droplets,
                value: data.total_diapers || 0,
                label: 'diapers',
                color: 'var(--diaper)',
                extra: `${data.pee_count || 0} wet, ${data.poo_count || 0} dirty`
            },
            {
                icon: Moon,
                value: formatTime(data.total_sleep_minutes),
                label: 'sleep',
                color: 'var(--sleep)',
                extra: `${data.sleep_count || 0} naps`
            },
            ...(data.pumping_count > 0 ? [{
                icon: Heart,
                value: data.pumping_count,
                label: 'pumps',
                color: 'var(--pumping)',
                extra: data.total_pumping_ml > 0 ? `${data.total_pumping_ml}ml` : null
            }] : [])
        ];
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
