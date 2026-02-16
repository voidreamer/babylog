/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatTimeAgo } from '../utils/formatTime';
import { useState } from 'react';
import { CircleDot, Plus, Check, X } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { showApiError } from '../utils/errorHandling';
import { useBaby } from '../hooks/useBaby';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';


interface PottyWidgetProps { lastPotty: any; onPottyChange: () => void; onOpenModal: () => void; quickActionsEnabled?: boolean; }
export default function PottyWidget({ lastPotty, onPottyChange, onOpenModal, quickActionsEnabled = true }: PottyWidgetProps) {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();
    const [saving, setSaving] = useState<string | null>(null);

    const handleQuickLog = async (result: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedBaby) return;

        setSaving(result);
        try {
            await api.createPottyLog({
                baby_id: selectedBaby.id,
                time: new Date().toISOString(),
                result,
                notes: null,
            });
            toast.success(t('potty.pottyLogged', { result }));
            onPottyChange();
        } catch (error) {
            console.error('Failed to log potty:', error);
            showApiError(error, t('toast_failedToLogPotty'), t);
        } finally {
            setSaving(null);
        }
    };

    const timeAgo = lastPotty ? formatTimeAgo(lastPotty.time) : null;

    return (
        <motion.div
            className="widget potty"
            onClick={onOpenModal}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <div className="widget-bg-icon">
                <CircleDot size={80} strokeWidth={1} />
            </div>

            <div className="widget-add-icon" title={t('title_logWithDetails')}>
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <CircleDot size={24} strokeWidth={2} />
                    <span className="widget-label">{t('potty.title')}</span>
                </div>

                {lastPotty ? (
                    <>
                        <div className="widget-time-ago">{timeAgo}</div>
                        <div className="widget-detail">{lastPotty.result}</div>
                    </>
                ) : !quickActionsEnabled ? (
                    <div className="widget-time-ago">{t('potty.noPottyYet')}</div>
                ) : null}

                {/* Quick action buttons */}
                {quickActionsEnabled && (
                    <div className="potty-quick-btns">
                        <button
                            className="potty-quick-btn success"
                            onClick={(e) => handleQuickLog('success', e)}
                            disabled={saving !== null}
                        >
                            <Check size={14} />
                            {saving === 'success' ? '...' : t('potty.yes')}
                        </button>
                        <button
                            className="potty-quick-btn attempt"
                            onClick={(e) => handleQuickLog('attempt', e)}
                            disabled={saving !== null}
                        >
                            <X size={14} />
                            {saving === 'attempt' ? '...' : t('potty.try')}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
