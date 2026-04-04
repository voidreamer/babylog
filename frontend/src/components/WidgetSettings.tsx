/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    Settings, X, Baby, Droplets, Moon, Heart,
    Toilet, Timer, Bath as BathIcon, Check, Plus, Pill, Zap, UtensilsCrossed
} from 'lucide-react';
import { useBaby } from '../hooks/useBaby';
import { calculateAgeInMonths } from '../utils/ageUtils';

const ALL_WIDGETS = [
    { id: 'feeding', labelKey: 'feeding.title', icon: Baby, color: 'var(--feeding)', ageHint: null },
    { id: 'diaper', labelKey: 'diaper.title', icon: Droplets, color: 'var(--diaper)', ageHint: null },
    { id: 'sleep', labelKey: 'sleep.title', icon: Moon, color: 'var(--sleep)', ageHint: null },
    { id: 'pumping', labelKey: 'pumping.title', icon: Heart, color: 'var(--pumping)', ageHint: '0\u201312m' },
    { id: 'potty', labelKey: 'potty.title', icon: Toilet, color: 'var(--potty)', ageHint: '18m+' },
    { id: 'tummy', labelKey: 'tummyTime.title', icon: Timer, color: 'var(--tummy)', ageHint: '0\u201312m' },
    { id: 'bath', labelKey: 'bath.title', icon: BathIcon, color: 'var(--bath)', ageHint: null },
    { id: 'supplement', labelKey: 'supplement.title', icon: Pill, color: 'var(--supplement)', ageHint: '0\u201312m' },
    { id: 'solid', labelKey: 'solid.title', icon: UtensilsCrossed, color: 'var(--solid)', ageHint: '4m+' },
];

interface WidgetSettingsProps { visibleWidgets: string[]; onToggle: (id: string) => void; quickActionsEnabled: boolean; onToggleQuickActions: () => void; }
export default function WidgetSettings({ visibleWidgets, onToggle, quickActionsEnabled, onToggleQuickActions }: WidgetSettingsProps) {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();
    const [isOpen, setIsOpen] = useState(false);
    const ageMonths = selectedBaby?.birth_date ? calculateAgeInMonths(selectedBaby.birth_date) : null;

    const enabledCount = visibleWidgets.length;
    const disabledCount = ALL_WIDGETS.length - enabledCount;

    return (
        <>
            {/* Add/Edit Button - styled as a widget */}
            <motion.button
                className="widget widget-settings-btn"
                onClick={() => setIsOpen(true)}
                whileTap={{ scale: 0.98 }}
            >
                <div className="widget-settings-btn-icon">
                    <Settings size={24} />
                </div>
                <div className="widget-settings-btn-text">
                    <span className="widget-settings-btn-title">{t('widgetSettingsSection.editActivities')}</span>
                    <span className="widget-settings-btn-subtitle">
                        {disabledCount > 0 ? t('widgetSettingsSection.hidden', { count: disabledCount }) : t('widgetSettingsSection.allVisible')}
                    </span>
                </div>
            </motion.button>

            {/* Modal */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            className="modal-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            className="modal widget-settings-modal"
                            role="dialog"
                            aria-modal="true"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="modal-header">
                                <h3>{t('widgetSettingsSection.dashboardActivities')}</h3>
                                <button
                                    className="modal-close"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="widget-settings-hint">
                                {t('widgetSettingsSection.tapToShowHide')}
                            </p>

                            <div className="widget-settings-grid">
                                {ALL_WIDGETS.map(widget => {
                                    const isEnabled = visibleWidgets.includes(widget.id);
                                    const Icon = widget.icon;

                                    return (
                                        <motion.button
                                            key={widget.id}
                                            className={`widget-settings-item ${isEnabled ? 'enabled' : 'disabled'}`}
                                            onClick={() => onToggle(widget.id)}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <div
                                                className="widget-settings-icon"
                                                style={{
                                                    backgroundColor: isEnabled ? widget.color : 'var(--surface-hover)',
                                                    color: isEnabled ? 'white' : 'var(--text-muted)'
                                                }}
                                            >
                                                <Icon size={20} />
                                            </div>
                                            <span className="widget-settings-label">
                                                {t(widget.labelKey)}
                                                {widget.ageHint && (
                                                    <span className="widget-age-hint">{widget.ageHint}</span>
                                                )}
                                            </span>
                                            <div className={`widget-settings-check ${isEnabled ? 'visible' : ''}`}>
                                                <Check size={14} />
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* Quick Actions Toggle */}
                            <div className="widget-settings-section">
                                <motion.button
                                    className={`widget-settings-toggle ${quickActionsEnabled ? 'enabled' : ''}`}
                                    onClick={onToggleQuickActions}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="widget-settings-toggle-icon">
                                        <Zap size={18} />
                                    </div>
                                    <div className="widget-settings-toggle-text">
                                        <span className="widget-settings-toggle-label">{t('widgetSettingsSection.quickActions')}</span>
                                        <span className="widget-settings-toggle-hint">
                                            {t('widgetSettingsSection.oneTapButtons')}
                                        </span>
                                    </div>
                                    <div className={`widget-settings-switch ${quickActionsEnabled ? 'on' : ''}`}>
                                        <div className="widget-settings-switch-thumb" />
                                    </div>
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
