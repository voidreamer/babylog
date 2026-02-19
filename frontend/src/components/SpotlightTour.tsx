import { useState, useEffect, useCallback, useRef } from 'react';
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
        selector: '.widgets-grid',
        titleKey: 'tour.widgetsTitle',
        descKey: 'tour.widgetsDesc',
        icon: '/icons/activity.png',
        position: 'bottom',
    },
    {
        selector: '.quick-actions',
        titleKey: 'tour.quickActionsTitle',
        descKey: 'tour.quickActionsDesc',
        icon: '/icons/feeding.png',
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
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Resolve which steps are actually visible
    useEffect(() => {
        const steps = TOUR_STEPS.filter((s) => {
            if (!s.selector) return true;
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
        window.addEventListener('scroll', measureTarget, true);
        return () => {
            window.removeEventListener('resize', measureTarget);
            window.removeEventListener('scroll', measureTarget, true);
        };
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
    const spotPadding = 8;
    const tooltipGap = 12;
    const screenMargin = 16;

    const getTooltipStyle = (): React.CSSProperties => {
        if (isCenter) {
            return {
                position: 'fixed',
                top: '50%',
                left: screenMargin,
                right: screenMargin,
                transform: 'translateY(-50%)',
                maxWidth: 340,
                margin: '0 auto',
            };
        }

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const tooltipWidth = Math.min(340, vw - screenMargin * 2);
        const tooltipLeft = Math.max(screenMargin, (vw - tooltipWidth) / 2);

        const style: React.CSSProperties = {
            position: 'fixed',
            left: tooltipLeft,
            width: tooltipWidth,
        };

        if (step.position === 'bottom' && targetRect) {
            const spaceBelow = vh - targetRect.bottom - spotPadding - tooltipGap;
            // If not enough room below (~180px for tooltip), flip to above
            if (spaceBelow < 180 && targetRect.top > 200) {
                style.bottom = vh - targetRect.top + spotPadding + tooltipGap;
            } else {
                style.top = targetRect.bottom + spotPadding + tooltipGap;
            }
        } else if (step.position === 'top' && targetRect) {
            const spaceAbove = targetRect.top - spotPadding - tooltipGap;
            if (spaceAbove < 180) {
                style.top = targetRect.bottom + spotPadding + tooltipGap;
            } else {
                style.bottom = vh - targetRect.top + spotPadding + tooltipGap;
            }
        }

        return style;
    };

    // Cutout rect values (clamped to viewport)
    const cutout = targetRect ? {
        x: Math.max(0, targetRect.left - spotPadding),
        y: Math.max(0, targetRect.top - spotPadding),
        w: targetRect.width + spotPadding * 2,
        h: targetRect.height + spotPadding * 2,
    } : null;

    return (
        <div className="spotlight-tour" onClick={(e) => { if (e.target === e.currentTarget) handleNext(); }}>
            {/* SVG overlay with mask cutout */}
            <svg className="spotlight-overlay" viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`} preserveAspectRatio="none">
                <defs>
                    <mask id="spotlight-mask">
                        <rect x="0" y="0" width={window.innerWidth} height={window.innerHeight} fill="white" />
                        {cutout && (
                            <rect
                                x={cutout.x}
                                y={cutout.y}
                                width={cutout.w}
                                height={cutout.h}
                                rx="12"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    x="0" y="0"
                    width={window.innerWidth}
                    height={window.innerHeight}
                    fill="rgba(0,0,0,0.6)"
                    mask="url(#spotlight-mask)"
                />
            </svg>

            {/* Tooltip */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    ref={tooltipRef}
                    className="tour-tooltip"
                    style={getTooltipStyle()}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
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
