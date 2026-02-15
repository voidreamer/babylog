/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { Moon, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SleepPressureWidgetProps {
    isPremium: boolean;
    onNavigateToInsights: () => void;
}

export default function SleepPressureWidget({ isPremium, onNavigateToInsights }: SleepPressureWidgetProps) {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!selectedBaby) return;

        let cancelled = false;

        const fetchData = async () => {
            try {
                const result = await api.getRestPlan(selectedBaby.id, 1);
                if (!cancelled) setData(result);
            } catch {
                if (!cancelled) setData(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [selectedBaby]);

    // Extract pressure and next window from rest plan data
    const pressure = data?.sleep_pressure ?? null;
    const windows = data?.windows || data?.rest_windows || [];
    const nextWindow = windows.find((w: any) => {
        if (w.is_current) return false;
        const start = new Date(w.earliest_start || w.start);
        return start > new Date();
    });

    const minutesUntilNap = nextWindow
        ? Math.max(0, Math.round((new Date(nextWindow.earliest_start || nextWindow.start).getTime() - Date.now()) / 60000))
        : null;

    const pressureValue = typeof pressure === 'number' ? pressure : null;

    const getBarColor = (p: number) => {
        if (p < 0.3) return 'var(--success)';
        if (p < 0.7) return 'var(--tummy)';
        return 'var(--danger)';
    };

    const getStatusText = () => {
        if (!data || pressureValue === null) return t('sleepPressure.collectingData');
        if (pressureValue >= 0.9) return t('sleepPressure.restNow');
        if (minutesUntilNap !== null && minutesUntilNap > 0) return t('sleepPressure.napIn', { minutes: minutesUntilNap });
        if (windows.length === 0) return t('sleepPressure.noWindows');
        return t('sleepPressure.collectingData');
    };

    return (
        <div className="widget pressure" onClick={onNavigateToInsights}>
            <div className="widget-header">
                <div className="widget-icon" style={{ backgroundColor: 'var(--sleep)', color: 'white' }}>
                    <Moon size={18} />
                </div>
                <span className="widget-title">{t('sleepPressure.title')}</span>
            </div>

            {!isPremium ? (
                <div className="pressure-widget-teaser">
                    <Lock size={20} />
                    <span>{t('sleepPressure.premium')}</span>
                </div>
            ) : loading ? (
                <div className="pressure-widget-loading">
                    <div className="spinner" />
                </div>
            ) : (
                <>
                    {pressureValue !== null && (
                        <div className="pressure-widget-bar">
                            <div
                                className="pressure-widget-bar-fill"
                                style={{
                                    width: `${Math.min(100, pressureValue * 100)}%`,
                                    backgroundColor: getBarColor(pressureValue),
                                }}
                            />
                        </div>
                    )}
                    <div className="pressure-widget-status">
                        {getStatusText()}
                    </div>
                </>
            )}
        </div>
    );
}
