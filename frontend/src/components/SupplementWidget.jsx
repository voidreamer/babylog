import { useState } from 'react';
import { Pill, Plus, Check } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useBaby } from '../hooks/useBaby';

function formatTimeAgo(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    const diffMins = Math.floor((new Date() - date) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
}

export default function SupplementWidget({ lastSupplement, onSupplementChange, onOpenModal, quickActionsEnabled = true }) {
    const { selectedBaby } = useBaby();
    const [saving, setSaving] = useState(false);

    // Get last used supplement or default to Vitamin D
    const getLastSupplementType = () => {
        return localStorage.getItem('lastSupplementType') || 'vitamin_d';
    };

    const handleQuickLog = async (e) => {
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
            toast.success('Supplement logged');
            onSupplementChange();
        } catch (error) {
            console.error('Failed to log supplement:', error);
            toast.error('Failed to log supplement');
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
                    <span className="widget-label">Supplement</span>
                </div>

                <div className="feeding-widget-idle">
                    {lastSupplement ? (
                        <>
                            <div className="widget-time-ago">{timeAgo}</div>
                            <div className="widget-detail">{supplementLabel}</div>
                        </>
                    ) : (
                        <div className="widget-time-ago">No supplements yet</div>
                    )}
                </div>
            </div>
        </div>
    );
}
