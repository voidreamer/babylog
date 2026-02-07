/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatTimeAgo } from '../utils/formatTime';
import { useState } from 'react';
import { ShowerHead, Plus, Check } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useBaby } from '../hooks/useBaby';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';


interface BathWidgetProps { lastBath: any; onBathChange: () => void; onOpenModal: () => void; quickActionsEnabled?: boolean; }
export default function BathWidget({ lastBath, onBathChange, onOpenModal, quickActionsEnabled = true }: BathWidgetProps) {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();
    const [saving, setSaving] = useState(false);

    const handleQuickLog = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedBaby) return;

        setSaving(true);
        try {
            await api.createBath({
                baby_id: selectedBaby.id,
                time: new Date().toISOString(),
                notes: null,
            });
            toast.success(t('toast_bathLogged'));
            onBathChange();
        } catch (error) {
            console.error('Failed to log bath:', error);
            toast.error(t('toast_failedToLogBath'));
        } finally {
            setSaving(false);
        }
    };

    const timeAgo = lastBath ? formatTimeAgo(lastBath.time) : null;

    return (
        <motion.div
            className="widget bath"
            onClick={onOpenModal}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <div className="widget-bg-icon">
                <ShowerHead size={80} strokeWidth={1} />
            </div>

            <div className="widget-add-icon" title={t('title_logWithNotes')}>
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <ShowerHead size={24} strokeWidth={2} />
                    <span className="widget-label">{t('bath.title')}</span>
                </div>

                <div className="feeding-widget-idle">
                    {lastBath ? (
                        <div className="widget-time-ago">{timeAgo}</div>
                    ) : !quickActionsEnabled ? (
                        <div className="widget-time-ago">{t('bath.noBathsYet')}</div>
                    ) : null}
                    {quickActionsEnabled && (
                        <button className="feeding-start-btn" onClick={handleQuickLog} disabled={saving}>
                            <Check size={14} />
                            {saving ? t('bath.logging') : t('bath.logBath')}
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
