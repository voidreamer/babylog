import { useMemo } from 'react';
import { useBaby } from '../hooks/useBaby';
import { calculateAgeInMonths } from '../data/articles';
import BabyInsights from './BabyInsights';
import { TrendingUp, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Learn({ isPremium = false }) {
    const { selectedBaby } = useBaby();

    const babyAgeMonths = useMemo(() => {
        if (!selectedBaby?.birth_date) return null;
        return calculateAgeInMonths(selectedBaby.birth_date);
    }, [selectedBaby]);

    return (
        <div className="learn-page">
            <motion.div
                className="learn-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="learn-header">
                    <h1 className="learn-title">
                        <TrendingUp size={24} /> Insights
                    </h1>
                    {selectedBaby && babyAgeMonths !== null && (
                        <p className="learn-subtitle">
                            <Sparkles size={14} /> For {selectedBaby.name}, {babyAgeMonths} {babyAgeMonths === 1 ? 'month' : 'months'} old
                        </p>
                    )}
                </div>

                <BabyInsights isPremium={isPremium} />
            </motion.div>
        </div>
    );
}
