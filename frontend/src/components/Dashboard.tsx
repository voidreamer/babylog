/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { format } from 'date-fns';
import SleepWidget from './SleepWidget';
import FeedingWidget from './FeedingWidget';
import DiaperWidget from './DiaperWidget';
import PumpingWidget from './PumpingWidget';
import TummyTimeWidget from './TummyTimeWidget';
import BathWidget from './BathWidget';
import SupplementWidget from './SupplementWidget';
import PottyWidget from './PottyWidget';
import WidgetSettings from './WidgetSettings';
import FeedingModal from './FeedingModal';
import DiaperModal from './DiaperModal';
import SleepModal from './SleepModal';
import PumpingModal from './PumpingModal';
import PottyModal from './PottyModal';
import TummyTimeModal from './TummyTimeModal';
import BathModal from './BathModal';
import SupplementModal from './SupplementModal';
import DailySummary from './DailySummary';
import BabyGreeting from './BabyGreeting';
import ComingUp from './ComingUp';
import { motion } from 'framer-motion';
import { Baby } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Default visible widgets - stored in localStorage
const DEFAULT_VISIBLE_WIDGETS = ['feeding', 'diaper', 'sleep', 'pumping'];

export default function Dashboard() {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();
    const [dashboard, setDashboard] = useState<any>(null);
    const [latestGrowth, setLatestGrowth] = useState<any>(null);
    const [upcoming, setUpcoming] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [feedingModal, setFeedingModal] = useState(false);
    const [diaperModal, setDiaperModal] = useState(false);
    const [sleepModal, setSleepModal] = useState(false);
    const [pumpingModal, setPumpingModal] = useState(false);
    const [pottyModal, setPottyModal] = useState(false);
    const [tummyModal, setTummyModal] = useState(false);
    const [bathModal, setBathModal] = useState(false);
    const [supplementModal, setSupplementModal] = useState(false);

    // Widget visibility from localStorage
    const [visibleWidgets, setVisibleWidgets] = useState(() => {
        const saved = localStorage.getItem('visibleWidgets');
        return saved ? JSON.parse(saved) : DEFAULT_VISIBLE_WIDGETS;
    });

    // Quick actions setting from localStorage (default: enabled)
    const [quickActionsEnabled, setQuickActionsEnabled] = useState(() => {
        const saved = localStorage.getItem('quickActionsEnabled');
        return saved !== null ? JSON.parse(saved) : true;
    });

    // Sync with localStorage changes (from Settings page)
    useEffect(() => {
        const handleStorageChange = () => {
            const savedWidgets = localStorage.getItem('visibleWidgets');
            if (savedWidgets) {
                setVisibleWidgets(JSON.parse(savedWidgets));
            }
            const savedQuickActions = localStorage.getItem('quickActionsEnabled');
            if (savedQuickActions !== null) {
                setQuickActionsEnabled(JSON.parse(savedQuickActions));
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Toggle widget visibility
    const toggleWidget = (widgetId: string) => {
        setVisibleWidgets((prev: string[]) => {
            const updated = prev.includes(widgetId)
                ? prev.filter((id: string) => id !== widgetId)
                : [...prev, widgetId];
            localStorage.setItem('visibleWidgets', JSON.stringify(updated));
            window.dispatchEvent(new Event('storage'));
            return updated;
        });
    };

    // Toggle quick actions
    const toggleQuickActions = () => {
        setQuickActionsEnabled((prev: boolean) => {
            const updated = !prev;
            localStorage.setItem('quickActionsEnabled', JSON.stringify(updated));
            window.dispatchEvent(new Event('storage'));
            return updated;
        });
    };

    const loadData = async () => {
        if (!selectedBaby) return;

        try {
            const localDate = format(new Date(), 'yyyy-MM-dd');
            const tzOffset = new Date().getTimezoneOffset();
            const [dashboardData, growthRecords, upcomingData] = await Promise.all([
                api.getDashboard(selectedBaby.id, localDate, tzOffset),
                api.getGrowthRecords(selectedBaby.id).catch(() => []),
                api.getUpcoming(selectedBaby.id).catch(() => ({ upcoming: [] })),
            ]);
            setDashboard(dashboardData);
            if (growthRecords?.length > 0) {
                setLatestGrowth(growthRecords[growthRecords.length - 1]);
            }
            setUpcoming(upcomingData?.upcoming || []);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            toast.error(t('failedToLoadDashboard'), {
                description: t('failedToLoadDashboardDesc')
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
        setSupplementModal(false);
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
                <h2 className="empty-state-title">{t('common:noBabyAdded')}</h2>
                <p className="empty-state-text">{t('common:addBabyPrompt')}</p>
            </motion.div>
        );
    }

    if (loading) {
        return (
            <div>
                <div className="skeleton skeleton-greeting" />
                <div className="widgets-grid">
                    {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-widget" />)}
                </div>
            </div>
        );
    }

    return (
        <div>
            <BabyGreeting summary={dashboard?.daily_summary} latestGrowth={latestGrowth} />

            {/* Widgets Grid */}
            <div className="widgets-grid">
                {visibleWidgets.includes('feeding') && (
                    <FeedingWidget
                        babyId={selectedBaby.id}
                        lastFeeding={dashboard?.last_feeding}
                        onFeedingChange={loadData}
                        onOpenModal={() => setFeedingModal(true)}
                        quickActionsEnabled={quickActionsEnabled}
                    />
                )}

                {visibleWidgets.includes('diaper') && (
                    <DiaperWidget
                        babyId={selectedBaby.id}
                        lastDiaper={dashboard?.last_diaper}
                        onDiaperChange={loadData}
                        onOpenModal={() => setDiaperModal(true)}
                        quickActionsEnabled={quickActionsEnabled}
                    />
                )}

                {visibleWidgets.includes('sleep') && (
                    <SleepWidget
                        babyId={selectedBaby.id}
                        currentSleep={dashboard?.current_sleep}
                        lastSleep={dashboard?.last_sleep}
                        onSleepChange={loadData}
                        onOpenModal={() => setSleepModal(true)}
                    />
                )}

                {visibleWidgets.includes('pumping') && (
                    <PumpingWidget
                        lastPumping={dashboard?.last_pumping}
                        onPumpingChange={loadData}
                        onOpenModal={() => setPumpingModal(true)}
                        quickActionsEnabled={quickActionsEnabled}
                    />
                )}

                {visibleWidgets.includes('potty') && (
                    <PottyWidget
                        lastPotty={dashboard?.last_potty}
                        onPottyChange={loadData}
                        onOpenModal={() => setPottyModal(true)}
                        quickActionsEnabled={quickActionsEnabled}
                    />
                )}

                {visibleWidgets.includes('tummy') && (
                    <TummyTimeWidget
                        lastTummy={dashboard?.last_tummy}
                        onTummyChange={loadData}
                        onOpenModal={() => setTummyModal(true)}
                        quickActionsEnabled={quickActionsEnabled}
                    />
                )}

                {visibleWidgets.includes('bath') && (
                    <BathWidget
                        lastBath={dashboard?.last_bath}
                        onBathChange={loadData}
                        onOpenModal={() => setBathModal(true)}
                        quickActionsEnabled={quickActionsEnabled}
                    />
                )}

                {visibleWidgets.includes('supplement') && (
                    <SupplementWidget
                        lastSupplement={dashboard?.last_supplement}
                        onSupplementChange={loadData}
                        onOpenModal={() => setSupplementModal(true)}
                        quickActionsEnabled={quickActionsEnabled}
                    />
                )}

                {/* Widget Settings Button */}
                <WidgetSettings
                    visibleWidgets={visibleWidgets}
                    onToggle={toggleWidget}
                    quickActionsEnabled={quickActionsEnabled}
                    onToggleQuickActions={toggleQuickActions}
                />
            </div>

            <ComingUp items={upcoming} />

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

            {supplementModal && (
                <SupplementModal
                    onClose={() => setSupplementModal(false)}
                    onSave={handleEventLogged}
                />
            )}
        </div>
    );
}
