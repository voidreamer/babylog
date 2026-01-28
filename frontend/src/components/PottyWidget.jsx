import { useState } from 'react';
import { CircleDot, Plus, Check, X } from 'lucide-react';
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

export default function PottyWidget({ lastPotty, onPottyChange, onOpenModal, quickActionsEnabled = true }) {
    const { selectedBaby } = useBaby();
    const [saving, setSaving] = useState(null);

    const handleQuickLog = async (result, e) => {
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
            toast.success(`Potty ${result} logged`);
            onPottyChange();
        } catch (error) {
            console.error('Failed to log potty:', error);
            toast.error('Failed to log potty');
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
                    <span className="widget-label">Potty</span>
                </div>

                {lastPotty ? (
                    <>
                        <div className="widget-time-ago">{timeAgo}</div>
                        <div className="widget-detail">{lastPotty.result}</div>
                    </>
                ) : !quickActionsEnabled ? (
                    <div className="widget-time-ago">No potty logs yet</div>
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
                            {saving === 'success' ? '...' : 'Yes'}
                        </button>
                        <button
                            className="diaper-quick-btn poo"
                            onClick={(e) => handleQuickLog('attempt', e)}
                            disabled={saving !== null}
                            style={{ background: '#6b7280' }}
                        >
                            <X size={14} />
                            {saving === 'attempt' ? '...' : 'Try'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
