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
import SolidWidget from './SolidWidget';
import WidgetSettings from './WidgetSettings';
import FeedingModal from './FeedingModal';
import DiaperModal from './DiaperModal';
import SleepModal from './SleepModal';
import PumpingModal from './PumpingModal';
import PottyModal from './PottyModal';
import TummyTimeModal from './TummyTimeModal';
import BathModal from './BathModal';
import SupplementModal from './SupplementModal';
import SolidModal from './SolidModal';
import DailySummary from './DailySummary';
import BabyGreeting from './BabyGreeting';
import ComingUp from './ComingUp';
import { motion } from 'framer-motion';
import { Baby, WifiOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { calculateAgeInMonths } from '../utils/ageUtils';

type ModalType = 'feeding'|'diaper'|'sleep'|'pumping'|'potty'|'tummy'|'bath'|'supplement'|'solid'|null;

function getDefaultWidgets(ageMonths: number | null): string[] {
    const widgets = ['feeding', 'diaper', 'sleep'];
    if (ageMonths === null || ageMonths <= 12) {
        widgets.push('pumping', 'tummy', 'supplement');
    }
    if (ageMonths !== null && ageMonths >= 4) {
        widgets.push('solid');
    }
    if (ageMonths !== null && ageMonths >= 18) {
        widgets.push('potty');
    }
    widgets.push('bath');
    return widgets;
}

// Warm the IDB cache for all event types so offline mode has real data.
// Throttled to once every 5 minutes so the 30s dashboard poll doesn't spam the API.
let lastCacheWarm = 0;
const CACHE_WARM_INTERVAL = 5 * 60 * 1000;

function warmOfflineCache(babyId: number): void {
    if (!navigator.onLine) return;
    const now = Date.now();
    if (now - lastCacheWarm < CACHE_WARM_INTERVAL) return;
    lastCacheWarm = now;
    Promise.all([
        api.getFeedings(babyId),
        api.getDiapers(babyId),
        api.getSleeps(babyId),
        api.getPumpings(babyId),
        api.getPottyLogs(babyId),
        api.getTummyTimes(babyId),
        api.getBaths(babyId),
        api.getSupplements(babyId),
        api.getSolids(babyId),
    ]).catch(() => {}); // fire-and-forget; errors are silently ignored
}

export default function Dashboard() {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();
    // Instant render: hydrate from localStorage cache synchronously (no flash)
    const cacheKey = selectedBaby ? `heybub_dashboard_${selectedBaby.id}` : '';
    const [dashboard, setDashboard] = useState<any>(() => {
        if (!cacheKey) return null;
        try { const raw = localStorage.getItem(cacheKey); return raw ? JSON.parse(raw) : null; } catch { return null; }
    });
    const [latestGrowth, setLatestGrowth] = useState<any>(() => {
        try { const raw = localStorage.getItem('heybub_latest_growth'); return raw ? JSON.parse(raw) : null; } catch { return null; }
    });
    const [upcoming, setUpcoming] = useState<any[]>(() => {
        try { const raw = localStorage.getItem('heybub_upcoming'); return raw ? JSON.parse(raw) : []; } catch { return []; }
    });
    // If we have cached data, skip the loading skeleton entirely
    const [loading, setLoading] = useState(!dashboard);
    const [refreshing, setRefreshing] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Single modal state
    const [activeModal, setActiveModal] = useState<ModalType>(null);

    // Widget visibility from localStorage (age-gated defaults)
    const ageMonths = selectedBaby?.birth_date ? calculateAgeInMonths(selectedBaby.birth_date) : null;
    const [visibleWidgets, setVisibleWidgets] = useState(() => {
        const saved = localStorage.getItem('visibleWidgets');
        return saved ? JSON.parse(saved) : getDefaultWidgets(ageMonths);
    });

    // Quick actions setting from localStorage (default: enabled)
    const [quickActionsEnabled, setQuickActionsEnabled] = useState(() => {
        const saved = localStorage.getItem('quickActionsEnabled');
        return saved !== null ? JSON.parse(saved) : true;
    });

    // Track online/offline status
    useEffect(() => {
        const goOnline = () => setIsOffline(false);
        const goOffline = () => setIsOffline(true);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
    }, []);

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

        const isInitialLoad = !dashboard;
        if (!isInitialLoad) setRefreshing(true);

        try {
            const localDate = format(new Date(), 'yyyy-MM-dd');
            const tzOffset = new Date().getTimezoneOffset();
            const [dashboardData, growthRecords, upcomingData] = await Promise.all([
                api.getDashboard(selectedBaby.id, localDate, tzOffset),
                api.getGrowthRecords(selectedBaby.id).catch(() => []),
                api.getUpcoming(selectedBaby.id).catch(() => ({ upcoming: [] })),
            ]);
            setDashboard(dashboardData);
            // Persist to localStorage for instant render on next app open
            try { localStorage.setItem(cacheKey, JSON.stringify(dashboardData)); } catch { /* quota */ }
            if (growthRecords?.length > 0) {
                const latest = growthRecords[growthRecords.length - 1];
                setLatestGrowth(latest);
                try { localStorage.setItem('heybub_latest_growth', JSON.stringify(latest)); } catch { /* quota */ }
            }
            const upcomingItems = upcomingData?.upcoming || [];
            setUpcoming(upcomingItems);
            try { localStorage.setItem('heybub_upcoming', JSON.stringify(upcomingItems)); } catch { /* quota */ }
            warmOfflineCache(selectedBaby.id);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            // Only toast on initial load when we have no data at all
            if (isInitialLoad && !dashboard) {
                toast.error(t('failedToLoadDashboard'), {
                    description: navigator.onLine ? t('failedToLoadDashboardDesc') : t('offlineDesc')
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
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
        setActiveModal(null);
        loadData();
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
            {/* Status indicators */}
            {isOffline && (
                <div className="dashboard-status offline">
                    <WifiOff size={14} />
                    <span>{t('statusOffline')}</span>
                </div>
            )}
            {refreshing && !isOffline && (
                <div className="dashboard-status fetching">
                    <RefreshCw size={14} className="spin" />
                    <span>{t('statusFetching')}</span>
                </div>
            )}

            <BabyGreeting summary={dashboard?.daily_summary} latestGrowth={latestGrowth} />

            {/* Widgets Grid */}
            <div className="widgets-grid">
                {visibleWidgets.includes('feeding') && (
                    <FeedingWidget
                        babyId={selectedBaby.id}
                        lastFeeding={dashboard?.last_feeding}
                        onFeedingChange={loadData}
                        onOpenModal={() => setActiveModal('feeding')}
                        quickActionsEnabled={quickActionsEnabled}
                    />
                )}

                {visibleWidgets.includes('diaper') && (
                    <DiaperWidget
                        babyId={selectedBaby.id}
                        lastDiaper={dashboard?.last_diaper}
                        onDiaperChange={loadData}
                        onOpenModal={() => setActiveModal('diaper')}
                        quickActionsEnabled={quickActionsEnabled}
                    />
                )}

                {visibleWidgets.includes('sleep') && (
                    <SleepWidget
                        babyId={selectedBaby.id}
                        currentSleep={dashboard?.current_sleep}
                        lastSleep={dashboard?.last_sleep}
                        onSleepChange={loadData}
                        onOpenModal={() => setActiveModal('sleep')}
                    />
                )}

                {visibleWidgets.includes('pumping') && (
                    <PumpingWidget
                        lastPumping={dashboard?.last_pumping}
                        onPumpingChange={loadData}
                        onOpenModal={() => setActiveModal('pumping')}
                        quickActionsEnabled={quickActionsEnabled}
                    />
                )}

                {visibleWidgets.includes('potty') && (
                    <PottyWidget
                        lastPotty={dashboard?.last_potty}
                        onPottyChange={loadData}
                        onOpenModal={() => setActiveModal('potty')}
                        quickActionsEnabled={quickActionsEnabled}
                    />
                )}

                {visibleWidgets.includes('tummy') && (
                    <TummyTimeWidget
                        lastTummy={dashboard?.last_tummy}
                        onTummyChange={loadData}
                        onOpenModal={() => setActiveModal('tummy')}
                        quickActionsEnabled={quickActionsEnabled}
                    />
                )}

                {visibleWidgets.includes('bath') && (
                    <BathWidget
                        lastBath={dashboard?.last_bath}
                        onBathChange={loadData}
                        onOpenModal={() => setActiveModal('bath')}
                        quickActionsEnabled={quickActionsEnabled}
                    />
                )}

                {visibleWidgets.includes('supplement') && (
                    <SupplementWidget
                        lastSupplement={dashboard?.last_supplement}
                        onSupplementChange={loadData}
                        onOpenModal={() => setActiveModal('supplement')}
                        quickActionsEnabled={quickActionsEnabled}
                    />
                )}

                {visibleWidgets.includes('solid') && (
                    <SolidWidget
                        lastSolid={dashboard?.last_solid}
                        onSolidChange={loadData}
                        onOpenModal={() => setActiveModal('solid')}
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
            {activeModal === 'feeding' && (
                <FeedingModal
                    babyId={selectedBaby.id}
                    onClose={() => setActiveModal(null)}
                    onSave={handleEventLogged}
                />
            )}

            {activeModal === 'diaper' && (
                <DiaperModal
                    babyId={selectedBaby.id}
                    onClose={() => setActiveModal(null)}
                    onSave={handleEventLogged}
                />
            )}

            {activeModal === 'sleep' && (
                <SleepModal
                    babyId={selectedBaby.id}
                    onClose={() => setActiveModal(null)}
                    onSave={handleEventLogged}
                />
            )}

            {activeModal === 'pumping' && (
                <PumpingModal
                    babyId={selectedBaby.id}
                    onClose={() => setActiveModal(null)}
                    onSave={handleEventLogged}
                />
            )}

            {activeModal === 'potty' && (
                <PottyModal
                    onClose={() => setActiveModal(null)}
                    onSave={handleEventLogged}
                />
            )}

            {activeModal === 'tummy' && (
                <TummyTimeModal
                    onClose={() => setActiveModal(null)}
                    onSave={handleEventLogged}
                />
            )}

            {activeModal === 'bath' && (
                <BathModal
                    onClose={() => setActiveModal(null)}
                    onSave={handleEventLogged}
                />
            )}

            {activeModal === 'supplement' && (
                <SupplementModal
                    onClose={() => setActiveModal(null)}
                    onSave={handleEventLogged}
                />
            )}

            {activeModal === 'solid' && (
                <SolidModal
                    onClose={() => setActiveModal(null)}
                    onSave={handleEventLogged}
                />
            )}
        </div>
    );
}
