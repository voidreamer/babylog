import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings, X, Baby, Droplets, Moon, Heart,
    Toilet, Timer, Bath as BathIcon, Check, Plus, Pill, Zap
} from 'lucide-react';

const ALL_WIDGETS = [
    { id: 'feeding', label: 'Feeding', icon: Baby, color: 'var(--feeding)' },
    { id: 'diaper', label: 'Diaper', icon: Droplets, color: 'var(--diaper)' },
    { id: 'sleep', label: 'Sleep', icon: Moon, color: 'var(--sleep)' },
    { id: 'pumping', label: 'Pumping', icon: Heart, color: 'var(--pumping)' },
    { id: 'potty', label: 'Potty', icon: Toilet, color: 'var(--potty)' },
    { id: 'tummy', label: 'Tummy Time', icon: Timer, color: 'var(--tummy)' },
    { id: 'bath', label: 'Bath', icon: BathIcon, color: 'var(--bath)' },
    { id: 'supplement', label: 'Supplement', icon: Pill, color: '#16a34a' },
];

export default function WidgetSettings({ visibleWidgets, onToggle, quickActionsEnabled, onToggleQuickActions }) {
    const [isOpen, setIsOpen] = useState(false);

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
                    <span className="widget-settings-btn-title">Edit Activities</span>
                    <span className="widget-settings-btn-subtitle">
                        {disabledCount > 0 ? `${disabledCount} hidden` : 'All visible'}
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
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="modal-header">
                                <h3>Dashboard Activities</h3>
                                <button
                                    className="modal-close"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="widget-settings-hint">
                                Tap to show or hide activities on your dashboard
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
                                            <span className="widget-settings-label">{widget.label}</span>
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
                                        <span className="widget-settings-toggle-label">Quick Actions</span>
                                        <span className="widget-settings-toggle-hint">
                                            One-tap buttons on widgets
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
