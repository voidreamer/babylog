/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { useBaby } from '../hooks/useBaby';
import BabyInsights from './BabyInsights';
import { getArticlesForAge } from '../data/articles';

function calculateAgeInMonths(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 +
        (today.getMonth() - birth.getMonth());
    return Math.max(0, months);
}
import { TrendingUp, Sparkles, ExternalLink, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface LearnProps { isPremium?: boolean; }
export default function Learn({ isPremium = false }: LearnProps) {
    const { t } = useTranslation('common');
    const { selectedBaby } = useBaby();

    const babyAgeMonths = useMemo(() => {
        if (!selectedBaby?.birth_date) return null;
        return calculateAgeInMonths(selectedBaby.birth_date);
    }, [selectedBaby]);

    const teaserArticles = useMemo(() => {
        const age = babyAgeMonths ?? 3;
        return getArticlesForAge(age).slice(0, 3);
    }, [babyAgeMonths]);

    return (
        <div className="learn-page">
            <motion.div
                className="learn-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="learn-header">
                    <h1 className="learn-title">
                        <TrendingUp size={24} /> {t('dashboard:learn.insights')}
                    </h1>
                    {selectedBaby && babyAgeMonths !== null && (
                        <p className="learn-subtitle">
                            <Sparkles size={14} /> {t('dashboard:learn.forBaby', { name: selectedBaby.name, months: babyAgeMonths, monthLabel: babyAgeMonths === 1 ? t('dashboard:learn.month') : t('dashboard:learn.months') })}
                        </p>
                    )}
                </div>

                <BabyInsights isPremium={isPremium} />

                {teaserArticles.length > 0 && (
                    <div className="card" style={{ marginTop: 'var(--space-xl)', padding: 'var(--space-lg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                            <BookOpen size={18} style={{ color: 'var(--primary)' }} />
                            <h2 style={{ fontSize: 16, margin: 0, fontFamily: 'var(--font-family-heading)' }}>
                                {t('dashboard:learn.tipsAndGuides', { defaultValue: 'Tips & Guides' })}
                            </h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {teaserArticles.map(article => (
                                <div key={article.id} style={{
                                    padding: 'var(--space-sm) 0',
                                    borderBottom: '1px solid var(--border)',
                                }}>
                                    <div style={{ fontWeight: 500, fontSize: 14 }}>{article.title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{article.summary}</div>
                                </div>
                            ))}
                        </div>
                        <a
                            href="https://heybub.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 'var(--space-xs)',
                                marginTop: 'var(--space-md)',
                                padding: 'var(--space-sm) var(--space-md)',
                                background: 'var(--primary)',
                                color: '#fff',
                                borderRadius: 'var(--radius-md)',
                                textDecoration: 'none',
                                fontWeight: 600,
                                fontSize: 14,
                            }}
                        >
                            {t('dashboard:learn.readMoreOnHeyBub', { defaultValue: 'Read more on HeyBub' })}
                            <ExternalLink size={14} />
                        </a>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
