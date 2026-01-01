import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { formatDistanceToNow, format } from 'date-fns';
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

    const [feedingModal, setFeedingModal] = useState(false);
    const [diaperModal, setDiaperModal] = useState(false);
    const [sleepModal, setSleepModal] = useState(false);
    const [pumpingModal, setPumpingModal] = useState(false);

    const loadData = async () => {
        if (!selectedBaby) return;

        try {
            const [dashboardData, timelineData] = await Promise.all([
                api.getDashboard(selectedBaby.id),
                api.getTimeline(selectedBaby.id),
            ]);
            setDashboard(dashboardData);
            setTimeline(timelineData);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedBaby]);

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return 'Never';
        return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    };

    const handleEventLogged = () => {
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
                    icon="🍼"
                    label="Last feeding"
                    value={formatTimeAgo(dashboard?.last_feeding?.time)}
                    detail={dashboard?.last_feeding ?
                        `${dashboard.last_feeding.type}${dashboard.last_feeding.duration_minutes ? ` • ${dashboard.last_feeding.duration_minutes}min` : ''}`
                        : null}
                    onClick={() => setFeedingModal(true)}
                />

                <Widget
                    type="diaper"
                    icon="🧷"
                    label="Last diaper"
                    value={formatTimeAgo(dashboard?.last_diaper?.time)}
                    detail={dashboard?.last_diaper?.type}
                    onClick={() => setDiaperModal(true)}
                />

                <Widget
                    type="sleep"
                    icon={dashboard?.current_sleep ? "😴" : "🌙"}
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
                    type="stats"
                    icon="📊"
                    label="Today"
                    value={timeline.length}
                    detail="events logged"
                />
            </div>

            {/* Timeline */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Today's Timeline</h3>
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
