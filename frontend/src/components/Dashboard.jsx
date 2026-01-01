import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { formatDistanceToNow, format, subDays } from 'date-fns';
import Widget from './Widget';
import QuickActions from './QuickActions';
import Timeline from './Timeline';
import FeedingModal from './FeedingModal';
import DiaperModal from './DiaperModal';
import SleepModal from './SleepModal';
import PumpingModal from './PumpingModal';
import DailySummary from './DailySummary';

export default function Dashboard() {
    const { selectedBaby } = useBaby();
    const [dashboard, setDashboard] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('today'); // 'today' or 'yesterday'

    const [feedingModal, setFeedingModal] = useState(false);
    const [diaperModal, setDiaperModal] = useState(false);
    const [sleepModal, setSleepModal] = useState(false);
    const [pumpingModal, setPumpingModal] = useState(false);

    const getDateParam = () => {
        if (selectedDate === 'yesterday') {
            return subDays(new Date(), 1).toISOString();
        }
        return null; // Today is default
    };

    const loadData = async () => {
        if (!selectedBaby) return;

        try {
            const dateParam = getDateParam();
            const [dashboardData, timelineData] = await Promise.all([
                api.getDashboard(selectedBaby.id),
                api.getTimeline(selectedBaby.id, dateParam),
            ]);
            setDashboard(dashboardData);
            setTimeline(timelineData);
        } catch (error) {
            // Silent fail - dashboard will show empty state
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedBaby, selectedDate]);

    // Parse time from API (UTC) to local Date object
    const parseUTCTime = (timeStr) => {
        if (!timeStr) return null;
        const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
        return new Date(utcTime);
    };

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return 'Never';
        return formatDistanceToNow(parseUTCTime(dateStr), { addSuffix: true });
    };

    const handleEventLogged = () => {
        setSelectedDate('today'); // Switch back to today after logging
        loadData();
        setFeedingModal(false);
        setDiaperModal(false);
        setSleepModal(false);
        setPumpingModal(false);
    };

    if (!selectedBaby) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">👶</div>
                <h2 className="empty-state-title">No baby added yet</h2>
                <p className="empty-state-text">Add your baby to start tracking</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Daily Summary */}
            <DailySummary summary={dashboard?.daily_summary} />

            {/* Widgets */}
            <div className="widgets-grid">
                <Widget
                    type="feeding"
                    label="Last feeding"
                    value={formatTimeAgo(dashboard?.last_feeding?.time)}
                    detail={dashboard?.last_feeding ?
                        `${dashboard.last_feeding.type}${dashboard.last_feeding.duration_minutes ? ` • ${dashboard.last_feeding.duration_minutes}min` : ''}`
                        : null}
                    onClick={() => setFeedingModal(true)}
                />

                <Widget
                    type="diaper"
                    label="Last diaper"
                    value={formatTimeAgo(dashboard?.last_diaper?.time)}
                    detail={dashboard?.last_diaper?.type}
                    onClick={() => setDiaperModal(true)}
                />

                <Widget
                    type="sleep"
                    label={dashboard?.current_sleep ? "Sleeping" : "Last sleep"}
                    value={dashboard?.current_sleep
                        ? formatTimeAgo(dashboard.current_sleep.start_time).replace('ago', '')
                        : formatTimeAgo(dashboard?.last_sleep?.start_time)}
                    detail={dashboard?.current_sleep
                        ? "Currently sleeping"
                        : dashboard?.last_sleep?.duration_minutes
                            ? `${dashboard.last_sleep.duration_minutes}min`
                            : null}
                    isSleeping={!!dashboard?.current_sleep}
                    onClick={() => setSleepModal(true)}
                />

                <Widget
                    type="pumping"
                    label="Last pumping"
                    value={formatTimeAgo(dashboard?.last_pumping?.time)}
                    detail={dashboard?.last_pumping?.amount_ml
                        ? `${dashboard.last_pumping.amount_ml}ml`
                        : null}
                    onClick={() => setPumpingModal(true)}
                />
            </div>

            {/* Timeline */}
            <div className="card">
                <div className="card-header" style={{ flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <h3 className="card-title" style={{ margin: 0 }}>
                            {selectedDate === 'today' ? "Today's Timeline" : "Yesterday's Timeline"}
                        </h3>
                    </div>
                    <div className="type-selector" style={{ width: '100%' }}>
                        <button
                            type="button"
                            className={`type-btn ${selectedDate === 'today' ? 'active' : ''}`}
                            onClick={() => setSelectedDate('today')}
                            style={{ flex: 1 }}
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            className={`type-btn ${selectedDate === 'yesterday' ? 'active' : ''}`}
                            onClick={() => setSelectedDate('yesterday')}
                            style={{ flex: 1 }}
                        >
                            Yesterday
                        </button>
                    </div>
                </div>
                <Timeline events={timeline} onRefresh={loadData} />
            </div>

            {/* Quick Actions */}
            <QuickActions
                onFeeding={() => setFeedingModal(true)}
                onDiaper={() => setDiaperModal(true)}
                onSleep={() => setSleepModal(true)}
                onPumping={() => setPumpingModal(true)}
            />

            {/* Modals */}
            {feedingModal && (
                <FeedingModal
                    babyId={selectedBaby.id}
                    onClose={() => setFeedingModal(false)}
                    onSave={handleEventLogged}
                />
            )}

            {diaperModal && (
                <DiaperModal
                    babyId={selectedBaby.id}
                    onClose={() => setDiaperModal(false)}
                    onSave={handleEventLogged}
                />
            )}

            {sleepModal && (
                <SleepModal
                    babyId={selectedBaby.id}
                    currentSleep={dashboard?.current_sleep}
                    onClose={() => setSleepModal(false)}
                    onSave={handleEventLogged}
                />
            )}

            {pumpingModal && (
                <PumpingModal
                    babyId={selectedBaby.id}
                    onClose={() => setPumpingModal(false)}
                    onSave={handleEventLogged}
                />
            )}
        </div>
    );
}
