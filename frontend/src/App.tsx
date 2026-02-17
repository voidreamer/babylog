/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { BabyProvider, useBaby } from './hooks/useBaby';
import { useOfflineSync } from './hooks/useOfflineSync';
import { api } from './api/client';
import { checkRateLimit, recordAttempt, getTimeUntilReset, clearRateLimit } from './utils/rateLimiter';
import { hapticSelection } from './utils/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import TimelineCalendar from './components/TimelineCalendar';
import Onboarding from './components/Onboarding';
import SpotlightTour from './components/SpotlightTour';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineIndicator from './components/OfflineIndicator';
import LoadingSpinner from './components/LoadingSpinner';
import Insights from './components/Insights';
import LanguageSwitcher from './components/LanguageSwitcher';

// Lazy load routes for bundle splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const Callback = lazy(() => import('./pages/Callback'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Health = lazy(() => import('./pages/Health'));
import { Home, Clock, Activity, PieChart, Settings as SettingsIcon, LogOut, ChevronRight, User, FileText, Moon, Sun, Star, Sparkles, Download, Shield, Globe, Crown, Bell, Baby, TrendingUp, Mail, Trash2, AlertTriangle } from 'lucide-react';
import { getNotificationSettings, saveNotificationSettings, requestNotificationPermission, rescheduleAll, cancelAll, checkAndShowWebReminders, sendTestNotification, type NotificationSettings } from './utils/notificationScheduler';
import UpgradeDialog from './components/UpgradeDialog';
import CaregiverModal from './components/CaregiverModal';
import BabyProfile from './components/BabyProfile';
import BabyAvatar from './components/BabyAvatar';
import { Toaster, toast } from 'sonner';

// SettingsPage component
interface SettingsPageProps { user: any; isDark: boolean; toggleTheme: () => void; isPremium: boolean; hasStripeSubscription: boolean; exportLoading: boolean; handleExportCsv: () => void; babies: any[]; setShowPrivacyPolicy: (v: boolean) => void; logout: () => void; onUpgrade: () => void; onManage: () => void; setActiveTab: (tab: string) => void; hubUrl: string; onRefreshBabies: () => void; onReplayOnboarding: () => void; }
function SettingsPage({ user, isDark, toggleTheme, isPremium, hasStripeSubscription, exportLoading, handleExportCsv, babies, setShowPrivacyPolicy, logout, onUpgrade, onManage, setActiveTab, hubUrl, onRefreshBabies, onReplayOnboarding }: SettingsPageProps) {
    const { t } = useTranslation(['settings', 'common']);
    const [notifSettings, setNotifSettings] = useState<NotificationSettings>(getNotificationSettings);
    const [unitsSystem, setUnitsSystem] = useState(() => localStorage.getItem('heybub-units') || 'metric');
    const [showShareModal, setShowShareModal] = useState(false);
    const [showBabyProfile, setShowBabyProfile] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const currentBaby = babies?.[0];

    if (showBabyProfile) {
        return <BabyProfile onBack={() => setShowBabyProfile(false)} />;
    }

    const updateNotifSettings = (patch: Partial<NotificationSettings>) => {
        const next = { ...notifSettings, ...patch };
        setNotifSettings(next);
        saveNotificationSettings(next);
        if (next.enabled && currentBaby) {
            rescheduleAll(currentBaby.id, currentBaby.name);
        }
    };

    const toggleNotificationsEnabled = async () => {
        try {
            if (!notifSettings.enabled) {
                console.log('[Notifications] Requesting permission...');
                const granted = await requestNotificationPermission();
                console.log('[Notifications] Permission granted:', granted);
                if (!granted) {
                    toast.error(t('settings:notifications.permissionDenied'));
                    return;
                }
                const next = { ...notifSettings, enabled: true };
                setNotifSettings(next);
                saveNotificationSettings(next);
                if (currentBaby) rescheduleAll(currentBaby.id, currentBaby.name);
            } else {
                const next = { ...notifSettings, enabled: false };
                setNotifSettings(next);
                saveNotificationSettings(next);
                cancelAll();
            }
        } catch (e) {
            console.error('[Notifications] Toggle failed:', e);
            toast.error('Failed to toggle notifications: ' + (e as Error).message);
        }
    };

    const toggleUnits = () => {
        const next = unitsSystem === 'metric' ? 'imperial' : 'metric';
        setUnitsSystem(next);
        localStorage.setItem('heybub-units', next);
    };

    const formatDob = (dateStr: string) => {
        try {
            // Normalize: extract date part and parse at noon to avoid UTC timezone shift
            const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
            return new Date(datePart + 'T12:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        } catch { return dateStr; }
    };

    return (
        <div className="settings-page">
            <h2 className="settings-page-title">{t('settings:title')}</h2>

            {/* Baby Profile */}
            {currentBaby && (
                <div className="settings-group">
                    <div className="settings-group-title">{t('settings:babyProfile.title')}</div>
                    <div className="settings-row" onClick={() => setShowBabyProfile(true)} style={{ cursor: 'pointer' }}>
                        <div className="settings-row-left">
                            <BabyAvatar name={currentBaby.name} photoUrl={currentBaby.profile_photo_url} size={32} />
                            <div>
                                <div className="settings-row-label">{currentBaby.name}</div>
                                <div className="settings-row-desc">{currentBaby.birth_date ? t('settings:babyProfile.born', { date: formatDob(currentBaby.birth_date) }) : ''}</div>
                            </div>
                        </div>
                        <ChevronRight size={18} className="settings-arrow" />
                    </div>
                    <div className="settings-row" onClick={() => setActiveTab('health')}>
                        <div className="settings-row-left">
                            <div className="settings-icon-box butter"><TrendingUp size={16} /></div>
                            <div>
                                <div className="settings-row-label">{t('settings:babyProfile.growthData')}</div>
                                <div className="settings-row-desc">{t('settings:babyProfile.growthDataDesc')}</div>
                            </div>
                        </div>
                        <ChevronRight size={18} className="settings-arrow" />
                    </div>
                </div>
            )}

            {/* Notifications */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:notifications.title')}</div>
                <div className="settings-row" onClick={toggleNotificationsEnabled}>
                    <div className="settings-row-left">
                        <div className="settings-icon-box lavender">
                            <Bell size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:notifications.enable')}</div>
                            <div className="settings-row-desc">{t('settings:notifications.enableDesc')}</div>
                        </div>
                    </div>
                    <div className={`toggle-switch ${notifSettings.enabled ? 'active' : ''}`} />
                </div>
                {notifSettings.enabled && (
                    <>
                        <div className="settings-sub-row" onClick={() => updateNotifSettings({ appointments: !notifSettings.appointments })}>
                            <div className="settings-row-left">
                                <div>
                                    <div className="settings-row-label">{t('settings:notifications.appointments')}</div>
                                    <div className="settings-row-desc">{t('settings:notifications.appointmentsDesc')}</div>
                                </div>
                            </div>
                            <div className={`toggle-switch ${notifSettings.appointments ? 'active' : ''}`} />
                        </div>
                        <div className="settings-sub-row" onClick={() => updateNotifSettings({ medications: !notifSettings.medications })}>
                            <div className="settings-row-left">
                                <div>
                                    <div className="settings-row-label">{t('settings:notifications.medications')}</div>
                                    <div className="settings-row-desc">{t('settings:notifications.medicationsDesc')}</div>
                                </div>
                            </div>
                            <div className={`toggle-switch ${notifSettings.medications ? 'active' : ''}`} />
                        </div>
                        {notifSettings.medications && (
                            <div className="settings-sub-row">
                                <div className="settings-row-left">
                                    <div>
                                        <div className="settings-row-label">{t('settings:notifications.reminderTime')}</div>
                                        <div className="settings-row-desc">{t('settings:notifications.reminderTimeDesc')}</div>
                                    </div>
                                </div>
                                <input
                                    type="time"
                                    className="notification-time-input"
                                    value={notifSettings.medicationTime}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => updateNotifSettings({ medicationTime: e.target.value })}
                                />
                            </div>
                        )}
                        <div className="settings-sub-row" onClick={async () => {
                            const ok = await sendTestNotification();
                            if (ok) toast.success('Test notification sent! Check in ~3 seconds.');
                            else toast.error('Failed to send test notification.');
                        }}>
                            <div className="settings-row-left">
                                <div>
                                    <div className="settings-row-label">Send Test Notification</div>
                                    <div className="settings-row-desc">Fires in ~3 seconds to verify setup</div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="settings-arrow" />
                        </div>
                    </>
                )}
            </div>

            {/* Preferences */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:preferences.title')}</div>
                <div className="settings-row" onClick={toggleTheme}>
                    <div className="settings-row-left">
                        <div className="settings-icon-box peach">
                            <Moon size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:preferences.darkMode')}</div>
                            <div className="settings-row-desc">{t('settings:preferences.darkModeDesc')}</div>
                        </div>
                    </div>
                    <div className={`toggle-switch ${isDark ? 'active' : ''}`} />
                </div>
                <LanguageSwitcher />
                <div className="settings-row" onClick={toggleUnits}>
                    <div className="settings-row-left">
                        <div className="settings-icon-box mint"><Globe size={16} /></div>
                        <div>
                            <div className="settings-row-label">{t('settings:preferences.units')}</div>
                            <div className="settings-row-desc">{unitsSystem === 'metric' ? t('settings:preferences.unitsMetric') : t('settings:preferences.unitsImperial')}</div>
                        </div>
                    </div>
                    <span className="settings-badge sky">{unitsSystem === 'metric' ? 'kg, cm, ml' : 'lbs, in, oz'}</span>
                </div>
            </div>

            {/* Account */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:account.title')}</div>
                {user && (
                    <div className="settings-row">
                        <div className="settings-row-left">
                            <div className="settings-icon-box lavender">
                                <User size={16} />
                            </div>
                            <div>
                                <div className="settings-row-label">{user.email} {isPremium && <span className="pro-badge">PRO</span>}</div>
                                <div className="settings-row-desc">{isPremium ? t('settings:account.premiumMember') : t('settings:account.signedIn')}</div>
                            </div>
                        </div>
                    </div>
                )}
                <div className={`settings-row ${isPremium && !hasStripeSubscription ? 'settings-row--disabled' : ''}`} onClick={isPremium && !hasStripeSubscription ? undefined : (isPremium ? onManage : onUpgrade)}>
                    <div className="settings-row-left">
                        <div className="settings-icon-box butter">
                            <Crown size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:account.premium.title')}</div>
                            <div className="settings-row-desc">
                                {isPremium
                                    ? hasStripeSubscription
                                        ? t('settings:account.premium.activeManage')
                                        : t('settings:account.premium.activePromo')
                                    : t('settings:account.premium.unlock')}
                            </div>
                        </div>
                    </div>
                    {isPremium ? (
                        <span className="settings-badge mint">{t('settings:account.premium.active')}</span>
                    ) : (
                        <ChevronRight size={18} className="settings-arrow" />
                    )}
                </div>
                <div className="settings-row" onClick={currentBaby?.is_owner !== false ? () => setShowShareModal(true) : undefined}>
                    <div className="settings-row-left">
                        <div className="settings-icon-box butter">👥</div>
                        <div>
                            <div className="settings-row-label">{t('settings:account.caregivers')}</div>
                            <div className="settings-row-desc">
                                {currentBaby?.is_owner === false
                                    ? t('settings:account.sharedWithYou')
                                    : t('settings:account.caregiversDesc')}
                            </div>
                        </div>
                    </div>
                    {currentBaby?.is_owner !== false ? (
                        <>
                            {(currentBaby?.shared_with?.length ?? 0) > 0 && (
                                <span className="settings-badge mint">{t('settings:account.shared', { count: currentBaby.shared_with.length })}</span>
                            )}
                            <ChevronRight size={18} className="settings-arrow" />
                        </>
                    ) : (
                        <span className="settings-badge lavender">{t('settings:account.sharedWithYou')}</span>
                    )}
                </div>
                <div
                    className={`settings-row ${!isPremium ? 'settings-row--disabled' : ''}`}
                    onClick={isPremium ? handleExportCsv : onUpgrade}
                >
                    <div className="settings-row-left">
                        <div className="settings-icon-box sky">
                            <Download size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:data.export')} {!isPremium && <span className="pro-badge">PRO</span>}</div>
                            <div className="settings-row-desc">
                                {!isPremium ? t('settings:data.upgradeToExport') : exportLoading ? t('settings:data.exporting') : t('settings:data.exportDesc')}
                            </div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </div>
            </div>

            {/* Navigation */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:navigation.title')}</div>
                <a className="settings-row" href={hubUrl}>
                    <div className="settings-row-left">
                        <div className="settings-icon-box sky">
                            <Globe size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:navigation.hubTitle')}</div>
                            <div className="settings-row-desc">{t('settings:navigation.hubDesc')}</div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </a>
            </div>

            {/* Support */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:support.title')}</div>
                <a className="settings-row" href="mailto:support@heybub.app">
                    <div className="settings-row-left">
                        <div className="settings-icon-box peach"><Mail size={16} /></div>
                        <div>
                            <div className="settings-row-label">{t('settings:support.contactUs')}</div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </a>
                <button
                    className="settings-row"
                    onClick={() => setShowPrivacyPolicy(true)}
                >
                    <div className="settings-row-left">
                        <div className="settings-icon-box mint">
                            <Shield size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:support.privacyPolicy')}</div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </button>
                <a className="settings-row" href="https://heybub.app/terms" target="_blank" rel="noopener noreferrer">
                    <div className="settings-row-left">
                        <div className="settings-icon-box cloud"><FileText size={16} /></div>
                        <div>
                            <div className="settings-row-label">{t('settings:support.termsOfService')}</div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </a>
                <button
                    className="settings-row"
                    onClick={onReplayOnboarding}
                >
                    <div className="settings-row-left">
                        <div className="settings-icon-box butter">
                            <Sparkles size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:support.replayOnboarding', { defaultValue: 'Replay Welcome Tour' })}</div>
                            <div className="settings-row-desc">{t('settings:support.replayOnboardingDesc', { defaultValue: 'See the app introduction again' })}</div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </button>
                <button
                    className="settings-row settings-row-danger"
                    onClick={logout}
                >
                    <div className="settings-row-left">
                        <div className="settings-icon-box danger">
                            <LogOut size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:support.signOut')}</div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </button>
                <button
                    className="settings-row settings-row-danger"
                    onClick={() => setShowDeleteConfirm(true)}
                >
                    <div className="settings-row-left">
                        <div className="settings-icon-box danger">
                            <Trash2 size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:support.deleteAccount', { defaultValue: 'Delete Account' })}</div>
                            <div className="settings-row-desc">{t('settings:support.deleteAccountDesc', { defaultValue: 'Permanently delete all your data' })}</div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </button>
            </div>

            <p className="settings-version">{t('app.version', { version: __APP_VERSION__ })}</p>

            {showShareModal && currentBaby && (
                <CaregiverModal
                    baby={currentBaby}
                    onClose={() => setShowShareModal(false)}
                    onShare={() => onRefreshBabies()}
                />
            )}

            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => !deleteLoading && setShowDeleteConfirm(false)}>
                    <div className="modal-content delete-account-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-account-icon">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="delete-account-title">{t('settings:support.deleteAccountConfirmTitle', { defaultValue: 'Delete Your Account?' })}</h3>
                        <p className="delete-account-desc">
                            {t('settings:support.deleteAccountConfirmDesc', { defaultValue: 'This will permanently delete your account, all baby profiles, and all tracking data. This action cannot be undone.' })}
                        </p>
                        <div className="delete-account-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleteLoading}
                            >
                                {t('common:cancel')}
                            </button>
                            <button
                                className="btn btn-danger"
                                disabled={deleteLoading}
                                onClick={async () => {
                                    setDeleteLoading(true);
                                    try {
                                        await api.deleteAccount();
                                        localStorage.clear();
                                        logout();
                                    } catch (error) {
                                        toast.error(t('settings:support.deleteAccountFailed', { defaultValue: 'Failed to delete account. Please try again.' }));
                                        setDeleteLoading(false);
                                    }
                                }}
                            >
                                {deleteLoading
                                    ? t('settings:support.deletingAccount', { defaultValue: 'Deleting...' })
                                    : t('settings:support.deleteAccountConfirm', { defaultValue: 'Delete Everything' })}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading" style={{ minHeight: '100vh' }}>
                <img src="/icons/loading.png" alt="" className="loading-logo" />
                <span className="loading-text">Getting things ready...</span>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function buildHubUrl(session: { access_token?: string; refresh_token?: string } | null, theme: string) {
    const url = new URL('https://heybub.app');
    if (session?.access_token && session?.refresh_token) {
        url.searchParams.set('auth_relay', session.access_token);
        url.searchParams.set('refresh_token', session.refresh_token);
    }
    if (theme) {
        url.searchParams.set('theme', theme);
    }
    return url.toString();
}

function MainApp() {
    const { t, i18n } = useTranslation('common');
    const { user, session, logout } = useAuth();
    const { babies, loading: babiesLoading, refresh } = useBaby();
    const { online, syncing, pendingCount, syncPendingChanges } = useOfflineSync();
    const [activeTab, setActiveTab] = useState('home');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showTour, setShowTour] = useState(false);
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const [showMedQuickLog, setShowMedQuickLog] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [onboardingState, setOnboardingState] = useState({
        loaded: false,
        onboardingCompleted: localStorage.getItem('heybub-onboarding-completed') === 'true',
        tourCompleted: localStorage.getItem('heybub-tour-completed') === 'true',
    });

    const [isPremium, setIsPremium] = useState(() => {
        return localStorage.getItem('isPremium') === 'true';
    });
    const [hasStripeSubscription, setHasStripeSubscription] = useState(() => {
        return localStorage.getItem('hasStripeSubscription') === 'true';
    });

    const handleManageSubscription = async () => {
        try {
            const result = await api.createBillingPortal();
            window.location.href = result.portal_url;
        } catch {
            toast.error(t('settings:upgrade.manageSub', { ns: 'settings' }));
        }
    };

    const handleExportCsv = async () => {
        if (!babies || babies.length === 0) {
            toast.error(t('settings:data.noDataToExport', { ns: 'settings' }));
            return;
        }

        setExportLoading(true);
        try {
            const currentBaby = babies[0];
            await api.exportBabyDataCsv(currentBaby.id);
            toast.success(t('settings:data.exportSuccess', { ns: 'settings' }));
        } catch (error) {
            toast.error(t('settings:data.exportFailed', { ns: 'settings' }) + ': ' + (error as Error).message);
        } finally {
            setExportLoading(false);
        }
    };

    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved === 'handwritten') return 'light';
        if (saved === 'handwritten-dark' || saved === 'classic') return 'dark';
        return saved || 'light';
    });

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        // Update meta theme-color for browser/OS chrome
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'dark' ? '#1a1614' : '#d4849c');
        if (Capacitor.isNativePlatform()) {
            StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
        }
    }, [theme]);

    useEffect(() => {
        const checkPremiumStatus = async () => {
            if (!user || !online) return;

            try {
                const status = await api.getSubscriptionStatus();
                if (status.premium) {
                    setIsPremium(true);
                    localStorage.setItem('isPremium', 'true');
                } else {
                    setIsPremium(false);
                    localStorage.setItem('isPremium', 'false');
                }
                try {
                    const billing = await api.getBillingSubscription();
                    const hasSub = billing.is_premium && !!billing.plan;
                    setHasStripeSubscription(hasSub);
                    localStorage.setItem('hasStripeSubscription', hasSub ? 'true' : 'false');
                } catch {
                    setHasStripeSubscription(false);
                    localStorage.setItem('hasStripeSubscription', 'false');
                }
            } catch (error) {
                console.warn('Failed to check premium status:', error);
            }
        };

        checkPremiumStatus();
    }, [user, online]);

    // Fetch onboarding/tour state from backend
    useEffect(() => {
        const fetchOnboardingState = async () => {
            if (!user || !online) {
                setOnboardingState(prev => ({ ...prev, loaded: true }));
                return;
            }
            try {
                const info = await api.getUserInfo();
                const state = {
                    loaded: true,
                    onboardingCompleted: info.onboarding_completed,
                    tourCompleted: info.tour_completed,
                };
                setOnboardingState(state);
                if (info.onboarding_completed) localStorage.setItem('heybub-onboarding-completed', 'true');
                if (info.tour_completed) localStorage.setItem('heybub-tour-completed', 'true');
            } catch {
                setOnboardingState(prev => ({ ...prev, loaded: true }));
            }
        };
        fetchOnboardingState();
    }, [user, online]);

    useEffect(() => {
        if (!babiesLoading && babies.length === 0 && !onboardingState.onboardingCompleted && online) {
            setShowOnboarding(true);
        }
    }, [babies, babiesLoading, online, onboardingState.onboardingCompleted]);

    // Reschedule notifications on app launch and language change
    useEffect(() => {
        if (!babiesLoading && babies.length > 0) {
            const baby = babies[0];
            const settings = getNotificationSettings();
            if (settings.enabled) {
                rescheduleAll(baby.id, baby.name);
                checkAndShowWebReminders(baby.id, baby.name);
            }
        }
    }, [babiesLoading, babies]);

    // Reschedule notifications when language changes so text updates
    useEffect(() => {
        const handleLanguageChanged = () => {
            if (!babiesLoading && babies.length > 0) {
                const baby = babies[0];
                const settings = getNotificationSettings();
                if (settings.enabled) {
                    rescheduleAll(baby.id, baby.name);
                }
            }
        };
        i18n.on('languageChanged', handleLanguageChanged);
        return () => { i18n.off('languageChanged', handleLanguageChanged); };
    }, [i18n, babiesLoading, babies]);

    // Handle notification taps from native
    useEffect(() => {
        const processNotificationTap = (detail: { id: number; actionId: string; extra?: { type: string } }) => {
            const { id, actionId, extra } = detail;
            const isMedication = extra?.type === 'medication' || id >= 50000;

            // Always navigate to health tab
            setActiveTab('health');

            if (isMedication && actionId === 'LOG_TAKEN') {
                // iOS action button: log first active medication as a supplement
                const currentBaby = babies?.[0];
                if (currentBaby) {
                    api.getMedications(currentBaby.id, true).then(async (meds) => {
                        const activeMed = meds.find((m: { is_active?: boolean }) => m.is_active);
                        const { medToSupplementName } = await import('./components/health/MedicationQuickLog');
                        await api.createSupplement({
                            baby_id: currentBaby.id,
                            time: new Date().toISOString(),
                            name: activeMed ? medToSupplementName(activeMed.medication_name) : 'other',
                            dosage: activeMed?.dosage || null,
                            notes: activeMed?.medication_name || 'medication',
                        });
                        toast.success(t('health:medicationQuickLog.loggedGeneric', { defaultValue: 'Medication logged as taken' }));
                    }).catch(() => {
                        toast.error('Failed to log medication');
                    });
                }
            } else if (isMedication) {
                // Default tap on medication notification: show quick-log popup
                setShowMedQuickLog(true);
            }
        };

        // Cold start: check for buffered tap from before React mounted
        const pending = (window as any).__pendingNotificationTap;
        if (pending) {
            delete (window as any).__pendingNotificationTap;
            processNotificationTap(pending);
        }

        // Warm start: listen for future notification taps
        const handleEvent = (e: Event) => {
            processNotificationTap((e as CustomEvent).detail);
        };
        window.addEventListener('notification-tap', handleEvent);
        return () => window.removeEventListener('notification-tap', handleEvent);
    }, [t, babies]);

    if (showOnboarding && !babiesLoading && babies.length === 0 && online) {
        return (
            <Onboarding
                onComplete={() => {
                    setShowOnboarding(false);
                    setOnboardingState(prev => ({ ...prev, onboardingCompleted: true }));
                    // Give Dashboard time to mount before starting tour
                    if (!onboardingState.tourCompleted) {
                        setTimeout(() => setShowTour(true), 600);
                    }
                }}
            />
        );
    }

    if (!babiesLoading && babies.length === 0 && !online) {
        return (
            <div className="app-container">
                <OfflineIndicator
                    online={online}
                    syncing={syncing}
                    pendingCount={pendingCount}
                    onSync={syncPendingChanges}
                />
                <div className="empty-state" style={{ paddingTop: 'var(--space-2xl)' }}>
                    <div className="empty-state-icon">📡</div>
                    <h2 className="empty-state-title">{t('offline')}</h2>
                    <p className="empty-state-text">
                        {t('offlineMessage')}
                    </p>
                </div>
            </div>
        );
    }

    if (showPrivacyPolicy) {
        return (
            <div className="app-container" style={{ paddingBottom: 'var(--space-xl)' }}>
                <PrivacyPolicy onBack={() => setShowPrivacyPolicy(false)} />
            </div>
        );
    }

    if (babiesLoading) {
        return (
            <div className="loading" style={{ minHeight: '100vh' }}>
                <img src="/icons/loading.png" alt="" className="loading-logo" />
                <span className="loading-text">Loading your little one...</span>
            </div>
        );
    }

    return (
        <div className="app-container">
            {/* Header removed — greeting is in BabyGreeting, dark mode in Settings, hub link in Settings */}
            <OfflineIndicator
                online={online}
                syncing={syncing}
                pendingCount={pendingCount}
                onSync={syncPendingChanges}
            />
            <main>
                {activeTab === 'home' && (
                    <ErrorBoundary level="page">
                        <Dashboard />
                    </ErrorBoundary>
                )}
                {activeTab === 'timeline' && (
                    <ErrorBoundary level="page">
                        <TimelineCalendar />
                    </ErrorBoundary>
                )}
                {activeTab === 'health' && (
                    <ErrorBoundary level="page">
                        <Suspense fallback={
                            <div className="loading">
                                <div className="spinner"></div>
                            </div>
                        }>
                            <Health
                                showMedQuickLog={showMedQuickLog}
                                onDismissMedQuickLog={() => setShowMedQuickLog(false)}
                            />
                        </Suspense>
                    </ErrorBoundary>
                )}
                {activeTab === 'insights' && (
                    <ErrorBoundary level="page">
                        <Insights isPremium={isPremium} />
                    </ErrorBoundary>
                )}
                {activeTab === 'settings' && (
                    <SettingsPage
                        user={user}
                        isDark={theme === 'dark'}
                        toggleTheme={toggleTheme}
                        isPremium={isPremium}
                        hasStripeSubscription={hasStripeSubscription}
                        exportLoading={exportLoading}
                        handleExportCsv={handleExportCsv}
                        babies={babies}
                        setShowPrivacyPolicy={setShowPrivacyPolicy}
                        logout={logout}
                        onUpgrade={() => setShowUpgradeDialog(true)}
                        onManage={handleManageSubscription}
                        setActiveTab={setActiveTab}
                        hubUrl={buildHubUrl(session, theme)}
                        onRefreshBabies={refresh}
                        onReplayOnboarding={() => {
                            setShowTour(true);
                            setActiveTab('home');
                        }}
                    />
                )}
            </main>

            {showUpgradeDialog && <UpgradeDialog onClose={() => setShowUpgradeDialog(false)} />}
            {showTour && <SpotlightTour onComplete={() => setShowTour(false)} />}

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                <button
                    className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`}
                    onClick={() => { hapticSelection(); setActiveTab('home'); }}
                >
                    <Home size={22} />
                    <span>{t('nav.home')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'timeline' ? 'active' : ''}`}
                    onClick={() => { hapticSelection(); setActiveTab('timeline'); }}
                >
                    <Clock size={22} />
                    <span>{t('nav.timeline')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'health' ? 'active' : ''}`}
                    onClick={() => { hapticSelection(); setActiveTab('health'); }}
                >
                    <Activity size={22} />
                    <span>{t('nav.health')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'insights' ? 'active' : ''}`}
                    onClick={() => { hapticSelection(); setActiveTab('insights'); }}
                >
                    <PieChart size={22} />
                    <span>{t('nav.insights')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => { hapticSelection(); setActiveTab('settings'); }}
                >
                    <SettingsIcon size={22} />
                    <span>{t('nav.settings')}</span>
                </button>
            </nav>
        </div>
    );
}

function AppContent() {
    return (
        <BabyProvider>
            <MainApp />
        </BabyProvider>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <Toaster
                    position="top-center"
                    richColors
                    closeButton
                    toastOptions={{
                        style: {
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text)',
                        },
                    }}
                />
                <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/callback" element={<Callback />} />
                        <Route path="/health-check" element={<Health />} />
                        <Route
                            path="/*"
                            element={
                                <ProtectedRoute>
                                    <AppContent />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </Suspense>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
