/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatTimeAgo } from '../utils/formatTime';
import { useState } from 'react';
import { Pill, Plus, Check } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useBaby } from '../hooks/useBaby';
import { useTranslation } from 'react-i18next';


interface SupplementWidgetProps { lastSupplement: any; onSupplementChange: () => void; onOpenModal: () => void; quickActionsEnabled?: boolean; }
export default function SupplementWidget({ lastSupplement, onSupplementChange, onOpenModal, quickActionsEnabled = true }: SupplementWidgetProps) {
    const { selectedBaby } = useBaby();
    const { t } = useTranslation('common');
    const [saving, setSaving] = useState(false);

    // Get last used supplement or default to Vitamin D
    const getLastSupplementType = () => {
        return localStorage.getItem('lastSupplementType') || 'vitamin_d';
    };

    const handleQuickLog = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedBaby) return;

        const supplementType = getLastSupplementType();
        setSaving(true);
        try {
            await api.createSupplement({
                baby_id: selectedBaby.id,
                time: new Date().toISOString(),
                name: supplementType,
                dosage: supplementType === 'vitamin_d' ? '400 IU' : null,
                notes: null,
            });
            localStorage.setItem('lastSupplementType', supplementType);
            toast.success(t('supplementLogged'));
            onSupplementChange();
        } catch (error) {
            console.error('Failed to log supplement:', error);
            toast.error(t('errors.failedToSave'));
        } finally {
            setSaving(false);
        }
    };

    const timeAgo = lastSupplement ? formatTimeAgo(lastSupplement.time) : null;
    const supplementLabel = lastSupplement?.name?.replace('_', ' ') || 'Vitamin D';

    return (
        <div
            className="widget supplement"
            onClick={onOpenModal}
        >
            <div className="widget-bg-icon">
                <Pill size={80} strokeWidth={1} />
            </div>

            <div className="widget-add-icon" title="Log different supplement">
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <Pill size={24} strokeWidth={2} />
                    <span className="widget-label">{t('widgets.supplement')}</span>
                </div>

                <div className="feeding-widget-idle">
                    {lastSupplement ? (
                        <>
                            <div className="widget-time-ago">{timeAgo}</div>
                            <div className="widget-detail">{supplementLabel}</div>
                        </>
                    ) : (
                        <div className="widget-time-ago">{t('noSupplementsYet')}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
