/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Smile, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { showApiError } from '../../utils/errorHandling';
import { formatDate } from '../../utils/formatDate';
import { calculateAgeInMonths } from '../../utils/ageUtils';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '../ConfirmModal';

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
const ERUPTION_AGES: Record<string, { min: number; max: number; avg: number }> = {
    'A': { min: 6, max: 12, avg: 8 },   // Central Incisor
    'B': { min: 9, max: 16, avg: 12 },  // Lateral Incisor
    'C': { min: 16, max: 23, avg: 18 }, // Canine
    'D': { min: 13, max: 19, avg: 14 }, // 1st Molar
    'E': { min: 23, max: 33, avg: 26 }, // 2nd Molar
};

type Mode = 'emerging' | 'emerged';

interface TeethingCardProps { baby: any; teeth: any[]; onToothAdded?: () => void; onToothDeleted?: () => void; }
export default function TeethingCard({ baby, teeth, onToothAdded, onToothDeleted }: TeethingCardProps) {
    const { t } = useTranslation('health');
    const [selectedTooth, setSelectedTooth] = useState<any>(null);
    const [logMode, setLogMode] = useState<Mode | null>(null);
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [saving, setSaving] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    // Build a map of teeth records by position
    const teethMap: Record<string, any> = {};
    teeth?.forEach(tooth => {
        teethMap[tooth.position] = tooth;
    });

    const emergedCount = (teeth ?? []).filter(t => t.emerged_date).length;

    // Calculate baby age in months
    const babyAgeMonths = baby?.birth_date ? calculateAgeInMonths(baby.birth_date) : null;

    const openLogModal = (toothInfo: any, mode: Mode) => {
        setSelectedTooth(toothInfo);
        setLogMode(mode);
        setLogDate(new Date().toISOString().split('T')[0]);
    };

    const handleToothClick = (toothInfo: any) => {
        const existing = teethMap[toothInfo.position];
        setSelectedTooth({ ...toothInfo, record: existing ?? null });
        setLogMode(null);
    };

    const handleSave = async () => {
        if (!selectedTooth || !logMode) return;

        setSaving(true);
        try {
            const record = teethMap[selectedTooth.position];
            if (record) {
                // Promote an existing emerging record to emerged (or amend)
                await api.updateTooth(record.id, {
                    baby_id: baby.id,
                    position: selectedTooth.position,
                    emerging_date: record.emerging_date,
                    emerged_date: logMode === 'emerged' ? logDate : record.emerged_date,
                });
            } else {
                await api.createTooth({
                    baby_id: baby.id,
                    position: selectedTooth.position,
                    emerging_date: logMode === 'emerging' ? logDate : null,
                    emerged_date: logMode === 'emerged' ? logDate : null,
                });
            }
            toast.success(
                logMode === 'emerged'
                    ? t('teething.toothMarkedEmerged', { name: selectedTooth.name })
                    : t('teething.toothMarkedEmerging', { name: selectedTooth.name }),
            );
            setSelectedTooth(null);
            setLogMode(null);
            if (onToothAdded) onToothAdded();
        } catch (error) {
            showApiError(error, t('failedToSave'), t);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (toothId: number) => {
        try {
            await api.deleteTooth(toothId);
            toast.success(t('toast_toothRecordRemoved'));
            setSelectedTooth(null);
            setLogMode(null);
            if (onToothDeleted) onToothDeleted();
        } catch (error) {
            showApiError(error, t('failedToDelete'), t);
        }
    };

    const getToothStatus = (position: string, label: string): string => {
        const record = teethMap[position];
        if (record?.emerged_date) return 'emerged';
        if (record?.emerging_date) return 'emerging';
        if (babyAgeMonths === null) return 'unknown';

        const ages = ERUPTION_AGES[label];
        if (!ages) return 'unknown';

        if (babyAgeMonths >= ages.min && babyAgeMonths <= ages.max) return 'due-now';
        if (babyAgeMonths > ages.max) return 'overdue';
        return 'future';
    };

    const renderToothRow = (teethRow: any[], isUpper: boolean) => (
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
                        <span className="tooth-icon">
                            {status === 'emerged' ? '🦷' : status === 'emerging' ? '◐' : '○'}
                        </span>
                    </button>
                );
            })}
        </div>
    );

    const record = selectedTooth?.record ?? null;
    const showInfo = selectedTooth && logMode === null;

    return (
        <div className="health-card teething-card">
            <div className="health-card-header">
                <h3 className="health-card-title">
                    <Smile size={18} />
                    {t('teething.title')}
                </h3>
                <span className="health-card-count">{t('teething.teethCount', { count: emergedCount })}</span>
            </div>

            {/* Teeth Diagram */}
            <div className="teeth-diagram">
                <div className="teeth-label">{t('teething.upper')}</div>
                {renderToothRow(TEETH_MAP.upper, true)}
                <div className="teeth-divider" />
                {renderToothRow(TEETH_MAP.lower, false)}
                <div className="teeth-label">{t('teething.lower')}</div>
            </div>

            {/* Legend */}
            <div className="teeth-legend">
                <span className="legend-item"><span className="legend-dot emerged" /> {t('teething.emerged')}</span>
                <span className="legend-item"><span className="legend-dot emerging" /> {t('teething.emerging')}</span>
                <span
                    className="legend-item"
                    title={t('teething.dueNowHint')}
                >
                    <span className="legend-dot due-now" /> {t('teething.dueNow')}
                    <Info size={12} style={{ marginLeft: 4, opacity: 0.6 }} aria-hidden="true" />
                </span>
                <span className="legend-item"><span className="legend-dot future" /> {t('teething.future')}</span>
            </div>

            {/* Info / action modal */}
            {showInfo && selectedTooth && (
                <div className="tooth-modal-overlay" onClick={() => setSelectedTooth(null)}>
                    <div className="tooth-modal" onClick={e => e.stopPropagation()}>
                        <button className="tooth-modal-close" onClick={() => setSelectedTooth(null)}>
                            <X size={18} />
                        </button>
                        <h4>{selectedTooth.name}</h4>
                        <p className="tooth-modal-subtitle">
                            {selectedTooth.position.includes('upper') ? t('teething.upper') : t('teething.lower')} {selectedTooth.label}
                        </p>

                        {record?.emerging_date && (
                            <p className="tooth-emerged-date">
                                {t('teething.emergingDate', { date: formatDate(record.emerging_date) })}
                            </p>
                        )}
                        {record?.emerged_date && (
                            <p className="tooth-emerged-date">
                                {t('teething.emergedDate', { date: formatDate(record.emerged_date) })}
                            </p>
                        )}

                        <div className="tooth-modal-actions">
                            {!record && (
                                <>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => openLogModal(selectedTooth, 'emerging')}
                                    >
                                        {t('teething.markEmergingBtn')}
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => openLogModal(selectedTooth, 'emerged')}
                                    >
                                        {t('teething.markEmergedBtn')}
                                    </button>
                                </>
                            )}
                            {record && !record.emerged_date && (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => openLogModal(selectedTooth, 'emerged')}
                                >
                                    {t('teething.updateToEmerged')}
                                </button>
                            )}
                            {record && (
                                <button
                                    className="btn btn-ghost btn-danger"
                                    onClick={() => setConfirmDeleteId(record.id)}
                                >
                                    {t('teething.removeRecord')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Date picker modal */}
            {selectedTooth && logMode && (
                <div className="tooth-modal-overlay" onClick={() => setLogMode(null)}>
                    <div className="tooth-modal" onClick={e => e.stopPropagation()}>
                        <button className="tooth-modal-close" onClick={() => setLogMode(null)}>
                            <X size={18} />
                        </button>
                        <h4>
                            {logMode === 'emerged'
                                ? t('teething.markEmerged', { name: selectedTooth.name })
                                : t('teething.markEmerging', { name: selectedTooth.name })}
                        </h4>
                        <p className="tooth-modal-subtitle">
                            {selectedTooth.position.includes('upper') ? t('teething.upper') : t('teething.lower')} {selectedTooth.label}
                        </p>
                        <input
                            type="date"
                            value={logDate}
                            onChange={(e) => setLogDate(e.target.value)}
                            className="tooth-date-input"
                        />
                        <div className="tooth-modal-actions">
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving
                                    ? t('common:saving')
                                    : logMode === 'emerged'
                                        ? t('teething.markEmergedBtn')
                                        : t('teething.markEmergingBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={confirmDeleteId !== null}
                onConfirm={() => { handleDelete(confirmDeleteId!); setConfirmDeleteId(null); }}
                onCancel={() => setConfirmDeleteId(null)}
            />
        </div>
    );
}
