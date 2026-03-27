/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatTimeAgo } from '../utils/formatTime';
import { useState } from 'react';
import { UtensilsCrossed, Plus } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { showApiError } from '../utils/errorHandling';
import { useBaby } from '../hooks/useBaby';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';


interface SolidWidgetProps { lastSolid: any; onSolidChange: () => void; onOpenModal: () => void; quickActionsEnabled?: boolean; }
export default function SolidWidget({ lastSolid, onSolidChange, onOpenModal, quickActionsEnabled = true }: SolidWidgetProps) {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();
    const [saving, setSaving] = useState(false);

    const handleQuickLog = async (food: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedBaby) return;

        setSaving(true);
        try {
            await api.createSolid({
                baby_id: selectedBaby.id,
                time: new Date().toISOString(),
                food_name: food,
                amount: null,
                reaction: null,
                notes: null,
            });
            toast.success(t('solid.logged', { defaultValue: 'Solid food logged' }));
            onSolidChange();
        } catch (error) {
            console.error('Failed to log solid:', error);
            showApiError(error, t('solid.failedToLog', { defaultValue: 'Failed to log solid food' }), t);
        } finally {
            setSaving(false);
        }
    };

    const timeAgo = lastSolid ? formatTimeAgo(lastSolid.time) : null;

    return (
        <motion.div
            className="widget solid"
            onClick={onOpenModal}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <div className="widget-bg-icon">
                <UtensilsCrossed size={80} strokeWidth={1} />
            </div>

            <div className="widget-add-icon" title={t('solid.logWithDetails', { defaultValue: 'Log with details' })}>
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <UtensilsCrossed size={24} strokeWidth={2} />
                    <span className="widget-label">{t('solid.title', { defaultValue: 'Solids' })}</span>
                </div>

                <div className="feeding-widget-idle">
                    {lastSolid ? (
                        <>
                            <div className="widget-time-ago">{timeAgo}</div>
                            <div className="widget-detail">{lastSolid.food_name}</div>
                        </>
                    ) : !quickActionsEnabled ? (
                        <div className="widget-time-ago">{t('solid.noSolidsYet', { defaultValue: 'No solids yet' })}</div>
                    ) : null}
                    {quickActionsEnabled && (
                        <div className="feeding-quick-btns">
                            <button
                                className="feeding-quick-btn"
                                onClick={(e) => handleQuickLog('cereal', e)}
                                disabled={saving}
                                style={{ borderColor: 'var(--solid, var(--tummy))' }}
                            >
                                {saving ? '...' : t('solid.cereal', { defaultValue: 'Cereal' })}
                            </button>
                            <button
                                className="feeding-quick-btn"
                                onClick={(e) => handleQuickLog('fruit', e)}
                                disabled={saving}
                                style={{ borderColor: 'var(--solid, var(--tummy))' }}
                            >
                                {saving ? '...' : t('solid.fruit', { defaultValue: 'Fruit' })}
                            </button>
                            <button
                                className="feeding-quick-btn"
                                onClick={(e) => handleQuickLog('veggie', e)}
                                disabled={saving}
                                style={{ borderColor: 'var(--solid, var(--tummy))' }}
                            >
                                {saving ? '...' : t('solid.veggie', { defaultValue: 'Veggie' })}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
