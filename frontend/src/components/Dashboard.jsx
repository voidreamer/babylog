import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { format } from 'date-fns';
import Widget from './Widget';
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

export default function Dashboard() {
    const { selectedBaby } = useBaby();
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    const [feedingModal, setFeedingModal] = useState(false);
    const [diaperModal, setDiaperModal] = useState(false);
    const [sleepModal, setSleepModal] = useState(false);
    const [pumpingModal, setPumpingModal] = useState(false);
    const [pottyModal, setPottyModal] = useState(false);
    const [tummyModal, setTummyModal] = useState(false);
    const [bathModal, setBathModal] = useState(false);

    const loadData = async () => {
        if (!selectedBaby) return;

        try {
            // Send local date and timezone offset to fix timezone issues
            const localDate = format(new Date(), 'yyyy-MM-dd');
            const tzOffset = new Date().getTimezoneOffset(); // Minutes offset from UTC (e.g., 300 for EST)
            const dashboardData = await api.getDashboard(selectedBaby.id, localDate, tzOffset);
            setDashboard(dashboardData);
        } catch (error) {
            // Silent fail
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedBaby]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!selectedBaby) return;
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [selectedBaby]);

    // Parse time from API (UTC) to local Date object
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
        setFeedingModal(false);
        setDiaperModal(false);
        setSleepModal(false);
        setPumpingModal(false);
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
            {/* Baby Greeting Card */}
            <BabyGreeting summary={dashboard?.daily_summary} />

            {/* Widgets - Primary Actions */}
            <div className="widgets-grid">
                <Widget
                    type="feeding"
                    label="Feeding"
                    value={formatTime(dashboard?.last_feeding?.time)}
                    lastTime={dashboard?.last_feeding?.time}
                    detail={dashboard?.last_feeding ?
                        `${dashboard.last_feeding.type}${dashboard.last_feeding.duration_minutes ? ` • ${dashboard.last_feeding.duration_minutes}min` : ''}`
                        : null}
                    onClick={() => setFeedingModal(true)}
                />

                <Widget
                    type="diaper"
                    label="Diaper"
                    value={formatTime(dashboard?.last_diaper?.time)}
                    lastTime={dashboard?.last_diaper?.time}
                    detail={dashboard?.last_diaper?.type}
                    onClick={() => setDiaperModal(true)}
                />

                <Widget
                    type="sleep"
                    label={dashboard?.current_sleep ? "Sleeping" : "Sleep"}
                    value={dashboard?.current_sleep
                        ? `Since ${formatTime(dashboard.current_sleep.start_time)}`
                        : formatTime(dashboard?.last_sleep?.start_time)}
                    lastTime={dashboard?.current_sleep?.start_time || dashboard?.last_sleep?.start_time}
                    detail={dashboard?.current_sleep
                        ? "Currently sleeping 💤"
                        : dashboard?.last_sleep?.duration_minutes
                            ? `${dashboard.last_sleep.duration_minutes}min`
                            : null}
                    isSleeping={!!dashboard?.current_sleep}
                    onClick={() => setSleepModal(true)}
                />

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

                <Widget
                    type="potty"
                    label="Potty"
                    onClick={() => setPottyModal(true)}
                />

                <Widget
                    type="tummy"
                    label="Tummy Time"
                    onClick={() => setTummyModal(true)}
                />

                <Widget
                    type="bath"
                    label="Bath"
                    onClick={() => setBathModal(true)}
                />
            </div>

            {/* Daily Summary - Below widgets */}
            <DailySummary summary={dashboard?.daily_summary} />

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
