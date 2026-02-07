/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Baby, AlertCircle, Sparkles, Heart } from 'lucide-react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { useTranslation } from 'react-i18next';
import {
    PredictionsSection,
    PatternsSection,
    TrendsSection,
    BenchmarksSection,
    TodayVsAverageSection
} from './insights/InsightsSections';
import RestPlannerSection from './insights/RestPlannerSection';

interface BabyInsightsProps { isPremium?: boolean; }
export default function BabyInsights({ isPremium = false }: BabyInsightsProps) {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();
    const [analytics, setAnalytics] = useState<any>(null);
    const [restPlan, setRestPlan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedBaby) {
            setLoading(false);
            return;
        }

        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                setError(null);
                const [data, plan] = await Promise.all([
                    api.getAnalytics(selectedBaby.id, 7),
                    api.getRestPlan(selectedBaby.id, 7).catch(() => null),
                ]);
                setAnalytics(data);
                setRestPlan(plan);
            } catch (err) {
                // Only log in development
                if (import.meta.env.DEV) {
                    console.error('Failed to load analytics:', err);
                }
                setError(t('insights.unableToLoad'));
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [selectedBaby]);

    if (!selectedBaby) {
        return (
            <div className="insights-empty">
                <Baby size={48} />
                <p>{t('insights.selectBaby')}</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="insights-loading">
                <div className="spinner"></div>
                <p>{t('insights.analyzingPatterns')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="insights-error">
                <AlertCircle size={48} />
                <p>{error}</p>
            </div>
        );
    }

    if (!analytics?.has_enough_data) {
        return (
            <motion.div
                className="insights-collecting"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="insights-collecting-icon">
                    <Sparkles size={48} />
                </div>
                <h3>{t('insights.collectingData')}</h3>
                <p>
                    {t('insights.collectingDataDesc')}
                </p>
                <div className="insights-collecting-progress">
                    <span>{t('insights.dataPoints', { feedings: analytics?.data_points?.feedings || 0, sleeps: analytics?.data_points?.sleeps || 0 })}</span>
                </div>
            </motion.div>
        );
    }

    const { patterns, predictions, benchmarks, today_vs_average, trends } = analytics;

    return (
        <div className="insights-container">
            <PredictionsSection predictions={predictions} isPremium={isPremium} />
            <PatternsSection patterns={patterns} isPremium={isPremium} />
            <TrendsSection trends={trends} isPremium={isPremium} />
            <BenchmarksSection benchmarks={benchmarks} today_vs_average={today_vs_average} />
            <TodayVsAverageSection today_vs_average={today_vs_average} />

            {restPlan && restPlan.patterns_used?.has_enough_data && (
                <div className="insights-parent-section">
                    <div className="insights-parent-header">
                        <Heart size={20} />
                        <div>
                            <h2>{t('insights.forYou')}</h2>
                            <p>{t('insights.forYouDesc')}</p>
                        </div>
                    </div>
                    <RestPlannerSection restPlan={restPlan} isPremium={isPremium} />
                </div>
            )}
        </div>
    );
}
