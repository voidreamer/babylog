import { useState } from 'react';
import { Smile, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { format, parseISO } from 'date-fns';

// Baby teeth positions - 20 total
// Upper: A-E (left to right from baby's perspective)
// Lower: A-E (left to right from baby's perspective)
const TEETH_MAP = {
    upper: [
        { position: 'upper_E_left', label: 'E', name: '2nd Molar' },
        { position: 'upper_D_left', label: 'D', name: '1st Molar' },
        { position: 'upper_C_left', label: 'C', name: 'Canine' },
        { position: 'upper_B_left', label: 'B', name: 'Lateral Incisor' },
        { position: 'upper_A_left', label: 'A', name: 'Central Incisor' },
        { position: 'upper_A_right', label: 'A', name: 'Central Incisor' },
        { position: 'upper_B_right', label: 'B', name: 'Lateral Incisor' },
        { position: 'upper_C_right', label: 'C', name: 'Canine' },
        { position: 'upper_D_right', label: 'D', name: '1st Molar' },
        { position: 'upper_E_right', label: 'E', name: '2nd Molar' },
    ],
    lower: [
        { position: 'lower_E_left', label: 'E', name: '2nd Molar' },
        { position: 'lower_D_left', label: 'D', name: '1st Molar' },
        { position: 'lower_C_left', label: 'C', name: 'Canine' },
        { position: 'lower_B_left', label: 'B', name: 'Lateral Incisor' },
        { position: 'lower_A_left', label: 'A', name: 'Central Incisor' },
        { position: 'lower_A_right', label: 'A', name: 'Central Incisor' },
        { position: 'lower_B_right', label: 'B', name: 'Lateral Incisor' },
        { position: 'lower_C_right', label: 'C', name: 'Canine' },
        { position: 'lower_D_right', label: 'D', name: '1st Molar' },
        { position: 'lower_E_right', label: 'E', name: '2nd Molar' },
    ],
};

// Typical eruption ages in months (ranges)
const ERUPTION_AGES = {
    'A': { min: 6, max: 12, avg: 8 },   // Central Incisor
    'B': { min: 9, max: 16, avg: 12 },  // Lateral Incisor
    'C': { min: 16, max: 23, avg: 18 }, // Canine
    'D': { min: 13, max: 19, avg: 14 }, // 1st Molar
    'E': { min: 23, max: 33, avg: 26 }, // 2nd Molar
};

export default function TeethingCard({ baby, teeth, onToothAdded, onToothDeleted }) {
    const [selectedTooth, setSelectedTooth] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [emergedDate, setEmergedDate] = useState(new Date().toISOString().split('T')[0]);
    const [saving, setSaving] = useState(false);

    // Build a map of emerged teeth for quick lookup
    const emergedTeethMap = {};
    teeth?.forEach(t => {
        emergedTeethMap[t.position] = t;
    });

    const teethCount = teeth?.length || 0;

    // Calculate baby age in months
    const babyAgeMonths = baby?.birth_date
        ? Math.floor((new Date() - new Date(baby.birth_date)) / (1000 * 60 * 60 * 24 * 30.44))
        : null;

    const handleToothClick = (toothInfo) => {
        const existingTooth = emergedTeethMap[toothInfo.position];
        if (existingTooth) {
            // Show info about this tooth
            setSelectedTooth({ ...toothInfo, emerged: existingTooth });
        } else {
            // Allow marking as emerged
            setSelectedTooth(toothInfo);
            setShowDatePicker(true);
        }
    };

    const handleMarkEmerged = async () => {
        if (!selectedTooth) return;

        setSaving(true);
        try {
            await api.createTooth({
                baby_id: baby.id,
                position: selectedTooth.position,
                emerged_date: new Date(emergedDate).toISOString(),
            });
            toast.success(`${selectedTooth.name} marked as emerged!`);
            setSelectedTooth(null);
            setShowDatePicker(false);
            if (onToothAdded) onToothAdded();
        } catch (error) {
            toast.error('Failed to save: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (toothId) => {
        try {
            await api.deleteTooth(toothId);
            toast.success('Tooth record removed');
            setSelectedTooth(null);
            if (onToothDeleted) onToothDeleted();
        } catch (error) {
            toast.error('Failed to delete: ' + error.message);
        }
    };

    const formatDate = (dateStr) => {
        try {
            return format(parseISO(dateStr), 'MMM d, yyyy');
        } catch {
            return dateStr;
        }
    };

    const getToothStatus = (position, label) => {
        if (emergedTeethMap[position]) return 'emerged';
        if (babyAgeMonths === null) return 'unknown';

        const ages = ERUPTION_AGES[label];
        if (!ages) return 'unknown';

        if (babyAgeMonths >= ages.min && babyAgeMonths <= ages.max) return 'expected';
        if (babyAgeMonths > ages.max) return 'overdue';
        return 'future';
    };

    const renderToothRow = (teethRow, isUpper) => (
        <div className={`teeth-row ${isUpper ? 'upper' : 'lower'}`}>
            {teethRow.map((tooth) => {
                const status = getToothStatus(tooth.position, tooth.label);
                return (
                    <button
                        key={tooth.position}
                        className={`tooth-btn ${status}`}
                        onClick={() => handleToothClick(tooth)}
                        title={`${tooth.name} (${tooth.label})`}
                    >
                        <span className="tooth-icon">{status === 'emerged' ? '🦷' : '○'}</span>
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="health-card teething-card">
            <div className="health-card-header">
                <h3 className="health-card-title">
                    <Smile size={18} />
                    Teething
                </h3>
                <span className="health-card-count">{teethCount}/20 teeth</span>
            </div>

            {/* Teeth Diagram */}
            <div className="teeth-diagram">
                <div className="teeth-label">Upper</div>
                {renderToothRow(TEETH_MAP.upper, true)}
                <div className="teeth-divider" />
                {renderToothRow(TEETH_MAP.lower, false)}
                <div className="teeth-label">Lower</div>
            </div>

            {/* Legend */}
            <div className="teeth-legend">
                <span className="legend-item"><span className="legend-dot emerged" /> Emerged</span>
                <span className="legend-item"><span className="legend-dot expected" /> Expected</span>
                <span className="legend-item"><span className="legend-dot future" /> Future</span>
            </div>

            {/* Date Picker Modal */}
            {showDatePicker && selectedTooth && !selectedTooth.emerged && (
                <div className="tooth-modal-overlay" onClick={() => setShowDatePicker(false)}>
                    <div className="tooth-modal" onClick={e => e.stopPropagation()}>
                        <button className="tooth-modal-close" onClick={() => setShowDatePicker(false)}>
                            <X size={18} />
                        </button>
                        <h4>Mark {selectedTooth.name} as Emerged</h4>
                        <p className="tooth-modal-subtitle">
                            {selectedTooth.position.includes('upper') ? 'Upper' : 'Lower'} {selectedTooth.label}
                        </p>
                        <input
                            type="date"
                            value={emergedDate}
                            onChange={(e) => setEmergedDate(e.target.value)}
                            className="tooth-date-input"
                        />
                        <div className="tooth-modal-actions">
                            <button
                                className="btn btn-primary"
                                onClick={handleMarkEmerged}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Mark Emerged'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Modal for emerged tooth */}
            {selectedTooth?.emerged && (
                <div className="tooth-modal-overlay" onClick={() => setSelectedTooth(null)}>
                    <div className="tooth-modal" onClick={e => e.stopPropagation()}>
                        <button className="tooth-modal-close" onClick={() => setSelectedTooth(null)}>
                            <X size={18} />
                        </button>
                        <h4>{selectedTooth.name}</h4>
                        <p className="tooth-modal-subtitle">
                            {selectedTooth.position.includes('upper') ? 'Upper' : 'Lower'} {selectedTooth.label}
                        </p>
                        <p className="tooth-emerged-date">
                            Emerged: {formatDate(selectedTooth.emerged.emerged_date)}
                        </p>
                        <div className="tooth-modal-actions">
                            <button
                                className="btn btn-ghost btn-danger"
                                onClick={() => handleDelete(selectedTooth.emerged.id)}
                            >
                                Remove Record
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
