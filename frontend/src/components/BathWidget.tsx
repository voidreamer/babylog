/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { ShowerHead, Plus, Check } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useBaby } from '../hooks/useBaby';
import { useTranslation } from 'react-i18next';

function formatTimeAgo(dateStr: string | null): string | null {
    if (!dateStr) return null;
    const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    const diffMins = Math.floor((new Date().getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
}

interface BathWidgetProps { lastBath: any; onBathChange: () => void; onOpenModal: () => void; quickActionsEnabled?: boolean; }
export default function BathWidget({ lastBath, onBathChange, onOpenModal, quickActionsEnabled = true }: BathWidgetProps) {
    const { selectedBaby } = useBaby();
    const { t } = useTranslation('common');
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
            toast.success(t('bathLogged'));
            onBathChange();
        } catch (error) {
            console.error('Failed to log bath:', error);
            toast.error(t('errors.failedToSave'));
        } finally {
            setSaving(false);
        }
    };

    const timeAgo = lastBath ? formatTimeAgo(lastBath.time) : null;

    return (
        <div
            className="widget bath"
            onClick={onOpenModal}
        >
            <div className="widget-bg-icon">
                <ShowerHead size={80} strokeWidth={1} />
            </div>

            <div className="widget-add-icon" title="Log with notes">
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <ShowerHead size={24} strokeWidth={2} />
                    <span className="widget-label">{t('widgets.bath')}</span>
                </div>

                <div className="feeding-widget-idle">
                    {lastBath ? (
                        <div className="widget-time-ago">{timeAgo}</div>
                    ) : !quickActionsEnabled ? (
                        <div className="widget-time-ago">{t('noBathsYet')}</div>
                    ) : null}
                    {quickActionsEnabled && (
                        <button className="feeding-start-btn" onClick={handleQuickLog} disabled={saving}>
                            <Check size={14} />
                            {saving ? t('saving') : t('logBathAction')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
