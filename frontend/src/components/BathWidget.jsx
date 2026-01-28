import { useState } from 'react';
import { ShowerHead, Plus, Check } from 'lucide-react';
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

export default function BathWidget({ lastBath, onBathChange, onOpenModal, quickActionsEnabled = true }) {
    const { selectedBaby } = useBaby();
    const [saving, setSaving] = useState(false);

    const handleQuickLog = async (e) => {
        e.stopPropagation();
        if (!selectedBaby) return;

        setSaving(true);
        try {
            await api.createBath({
                baby_id: selectedBaby.id,
                time: new Date().toISOString(),
                notes: null,
            });
            toast.success('Bath logged');
            onBathChange();
        } catch (error) {
            console.error('Failed to log bath:', error);
            toast.error('Failed to log bath');
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
                    <span className="widget-label">Bath</span>
                </div>

                <div className="feeding-widget-idle">
                    {lastBath ? (
                        <div className="widget-time-ago">{timeAgo}</div>
                    ) : !quickActionsEnabled ? (
                        <div className="widget-time-ago">No baths yet</div>
                    ) : null}
                    {quickActionsEnabled && (
                        <button className="feeding-start-btn" onClick={handleQuickLog} disabled={saving}>
                            <Check size={14} />
                            {saving ? 'Logging...' : 'Log Bath'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
