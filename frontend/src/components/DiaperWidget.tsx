/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Droplets, CircleDot, Plus } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';

// Format time ago
function formatTimeAgo(dateStr: string | null): string | null {
    if (!dateStr) return null;
    const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;

    if (diffHours < 24) {
        return remainingMins > 0 ? `${diffHours}h ${remainingMins}m ago` : `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

interface DiaperWidgetProps { babyId: number; lastDiaper: any; onDiaperChange: () => void; onOpenModal: () => void; quickActionsEnabled?: boolean; }
export default function DiaperWidget({ babyId, lastDiaper, onDiaperChange, onOpenModal, quickActionsEnabled = true }: DiaperWidgetProps) {
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
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} diaper logged`);
            onDiaperChange();
        } catch (error) {
            console.error('Failed to log diaper:', error);
            toast.error('Failed to log diaper');
        } finally {
            setSaving(null);
        }
    };

    const timeAgo = lastDiaper ? formatTimeAgo(lastDiaper.time) : null;

    // Format last diaper type for display
    const getLastDiaperType = () => {
        if (!lastDiaper?.type) return null;
        const typeMap: Record<string, string> = { pee: 'Pee', poo: 'Poo', mixed: 'Both' };
        return typeMap[lastDiaper.type] || lastDiaper.type;
    };

    return (
        <div
            className="widget diaper"
            onClick={onOpenModal}
        >
            {/* Background icon */}
            <div className="widget-bg-icon">
                <img
                    src="/icons/diaper.png"
                    alt="diaper"
                    style={{ width: 80, height: 80, objectFit: 'contain' }}
                />
            </div>

            {/* Plus icon for full modal */}
            <div className="widget-add-icon" title="Log with details">
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <img
                        src="/icons/diaper.png"
                        alt="diaper"
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                    />
                    <span className="widget-label">Diaper</span>
                </div>

                {lastDiaper ? (
                    <>
                        <div className="widget-time-ago">{timeAgo}</div>
                        <div className="widget-detail">{getLastDiaperType()}</div>
                    </>
                ) : !quickActionsEnabled ? (
                    <div className="widget-time-ago">No diapers yet</div>
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
                            {saving === 'pee' ? '...' : 'Pee'}
                        </button>
                        <button
                            className="diaper-quick-btn poo"
                            onClick={(e) => handleQuickLog('poo', e)}
                            disabled={saving !== null}
                        >
                            <CircleDot size={14} />
                            {saving === 'poo' ? '...' : 'Poo'}
                        </button>
                        <button
                            className="diaper-quick-btn mixed"
                            onClick={(e) => handleQuickLog('mixed', e)}
                            disabled={saving !== null}
                        >
                            {saving === 'mixed' ? '...' : 'Both'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
