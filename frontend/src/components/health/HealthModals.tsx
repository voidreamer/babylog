/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { api } from '../../api/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClipboardList, Syringe, Pill, Star, TrendingUp } from 'lucide-react';
import { parseUTCTime } from '../../utils/parseTime';
import { useTranslation } from 'react-i18next';


const MILESTONE_OPTIONS = [
    'First smile', 'First laugh', 'Rolled over', 'Sat up independently',
    'First tooth', 'Started crawling', 'First steps', 'First word',
    'First solid food', 'Slept through the night', 'Waved goodbye',
    'Clapped hands', 'Other'
];

interface VisitModalProps { babyId: number; editData?: any; onClose: () => void; onSave: () => void; }
export function VisitModal({ babyId, editData, onClose, onSave }: VisitModalProps) {
    const { t } = useTranslation('health');
    const [visitDate, setVisitDate] = useState(
        editData ? format(parseUTCTime(editData.visit_date), 'yyyy-MM-dd') : new Date().toISOString().slice(0, 10)
    );
    const [visitType, setVisitType] = useState(editData?.visit_type || 'checkup');
    const [doctorName, setDoctorName] = useState(editData?.doctor_name || '');
    const [weight, setWeight] = useState(editData?.weight_kg?.toString() || '');
    const [height, setHeight] = useState(editData?.height_cm?.toString() || '');
    const [head, setHead] = useState(editData?.head_cm?.toString() || '');
    const [nextVisitDate, setNextVisitDate] = useState(
        editData?.next_visit_date ? format(parseUTCTime(editData.next_visit_date), 'yyyy-MM-dd') : ''
    );
    const [notes, setNotes] = useState(editData?.notes || '');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = {
                baby_id: babyId,
                visit_date: new Date(visitDate).toISOString(),
                visit_type: visitType,
                doctor_name: doctorName || null,
                weight_kg: weight ? parseFloat(weight) : null,
                height_cm: height ? parseFloat(height) : null,
                head_cm: head ? parseFloat(head) : null,
                next_visit_date: nextVisitDate ? new Date(nextVisitDate).toISOString() : null,
                notes: notes || null,
            };

            if (editData) {
                await api.updateDoctorVisit(editData.id, data);
                toast.success(t('toast_visitUpdated'));
            } else {
                await api.createDoctorVisit(data);
                toast.success(t('toast_visitLogged'));
            }
            onSave();
        } catch (error) {
            toast.error(t('toast_failedToSave'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><ClipboardList size={20} style={{ marginRight: '8px' }} /> {editData ? 'Edit' : 'Log'} Doctor Visit</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-input" value={visitDate} onChange={e => setVisitDate(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select className="form-input" value={visitType} onChange={e => setVisitType(e.target.value)}>
                                <option value="checkup">Checkup</option>
                                <option value="sick">Sick Visit</option>
                                <option value="emergency">Emergency</option>
                                <option value="specialist">Specialist</option>
                                <option value="vaccination">Vaccination</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Doctor Name</label>
                            <input type="text" className="form-input" value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder={t('placeholder_optional')} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Weight (kg)</label>
                                <input type="number" step="0.01" className="form-input" value={weight} onChange={e => setWeight(e.target.value)} placeholder={t('placeholder_35')} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Height (cm)</label>
                                <input type="number" step="0.1" className="form-input" value={height} onChange={e => setHeight(e.target.value)} placeholder={t('placeholder_50')} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Head (cm)</label>
                                <input type="number" step="0.1" className="form-input" value={head} onChange={e => setHead(e.target.value)} placeholder={t('placeholder_35')} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Next Visit Date</label>
                            <input type="date" className="form-input" value={nextVisitDate} onChange={e => setNextVisitDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('placeholder_optional')} maxLength={500} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface VaccModalProps { babyId: number; editData?: any; onClose: () => void; onSave: () => void; }
export function VaccModal({ babyId, editData, onClose, onSave }: VaccModalProps) {
    const [vaccineName, setVaccineName] = useState(editData?.vaccine_name || '');
    const [doseNumber, setDoseNumber] = useState(editData?.dose_number || 1);
    const [givenDate, setGivenDate] = useState(
        editData ? format(parseUTCTime(editData.given_date), 'yyyy-MM-dd') : new Date().toISOString().slice(0, 10)
    );
    const [administeredBy, setAdministeredBy] = useState(editData?.administered_by || '');
    const [nextDueDate, setNextDueDate] = useState(
        editData?.next_due_date ? format(parseUTCTime(editData.next_due_date), 'yyyy-MM-dd') : ''
    );
    const [notes, setNotes] = useState(editData?.notes || '');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = {
                baby_id: babyId,
                vaccine_name: vaccineName,
                dose_number: doseNumber,
                given_date: new Date(givenDate).toISOString(),
                administered_by: administeredBy || null,
                next_due_date: nextDueDate ? new Date(nextDueDate).toISOString() : null,
                notes: notes || null,
            };

            if (editData) {
                await api.updateVaccination(editData.id, data);
                toast.success(t('toast_vaccinationUpdated'));
            } else {
                await api.createVaccination(data);
                toast.success(t('toast_vaccinationLogged'));
            }
            onSave();
        } catch (error) {
            toast.error(t('toast_failedToSave'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Syringe size={20} style={{ marginRight: '8px' }} /> {editData ? 'Edit' : 'Log'} Vaccination</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Vaccine Name</label>
                            <input type="text" className="form-input" value={vaccineName} onChange={e => setVaccineName(e.target.value)} placeholder={t('placeholder_egDtapMmr')} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Dose #</label>
                                <input type="number" className="form-input" value={doseNumber} onChange={e => setDoseNumber(parseInt(e.target.value))} min="1" max="10" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date Given</label>
                                <input type="date" className="form-input" value={givenDate} onChange={e => setGivenDate(e.target.value)} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Administered By</label>
                            <input type="text" className="form-input" value={administeredBy} onChange={e => setAdministeredBy(e.target.value)} placeholder={t('placeholder_doctorclinicName')} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Next Due Date</label>
                            <input type="date" className="form-input" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('placeholder_optional')} maxLength={500} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface MedModalProps { babyId: number; editData?: any; onClose: () => void; onSave: () => void; }
export function MedModal({ babyId, editData, onClose, onSave }: MedModalProps) {
    const [medicationName, setMedicationName] = useState(editData?.medication_name || '');
    const [dosage, setDosage] = useState(editData?.dosage || '');
    const [frequency, setFrequency] = useState(editData?.frequency || '');
    const [startDate, setStartDate] = useState(
        editData ? format(parseUTCTime(editData.start_date), 'yyyy-MM-dd') : new Date().toISOString().slice(0, 10)
    );
    const [notes, setNotes] = useState(editData?.notes || '');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = {
                baby_id: babyId,
                medication_name: medicationName,
                dosage: dosage || null,
                frequency: frequency || null,
                start_date: new Date(startDate).toISOString(),
                is_active: editData ? editData.is_active : true,
                notes: notes || null,
            };

            if (editData) {
                await api.updateMedication(editData.id, data);
                toast.success(t('toast_medicationUpdated'));
            } else {
                await api.createMedication(data);
                toast.success(t('toast_medicationAdded'));
            }
            onSave();
        } catch (error) {
            toast.error(t('toast_failedToSave'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Pill size={20} style={{ marginRight: '8px' }} /> {editData ? 'Edit' : 'Add'} Medication</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Medication Name</label>
                            <input type="text" className="form-input" value={medicationName} onChange={e => setMedicationName(e.target.value)} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Dosage</label>
                                <input type="text" className="form-input" value={dosage} onChange={e => setDosage(e.target.value)} placeholder={t('placeholder_eg25ml')} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Frequency</label>
                                <input type="text" className="form-input" value={frequency} onChange={e => setFrequency(e.target.value)} placeholder={t('placeholder_egTwiceDaily')} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('placeholder_optional')} maxLength={500} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface MilestoneModalProps { babyId: number; editData?: any; onClose: () => void; onSave: () => void; }
export function MilestoneModal({ babyId, editData, onClose, onSave }: MilestoneModalProps) {
    const isCustomMilestone = editData && !MILESTONE_OPTIONS.includes(editData.milestone_type);
    const [milestoneType, setMilestoneType] = useState(
        editData ? (isCustomMilestone ? 'Other' : editData.milestone_type) : ''
    );
    const [customType, setCustomType] = useState(isCustomMilestone ? editData.milestone_type : '');
    const [achievedDate, setAchievedDate] = useState(
        editData ? format(parseUTCTime(editData.achieved_date), 'yyyy-MM-dd') : new Date().toISOString().slice(0, 10)
    );
    const [notes, setNotes] = useState(editData?.notes || '');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = {
                baby_id: babyId,
                milestone_type: milestoneType === 'Other' ? customType : milestoneType,
                achieved_date: new Date(achievedDate).toISOString(),
                notes: notes || null,
            };

            if (editData) {
                await api.updateMilestone(editData.id, data);
                toast.success(t('toast_milestoneUpdated'));
            } else {
                await api.createMilestone(data);
                toast.success(t('toast_milestoneLogged'));
            }
            onSave();
        } catch (error) {
            toast.error(t('toast_failedToSave'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Star size={20} style={{ marginRight: '8px' }} /> {editData ? 'Edit' : 'Log'} Milestone</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Milestone</label>
                            <select className="form-input" value={milestoneType} onChange={e => setMilestoneType(e.target.value)} required>
                                <option value="">Select a milestone...</option>
                                {MILESTONE_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        {milestoneType === 'Other' && (
                            <div className="form-group">
                                <label className="form-label">Custom Milestone</label>
                                <input type="text" className="form-input" value={customType} onChange={e => setCustomType(e.target.value)} required />
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Date Achieved</label>
                            <input type="date" className="form-input" value={achievedDate} onChange={e => setAchievedDate(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('placeholder_optional')} maxLength={500} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface GrowthModalProps { babyId: number; editData?: any; onClose: () => void; onSave: () => void; }
export function GrowthModal({ babyId, editData, onClose, onSave }: GrowthModalProps) {
    const [recordedDate, setRecordedDate] = useState(
        editData ? format(parseUTCTime(editData.recorded_date), 'yyyy-MM-dd') : new Date().toISOString().slice(0, 10)
    );
    const [weight, setWeight] = useState(editData?.weight_kg?.toString() || '');
    const [height, setHeight] = useState(editData?.height_cm?.toString() || '');
    const [head, setHead] = useState(editData?.head_cm?.toString() || '');
    const [notes, setNotes] = useState(editData?.notes || '');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = {
                baby_id: babyId,
                recorded_date: new Date(recordedDate).toISOString(),
                weight_kg: weight ? parseFloat(weight) : null,
                height_cm: height ? parseFloat(height) : null,
                head_cm: head ? parseFloat(head) : null,
                notes: notes || null,
            };

            if (editData) {
                await api.updateGrowthRecord(editData.id, data);
                toast.success(t('toast_growthRecordUpdated'));
            } else {
                await api.createGrowthRecord(data);
                toast.success(t('toast_growthRecordLogged'));
            }
            onSave();
        } catch (error) {
            toast.error(t('toast_failedToSave'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><TrendingUp size={20} style={{ marginRight: '8px' }} /> {editData ? 'Edit' : 'Log'} Growth</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-input" value={recordedDate} onChange={e => setRecordedDate(e.target.value)} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Weight (kg)</label>
                                <input type="number" step="0.01" className="form-input" value={weight} onChange={e => setWeight(e.target.value)} placeholder={t('placeholder_35')} min="0" max="50" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Height (cm)</label>
                                <input type="number" step="0.1" className="form-input" value={height} onChange={e => setHeight(e.target.value)} placeholder={t('placeholder_50')} min="0" max="200" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Head (cm)</label>
                                <input type="number" step="0.1" className="form-input" value={head} onChange={e => setHead(e.target.value)} placeholder={t('placeholder_35')} min="0" max="100" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('placeholder_optional')} maxLength={500} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
