import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { format } from 'date-fns';
import Widget from './Widget';
import WidgetSettings from './WidgetSettings';
import FeedingModal from './FeedingModal';
import DiaperModal from './DiaperModal';
import SleepModal from './SleepModal';
import PumpingModal from './PumpingModal';
import PottyModal from './PottyModal';
import TummyTimeModal from './TummyTimeModal';
import BathModal from './BathModal';
import DailySummary from './DailySummary';
import BabyGreeting from './BabyGreeting';
import { motion } from 'framer-motion';
import { Baby } from 'lucide-react';

// Default visible widgets - stored in localStorage
const DEFAULT_VISIBLE_WIDGETS = ['feeding', 'diaper', 'sleep', 'pumping'];

export default function Dashboard() {
    const { selectedBaby } = useBaby();
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [feedingModal, setFeedingModal] = useState(false);
    const [diaperModal, setDiaperModal] = useState(false);
    const [sleepModal, setSleepModal] = useState(false);
    const [pumpingModal, setPumpingModal] = useState(false);
    const [pottyModal, setPottyModal] = useState(false);
    const [tummyModal, setTummyModal] = useState(false);
    const [bathModal, setBathModal] = useState(false);

    // Widget visibility from localStorage
    const [visibleWidgets, setVisibleWidgets] = useState(() => {
        const saved = localStorage.getItem('visibleWidgets');
        return saved ? JSON.parse(saved) : DEFAULT_VISIBLE_WIDGETS;
    });

    // Sync with localStorage changes (from Settings page)
    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('visibleWidgets');
            if (saved) {
                setVisibleWidgets(JSON.parse(saved));
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Toggle widget visibility
    const toggleWidget = (widgetId) => {
        setVisibleWidgets(prev => {
            const updated = prev.includes(widgetId)
                ? prev.filter(id => id !== widgetId)
                : [...prev, widgetId];
            localStorage.setItem('visibleWidgets', JSON.stringify(updated));
            window.dispatchEvent(new Event('storage'));
            return updated;
        });
    };

    const loadData = async () => {
        if (!selectedBaby) return;

        try {
            const localDate = format(new Date(), 'yyyy-MM-dd');
            const tzOffset = new Date().getTimezoneOffset();
            const dashboardData = await api.getDashboard(selectedBaby.id, localDate, tzOffset);
            setDashboard(dashboardData);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            toast.error('Failed to load dashboard', {
                description: 'Please check your connection and try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedBaby]);

    useEffect(() => {
        if (!selectedBaby) return;
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [selectedBaby]);

    const parseUTCTime = (timeStr) => {
        if (!timeStr) return null;
        const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
        return new Date(utcTime);
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return 'Never';
        return format(parseUTCTime(dateStr), 'h:mm a');
    };

    const handleEventLogged = () => {
        loadData();
        // Close all modals
        setFeedingModal(false);
        setDiaperModal(false);
        setSleepModal(false);
        setPumpingModal(false);
        setPottyModal(false);
        setTummyModal(false);
        setBathModal(false);
    };

    if (!selectedBaby) {
        return (
            <motion.div
                className="empty-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div className="empty-state-icon"><Baby size={48} /></div>
                <h2 className="empty-state-title">No baby added yet</h2>
                <p className="empty-state-text">Add your baby to start tracking</p>
            </motion.div>
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
            <BabyGreeting summary={dashboard?.daily_summary} />

            {/* Widgets Grid */}
            <div className="widgets-grid">
                {visibleWidgets.includes('feeding') && (
                    <Widget
                        type="feeding"
                        label="Feeding"
                        value={formatTime(dashboard?.last_feeding?.time)}
                        lastTime={dashboard?.last_feeding?.time}
                        detail={dashboard?.last_feeding ?
                            `${dashboard.last_feeding.type === 'breastmilk_bottle' || dashboard.last_feeding.type === 'bottle'
                                ? 'Breastmilk Bottle'
                                : dashboard.last_feeding.type.charAt(0).toUpperCase() + dashboard.last_feeding.type.slice(1)}${dashboard.last_feeding.duration_minutes ? ` • ${dashboard.last_feeding.duration_minutes}min` : ''}`
                            : null}
                        onClick={() => setFeedingModal(true)}
                    />
                )}

                {visibleWidgets.includes('diaper') && (
                    <Widget
                        type="diaper"
                        label="Diaper"
                        value={formatTime(dashboard?.last_diaper?.time)}
                        lastTime={dashboard?.last_diaper?.time}
                        detail={dashboard?.last_diaper?.type}
                        onClick={() => setDiaperModal(true)}
                    />
                )}

                {visibleWidgets.includes('sleep') && (
                    <Widget
                        type="sleep"
                        label={dashboard?.current_sleep ? "Sleeping" : "Sleep"}
                        value={dashboard?.current_sleep
                            ? `Since ${formatTime(dashboard.current_sleep.start_time)}`
                            : formatTime(dashboard?.last_sleep?.start_time)}
                        lastTime={dashboard?.current_sleep?.start_time || dashboard?.last_sleep?.start_time}
                        detail={dashboard?.current_sleep
                            ? "Sleeping 💤"
                            : dashboard?.last_sleep?.duration_minutes
                                ? `${dashboard.last_sleep.duration_minutes}min`
                                : null}
                        isSleeping={!!dashboard?.current_sleep}
                        onClick={() => setSleepModal(true)}
                    />
                )}

                {visibleWidgets.includes('pumping') && (
                    <Widget
                        type="pumping"
                        label="Pumping"
                        value={formatTime(dashboard?.last_pumping?.time)}
                        lastTime={dashboard?.last_pumping?.time}
                        detail={dashboard?.last_pumping?.amount_ml
                            ? `${dashboard.last_pumping.amount_ml}ml`
                            : null}
                        onClick={() => setPumpingModal(true)}
                    />
                )}

                {visibleWidgets.includes('potty') && (
                    <Widget
                        type="potty"
                        label="Potty"
                        value={formatTime(dashboard?.last_potty?.time)}
                        lastTime={dashboard?.last_potty?.time}
                        detail={dashboard?.last_potty?.result}
                        onClick={() => setPottyModal(true)}
                    />
                )}

                {visibleWidgets.includes('tummy') && (
                    <Widget
                        type="tummy"
                        label="Tummy Time"
                        value={formatTime(dashboard?.last_tummy?.start_time)}
                        lastTime={dashboard?.last_tummy?.start_time}
                        detail={dashboard?.last_tummy?.duration_minutes
                            ? `${dashboard.last_tummy.duration_minutes}min`
                            : null}
                        onClick={() => setTummyModal(true)}
                    />
                )}

                {visibleWidgets.includes('bath') && (
                    <Widget
                        type="bath"
                        label="Bath"
                        value={formatTime(dashboard?.last_bath?.time)}
                        lastTime={dashboard?.last_bath?.time}
                        onClick={() => setBathModal(true)}
                    />
                )}

                {/* Widget Settings Button */}
                <WidgetSettings
                    visibleWidgets={visibleWidgets}
                    onToggle={toggleWidget}
                />
            </div>

            {/* Daily Summary */}
            <DailySummary summary={dashboard?.daily_summary} visibleWidgets={visibleWidgets} />

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

            {pottyModal && (
                <PottyModal
                    onClose={() => setPottyModal(false)}
                    onSave={handleEventLogged}
                />
            )}

            {tummyModal && (
                <TummyTimeModal
                    onClose={() => setTummyModal(false)}
                    onSave={handleEventLogged}
                />
            )}

            {bathModal && (
                <BathModal
                    onClose={() => setBathModal(false)}
                    onSave={handleEventLogged}
                />
            )}
        </div>
    );
}
