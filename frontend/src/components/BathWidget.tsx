/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatTimeAgo } from '../utils/formatTime';
import { useState } from 'react';
import { ShowerHead, Plus, Check } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useBaby } from '../hooks/useBaby';


interface BathWidgetProps { lastBath: any; onBathChange: () => void; onOpenModal: () => void; quickActionsEnabled?: boolean; }
export default function BathWidget({ lastBath, onBathChange, onOpenModal, quickActionsEnabled = true }: BathWidgetProps) {
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
