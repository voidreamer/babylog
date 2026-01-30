/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatTimeAgo } from '../utils/formatTime';
import { useState } from 'react';
import { CircleDot, Plus, Check, X } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useBaby } from '../hooks/useBaby';
import { useTranslation } from 'react-i18next';


interface PottyWidgetProps { lastPotty: any; onPottyChange: () => void; onOpenModal: () => void; quickActionsEnabled?: boolean; }
export default function PottyWidget({ lastPotty, onPottyChange, onOpenModal, quickActionsEnabled = true }: PottyWidgetProps) {
    const { selectedBaby } = useBaby();
    const { t } = useTranslation('common');
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
            toast.success(t('pottyLogged', { result: t(`pottyResults.${result}`) }));
            onPottyChange();
        } catch (error) {
            console.error('Failed to log potty:', error);
            toast.error(t('errors.failedToSave'));
        } finally {
            setSaving(null);
        }
    };

    const timeAgo = lastPotty ? formatTimeAgo(lastPotty.time) : null;

    return (
        <div
            className="widget potty"
            onClick={onOpenModal}
        >
            <div className="widget-bg-icon">
                <CircleDot size={80} strokeWidth={1} />
            </div>

            <div className="widget-add-icon" title="Log with details">
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <CircleDot size={24} strokeWidth={2} />
                    <span className="widget-label">{t('widgets.potty')}</span>
                </div>

                {lastPotty ? (
                    <>
                        <div className="widget-time-ago">{timeAgo}</div>
                        <div className="widget-detail">{lastPotty.result}</div>
                    </>
                ) : !quickActionsEnabled ? (
                    <div className="widget-time-ago">{t('noPottyYet')}</div>
                ) : null}

                {/* Quick action buttons */}
                {quickActionsEnabled && (
                    <div className="diaper-quick-btns">
                        <button
                            className="diaper-quick-btn pee"
                            onClick={(e) => handleQuickLog('success', e)}
                            disabled={saving !== null}
                            style={{ background: '#16a34a' }}
                        >
                            <Check size={14} />
                            {saving === 'success' ? '...' : t('yes')}
                        </button>
                        <button
                            className="diaper-quick-btn poo"
                            onClick={(e) => handleQuickLog('attempt', e)}
                            disabled={saving !== null}
                            style={{ background: '#6b7280' }}
                        >
                            <X size={14} />
                            {saving === 'attempt' ? '...' : t('pottyResults.attempt')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
