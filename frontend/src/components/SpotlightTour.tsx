import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';

interface TourStep {
    selector: string | null;
    titleKey: string;
    descKey: string;
    icon: string;
    position: 'top' | 'bottom' | 'center';
}

const TOUR_STEPS: TourStep[] = [
    {
        selector: '.quick-actions',
        titleKey: 'tour.quickActionsTitle',
        descKey: 'tour.quickActionsDesc',
        icon: '/icons/feeding.png',
        position: 'bottom',
    },
    {
        selector: '.widgets-grid > :first-child',
        titleKey: 'tour.widgetsTitle',
        descKey: 'tour.widgetsDesc',
        icon: '/icons/activity.png',
        position: 'bottom',
    },
    {
        selector: 'nav.bottom-nav',
        titleKey: 'tour.navTitle',
        descKey: 'tour.navDesc',
        icon: '/icons/logo.png',
        position: 'top',
    },
    {
        selector: null,
        titleKey: 'tour.doneTitle',
        descKey: 'tour.doneDesc',
        icon: '/icons/loading.png',
        position: 'center',
    },
];

interface SpotlightTourProps {
    onComplete: () => void;
}

export default function SpotlightTour({ onComplete }: SpotlightTourProps) {
    const { t } = useTranslation('common');
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [resolvedSteps, setResolvedSteps] = useState<TourStep[]>([]);

    // Resolve which steps are actually visible
    useEffect(() => {
        const steps = TOUR_STEPS.filter((s) => {
            if (!s.selector) return true; // final step always included
            return document.querySelector(s.selector) !== null;
        });
        setResolvedSteps(steps);
    }, []);

    const measureTarget = useCallback(() => {
        if (resolvedSteps.length === 0) return;
        const step = resolvedSteps[currentStep];
        if (step?.selector) {
            const el = document.querySelector(step.selector);
            if (el) {
                setTargetRect(el.getBoundingClientRect());
                return;
            }
        }
        setTargetRect(null);
    }, [currentStep, resolvedSteps]);

    useEffect(() => {
        measureTarget();
        window.addEventListener('resize', measureTarget);
        return () => window.removeEventListener('resize', measureTarget);
    }, [measureTarget]);

    const finish = useCallback(() => {
        localStorage.setItem('heybub-tour-completed', 'true');
        try { api.completeTour(); } catch { /* fire-and-forget */ }
        onComplete();
    }, [onComplete]);

    const handleNext = () => {
        if (currentStep >= resolvedSteps.length - 1) {
            finish();
        } else {
            setCurrentStep((s) => s + 1);
        }
    };

    if (resolvedSteps.length === 0) return null;

    const step = resolvedSteps[currentStep];
    const isCenter = step.position === 'center' || !targetRect;
    const padding = 8;

    // Calculate tooltip position
    const getTooltipStyle = (): React.CSSProperties => {
        if (isCenter) {
            return {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            };
        }

        const style: React.CSSProperties = {
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: 'min(340px, calc(100vw - 32px))',
        };

        if (step.position === 'bottom' && targetRect) {
            style.top = targetRect.bottom + padding + 12;
        } else if (step.position === 'top' && targetRect) {
            style.bottom = window.innerHeight - targetRect.top + padding + 12;
        }

        return style;
    };

    return (
        <div className="spotlight-tour" onClick={(e) => { if (e.target === e.currentTarget) handleNext(); }}>
            {/* SVG overlay with mask cutout */}
            <svg className="spotlight-overlay" width="100%" height="100%">
                <defs>
                    <mask id="spotlight-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {targetRect && (
                            <rect
                                x={targetRect.left - padding}
                                y={targetRect.top - padding}
                                width={targetRect.width + padding * 2}
                                height={targetRect.height + padding * 2}
                                rx="12"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    x="0" y="0" width="100%" height="100%"
                    fill="rgba(0,0,0,0.6)"
                    mask="url(#spotlight-mask)"
                />
            </svg>

            {/* Tooltip */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    className="tour-tooltip"
                    style={getTooltipStyle()}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    <img src={step.icon} alt="" className="tour-tooltip-icon" />
                    <h3 className="tour-tooltip-title">{t(step.titleKey)}</h3>
                    <p className="tour-tooltip-desc">{t(step.descKey)}</p>
                    <div className="tour-tooltip-footer">
                        <div className="tour-dots">
                            {resolvedSteps.map((_, i) => (
                                <div key={i} className={`tour-dot ${i === currentStep ? 'active' : ''}`} />
                            ))}
                        </div>
                        <div className="tour-actions">
                            {currentStep < resolvedSteps.length - 1 && (
                                <button className="tour-skip-btn" onClick={finish}>
                                    {t('tour.skip')}
                                </button>
                            )}
                            <button className="tour-next-btn" onClick={handleNext}>
                                {currentStep >= resolvedSteps.length - 1
                                    ? t('tour.finish')
                                    : t('tour.next')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
