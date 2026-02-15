/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatTimeAgo } from '../utils/formatTime';
import { useState } from 'react';
import { Droplets, CircleDot, Plus } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { showApiError } from '../utils/errorHandling';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';


interface DiaperWidgetProps { babyId: number; lastDiaper: any; onDiaperChange: () => void; onOpenModal: () => void; quickActionsEnabled?: boolean; }
export default function DiaperWidget({ babyId, lastDiaper, onDiaperChange, onOpenModal, quickActionsEnabled = true }: DiaperWidgetProps) {
    const { t } = useTranslation('dashboard');
    const [saving, setSaving] = useState<string | null>(null); // null or 'pee'|'poo'|'mixed'

    const handleQuickLog = async (type: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSaving(type);
        try {
            await api.createDiaper({
                baby_id: babyId,
                time: new Date().toISOString(),
                type,
                poo_color: null,
                poo_consistency: null,
                poo_amount: null,
                notes: null,
            });
            const diaperTypeLabel = ({ pee: t('diaper.pee'), poo: t('diaper.poo'), mixed: t('diaper.both') } as Record<string, string>)[type] || type;
            toast.success(t('diaper.diaperLogged', { type: diaperTypeLabel }));
            onDiaperChange();
        } catch (error) {
            console.error('Failed to log diaper:', error);
            showApiError(error, t('toast_failedToLogDiaper'), t);
        } finally {
            setSaving(null);
        }
    };

    const timeAgo = lastDiaper ? formatTimeAgo(lastDiaper.time) : null;

    // Format last diaper type for display
    const getLastDiaperType = () => {
        if (!lastDiaper?.type) return null;
        const typeMap: Record<string, string> = { pee: t('diaper.pee'), poo: t('diaper.poo'), mixed: t('diaper.both') };
        return typeMap[lastDiaper.type] || lastDiaper.type;
    };

    return (
        <motion.div
            className="widget diaper"
            onClick={onOpenModal}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            {/* Background icon */}
            <div className="widget-bg-icon">
                <img
                    src={`${import.meta.env.BASE_URL}icons/diaper.png`}
                    alt="diaper"
                    style={{ width: 80, height: 80, objectFit: 'contain' }}
                />
            </div>

            {/* Plus icon for full modal */}
            <div className="widget-add-icon" title={t('title_logWithDetails')}>
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <img
                        src={`${import.meta.env.BASE_URL}icons/diaper.png`}
                        alt="diaper"
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                    />
                    <span className="widget-label">{t('diaper.title')}</span>
                </div>

                {lastDiaper ? (
                    <>
                        <div className="widget-time-ago">{timeAgo}</div>
                        <div className="widget-detail">{getLastDiaperType()}</div>
                    </>
                ) : !quickActionsEnabled ? (
                    <div className="widget-time-ago">{t('diaper.noDiapersYet')}</div>
                ) : null}

                {/* Quick action buttons */}
                {quickActionsEnabled && (
                    <div className="diaper-quick-btns">
                        <button
                            className="diaper-quick-btn pee"
                            onClick={(e) => handleQuickLog('pee', e)}
                            disabled={saving !== null}
                        >
                            <Droplets size={14} />
                            {saving === 'pee' ? '...' : t('diaper.pee')}
                        </button>
                        <button
                            className="diaper-quick-btn poo"
                            onClick={(e) => handleQuickLog('poo', e)}
                            disabled={saving !== null}
                        >
                            <CircleDot size={14} />
                            {saving === 'poo' ? '...' : t('diaper.poo')}
                        </button>
                        <button
                            className="diaper-quick-btn mixed"
                            onClick={(e) => handleQuickLog('mixed', e)}
                            disabled={saving !== null}
                        >
                            {saving === 'mixed' ? '...' : t('diaper.both')}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
