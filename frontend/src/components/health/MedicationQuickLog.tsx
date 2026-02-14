import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { api } from '../../api/client';
import { useBaby } from '../../hooks/useBaby';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface MedicationQuickLogProps {
    onDismiss: () => void;
}

interface Medication {
    id: number;
    medication_name: string;
    dosage?: string;
    is_active?: boolean;
}

function medToSupplementName(medName: string): string {
    const lower = medName.toLowerCase();
    if (lower.includes('vitamin d')) return 'vitamin_d';
    if (lower.includes('iron')) return 'iron';
    if (lower.includes('dha') || lower.includes('omega')) return 'dha';
    if (lower.includes('probiotic')) return 'probiotic';
    if (lower.includes('multivitamin')) return 'multivitamin';
    return 'other';
}

export { medToSupplementName };

export default function MedicationQuickLog({ onDismiss }: MedicationQuickLogProps) {
    const { t } = useTranslation('health');
    const { selectedBaby } = useBaby();
    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(true);
    const [logged, setLogged] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!selectedBaby) return;
        api.getMedications(selectedBaby.id, true).then((meds) => {
            setMedications(meds.filter((m: Medication) => m.is_active));
            setLoading(false);
        }).catch(() => {
            setLoading(false);
        });
    }, [selectedBaby]);

    const handleLog = async (med: Medication) => {
        if (!selectedBaby) return;
        try {
            await api.createSupplement({
                baby_id: selectedBaby.id,
                time: new Date().toISOString(),
                name: medToSupplementName(med.medication_name),
                dosage: med.dosage || null,
                notes: med.medication_name,
            });
            setLogged((prev) => new Set(prev).add(med.id));
            toast.success(t('medicationQuickLog.logged', { name: med.medication_name }));
        } catch (error) {
            console.error('Failed to log medication as supplement:', error);
            toast.error(t('medicationQuickLog.logFailed', { defaultValue: 'Failed to log medication' }));
        }
    };

    return (
        <div className="med-quick-log-overlay" onClick={onDismiss}>
            <div className="med-quick-log-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="med-quick-log-header">
                    <span className="med-quick-log-title">
                        {t('medicationQuickLog.title')}
                    </span>
                    <button className="modal-close" onClick={onDismiss}>
                        <X size={16} />
                    </button>
                </div>
                <div className="med-quick-log-body">
                    {loading ? (
                        <div className="loading"><div className="spinner" /></div>
                    ) : medications.length === 0 ? (
                        <p className="med-quick-log-empty">{t('medicationQuickLog.noActiveMeds')}</p>
                    ) : (
                        medications.map((med) => (
                            <div key={med.id} className="med-quick-log-item">
                                <div className="med-quick-log-info">
                                    <span className="med-quick-log-name">{med.medication_name}</span>
                                    {med.dosage && <span className="med-quick-log-dosage">{med.dosage}</span>}
                                </div>
                                <button
                                    className={`med-quick-log-btn ${logged.has(med.id) ? 'done' : ''}`}
                                    onClick={() => handleLog(med)}
                                    disabled={logged.has(med.id)}
                                >
                                    <Check size={16} />
                                    {logged.has(med.id) ? t('medicationQuickLog.taken') : t('medicationQuickLog.taken')}
                                </button>
                            </div>
                        ))
                    )}
                </div>
                <div className="med-quick-log-footer">
                    <button className="med-quick-log-done" onClick={onDismiss}>
                        {t('medicationQuickLog.done')}
                    </button>
                </div>
            </div>
        </div>
    );
}
