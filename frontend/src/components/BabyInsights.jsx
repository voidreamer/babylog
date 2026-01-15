import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Baby, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import {
    PredictionsSection,
    PatternsSection,
    TrendsSection,
    BenchmarksSection,
    TodayVsAverageSection
} from './insights/InsightsSections';

export default function BabyInsights({ isPremium = false }) {
    const { selectedBaby } = useBaby();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!selectedBaby) {
            setLoading(false);
            return;
        }

        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await api.getAnalytics(selectedBaby.id, 7);
                setAnalytics(data);
            } catch (err) {
                // Only log in development
                if (import.meta.env.DEV) {
                    console.error('Failed to load analytics:', err);
                }
                setError('Unable to load insights');
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
                <p>Select a baby to see insights</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="insights-loading">
                <div className="spinner"></div>
                <p>Analyzing patterns...</p>
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
                <h3>Collecting Data</h3>
                <p>
                    Keep tracking for a few more days! We need at least 3-5 days of data
                    to identify patterns and make predictions.
                </p>
                <div className="insights-collecting-progress">
                    <span>Data points: {analytics?.data_points?.feedings || 0} feedings, {analytics?.data_points?.sleeps || 0} sleeps</span>
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
        </div>
    );
}
