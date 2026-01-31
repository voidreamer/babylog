/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Stethoscope, Syringe, Pill, Plus, Trash2, ChevronDown, ChevronUp, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { format, parseISO, isFuture } from 'date-fns';
import { formatDate } from '../../utils/formatDate';
import { useTranslation } from 'react-i18next';
import VaccinationSchedule from './VaccinationSchedule';

const VISIT_TYPE_KEYS = ['checkup', 'sick', 'vaccination', 'specialist', 'emergency'] as const;

interface RecordsSectionProps { baby: any; visits: any[]; vaccinations: any[]; medications: any[]; onDataChanged?: () => void; }
export default function RecordsSection({ baby, visits, vaccinations, medications, onDataChanged }: RecordsSectionProps) {
    const { t } = useTranslation('health');
    const [activeTab, setActiveTab] = useState('visits');

    return (
        <div className="records-section">
            <div className="records-tabs">
                <button
                    className={`records-tab ${activeTab === 'visits' ? 'active' : ''}`}
                    onClick={() => setActiveTab('visits')}
                >
                    <Stethoscope size={16} />
                    {t('records.visits')}
                    {visits?.length > 0 && <span className="tab-count">{visits.length}</span>}
                </button>
                <button
                    className={`records-tab ${activeTab === 'vaccinations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('vaccinations')}
                >
                    <Syringe size={16} />
                    {t('records.vaccinations')}
                    {vaccinations?.length > 0 && <span className="tab-count">{vaccinations.length}</span>}
                </button>
                <button
                    className={`records-tab ${activeTab === 'schedule' ? 'active' : ''}`}
                    onClick={() => setActiveTab('schedule')}
                >
                    <CalendarCheck size={16} />
                    {t('records.schedule')}
                </button>
                <button
                    className={`records-tab ${activeTab === 'medications' ? 'active' : ''}`}
                    onClick={() => setActiveTab('medications')}
                >
                    <Pill size={16} />
                    {t('records.medications')}
                    {medications?.filter(m => m.is_active).length > 0 && (
                        <span className="tab-count">{medications.filter(m => m.is_active).length}</span>
                    )}
                </button>
            </div>

            <div className="records-content">
                {activeTab === 'visits' && (
                    <VisitsPanel baby={baby} visits={visits} onDataChanged={onDataChanged} />
                )}
                {activeTab === 'vaccinations' && (
                    <VaccinationsPanel baby={baby} vaccinations={vaccinations} onDataChanged={onDataChanged} />
                )}
                {activeTab === 'schedule' && (
                    <VaccinationSchedule baby={baby} vaccinations={vaccinations} onDataChanged={onDataChanged} />
                )}
                {activeTab === 'medications' && (
                    <MedicationsPanel baby={baby} medications={medications} onDataChanged={onDataChanged} />
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Visits Panel
// ============================================================================

function VisitsPanel({ baby, visits, onDataChanged }: { baby: any; visits: any[]; onDataChanged?: () => void }) {
    const { t } = useTranslation('health');
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        visit_date: new Date().toISOString().split('T')[0],
        visit_type: 'checkup',
        doctor_name: '',
        weight_kg: '',
        height_cm: '',
        head_cm: '',
        next_visit_date: '',
        notes: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setSaving(true);
        try {
            const data = {
                baby_id: baby.id,
                visit_date: new Date(formData.visit_date).toISOString(),
                visit_type: formData.visit_type,
                doctor_name: formData.doctor_name || null,
                weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
                height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
                head_cm: formData.head_cm ? parseFloat(formData.head_cm) : null,
                next_visit_date: formData.next_visit_date ? new Date(formData.next_visit_date).toISOString() : null,
                notes: formData.notes || null,
            };

            await api.createDoctorVisit(data);
            toast.success(t('toast_visitRecorded'));
            setFormData({
                visit_date: new Date().toISOString().split('T')[0],
                visit_type: 'checkup',
                doctor_name: '',
                weight_kg: '',
                height_cm: '',
                head_cm: '',
                next_visit_date: '',
                notes: '',
            });
            setIsAdding(false);
            if (onDataChanged) onDataChanged();
        } catch (error) {
            toast.error(t('failedToSave'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.deleteDoctorVisit(id);
            toast.success(t('toast_visitDeleted'));
            if (onDataChanged) onDataChanged();
        } catch (error) {
            toast.error(t('failedToDelete'));
        }
    };


    return (
        <div className="records-panel">
            {visits?.length > 0 ? (
                <div className="records-list">
                    {visits.map((visit) => (
                        <div key={visit.id} className="record-item">
                            <div className="record-header">
                                <span className="record-date">{formatDate(visit.visit_date)}</span>
                                <span className="record-type">{t(`records.visitTypes.${visit.visit_type}`)}</span>
                                <button
                                    className="record-delete"
                                    onClick={() => handleDelete(visit.id)}
                                    aria-label={t('arialabel_deleteVisit')}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            {visit.doctor_name && (
                                <p className="record-doctor">{t('records.dr', { name: visit.doctor_name })}</p>
                            )}
                            {(visit.weight_kg || visit.height_cm || visit.head_cm) && (
                                <div className="record-measurements">
                                    {visit.weight_kg && <span>{parseFloat(visit.weight_kg).toFixed(1)} kg</span>}
                                    {visit.height_cm && <span>{parseFloat(visit.height_cm).toFixed(1)} cm</span>}
                                    {visit.head_cm && <span>{t('records.headMeasurement', { value: parseFloat(visit.head_cm).toFixed(1) })}</span>}
                                </div>
                            )}
                            {visit.next_visit_date && (
                                <p className="record-next-visit">{t('records.nextVisit', { date: formatDate(visit.next_visit_date) })}</p>
                            )}
                            {visit.notes && <p className="record-notes">{visit.notes}</p>}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="records-empty">{t('records.noVisits')}</p>
            )}

            {isAdding ? (
                <form onSubmit={handleSubmit} className="record-form">
                    <div className="record-form-row">
                        <input
                            type="date"
                            value={formData.visit_date}
                            onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                            className="record-date-input"
                        />
                        <select
                            value={formData.visit_type}
                            onChange={(e) => setFormData({ ...formData, visit_type: e.target.value })}
                            className="record-select"
                        >
                            {VISIT_TYPE_KEYS.map(key => (
                                <option key={key} value={key}>{t(`records.visitTypes.${key}`)}</option>
                            ))}
                        </select>
                    </div>
                    <input
                        type="text"
                        placeholder={t('placeholder_doctorName')}
                        value={formData.doctor_name}
                        onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
                        className="record-text-input"
                    />
                    <div className="record-form-row measurements">
                        <input
                            type="number"
                            step="0.01"
                            placeholder={t('growth.weightKg')}
                            value={formData.weight_kg}
                            onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                            className="record-number-input"
                        />
                        <input
                            type="number"
                            step="0.1"
                            placeholder={t('growth.heightCm')}
                            value={formData.height_cm}
                            onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                            className="record-number-input"
                        />
                        <input
                            type="number"
                            step="0.1"
                            placeholder={t('placeholder_headCm')}
                            value={formData.head_cm}
                            onChange={(e) => setFormData({ ...formData, head_cm: e.target.value })}
                            className="record-number-input"
                        />
                    </div>
                    <div className="record-form-row">
                        <label className="record-inline-label">{t('modals.nextVisitDate')}</label>
                        <input
                            type="date"
                            value={formData.next_visit_date}
                            onChange={(e) => setFormData({ ...formData, next_visit_date: e.target.value })}
                            className="record-date-input"
                        />
                    </div>
                    <textarea
                        placeholder={t('placeholder_notes')}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="record-notes-input"
                        rows={2}
                    />
                    <div className="record-form-actions">
                        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                            {saving ? t('common:saving') : t('records.saveVisit')}
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setIsAdding(false)}
                        >
                            {t('common:cancel')}
                        </button>
                    </div>
                </form>
            ) : (
                <button className="records-add-btn" onClick={() => setIsAdding(true)}>
                    <Plus size={16} />
                    {t('records.addVisit')}
                </button>
            )}
        </div>
    );
}

// ============================================================================
// Vaccinations Panel
// ============================================================================

function VaccinationsPanel({ baby, vaccinations, onDataChanged }: { baby: any; vaccinations: any[]; onDataChanged?: () => void }) {
    const { t } = useTranslation('health');
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        vaccine_name: '',
        dose_number: '1',
        given_date: new Date().toISOString().split('T')[0],
        next_due_date: '',
        administered_by: '',
        notes: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.vaccine_name.trim()) {
            toast.error(t('toast_pleaseEnterVaccineName'));
            return;
        }

        setSaving(true);
        try {
            const data = {
                baby_id: baby.id,
                vaccine_name: formData.vaccine_name.trim(),
                dose_number: parseInt(formData.dose_number) || 1,
                given_date: new Date(formData.given_date).toISOString(),
                next_due_date: formData.next_due_date
                    ? new Date(formData.next_due_date).toISOString()
                    : null,
                administered_by: formData.administered_by || null,
                notes: formData.notes || null,
            };

            await api.createVaccination(data);
            toast.success(t('toast_vaccinationRecorded'));
            setFormData({
                vaccine_name: '',
                dose_number: '1',
                given_date: new Date().toISOString().split('T')[0],
                next_due_date: '',
                administered_by: '',
                notes: '',
            });
            setIsAdding(false);
            if (onDataChanged) onDataChanged();
        } catch (error) {
            toast.error(t('failedToSave'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.deleteVaccination(id);
            toast.success(t('toast_vaccinationDeleted'));
            if (onDataChanged) onDataChanged();
        } catch (error) {
            toast.error(t('failedToDelete'));
        }
    };


    // Group by vaccine name
    const groupedVaccines: Record<string, any[]> = {};
    vaccinations?.forEach(v => {
        if (!groupedVaccines[v.vaccine_name]) {
            groupedVaccines[v.vaccine_name] = [];
        }
        groupedVaccines[v.vaccine_name].push(v);
    });

    // Check for upcoming due dates
    const upcomingDue = vaccinations?.filter((v: any) =>
        v.next_due_date && isFuture(parseISO(v.next_due_date))
    ).sort((a: any, b: any) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());

    return (
        <div className="records-panel">
            {/* Upcoming reminders */}
            {upcomingDue?.length > 0 && (
                <div className="vaccination-reminders">
                    <h4 className="reminders-title">{t('records.upcoming')}</h4>
                    {upcomingDue.slice(0, 3).map(v => (
                        <div key={v.id} className="reminder-item">
                            <span className="reminder-vaccine">{v.vaccine_name} ({t('records.dose', { number: (v.dose_number || 0) + 1 })})</span>
                            <span className="reminder-date">{formatDate(v.next_due_date)}</span>
                        </div>
                    ))}
                </div>
            )}

            {vaccinations?.length > 0 ? (
                <div className="records-list">
                    {vaccinations.map((vax) => (
                        <div key={vax.id} className="record-item">
                            <div className="record-header">
                                <span className="record-date">{formatDate(vax.given_date)}</span>
                                <span className="vaccine-name">{vax.vaccine_name}</span>
                                <span className="vaccine-dose">{t('records.dose', { number: vax.dose_number })}</span>
                                <button
                                    className="record-delete"
                                    onClick={() => handleDelete(vax.id)}
                                    aria-label={t('arialabel_deleteVaccination')}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            {vax.administered_by && (
                                <p className="record-admin">{t('records.by', { name: vax.administered_by })}</p>
                            )}
                            {vax.next_due_date && (
                                <p className="record-next-due">
                                    {t('records.nextDue', { date: formatDate(vax.next_due_date) })}
                                </p>
                            )}
                            {vax.notes && <p className="record-notes">{vax.notes}</p>}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="records-empty">{t('records.noVaccinations')}</p>
            )}

            {isAdding ? (
                <form onSubmit={handleSubmit} className="record-form">
                    <div className="record-form-row">
                        <input
                            type="text"
                            placeholder={t('placeholder_vaccineName')}
                            value={formData.vaccine_name}
                            onChange={(e) => setFormData({ ...formData, vaccine_name: e.target.value })}
                            className="record-text-input"
                            autoFocus
                        />
                        <input
                            type="number"
                            min="1"
                            placeholder={t('placeholder_dose')}
                            value={formData.dose_number}
                            onChange={(e) => setFormData({ ...formData, dose_number: e.target.value })}
                            className="record-number-input dose"
                        />
                    </div>
                    <div className="record-form-row">
                        <label className="record-date-label">
                            {t('records.given')}
                            <input
                                type="date"
                                value={formData.given_date}
                                onChange={(e) => setFormData({ ...formData, given_date: e.target.value })}
                                className="record-date-input"
                            />
                        </label>
                        <label className="record-date-label">
                            {t('records.nextDueField')}
                            <input
                                type="date"
                                value={formData.next_due_date}
                                onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                                className="record-date-input"
                            />
                        </label>
                    </div>
                    <input
                        type="text"
                        placeholder={t('placeholder_administeredBy')}
                        value={formData.administered_by}
                        onChange={(e) => setFormData({ ...formData, administered_by: e.target.value })}
                        className="record-text-input"
                    />
                    <textarea
                        placeholder={t('placeholder_notes')}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="record-notes-input"
                        rows={2}
                    />
                    <div className="record-form-actions">
                        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                            {saving ? t('common:saving') : t('records.saveVaccination')}
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setIsAdding(false)}
                        >
                            {t('common:cancel')}
                        </button>
                    </div>
                </form>
            ) : (
                <button className="records-add-btn" onClick={() => setIsAdding(true)}>
                    <Plus size={16} />
                    {t('records.addVaccination')}
                </button>
            )}
        </div>
    );
}

// ============================================================================
// Medications Panel
// ============================================================================

function MedicationsPanel({ baby, medications, onDataChanged }: { baby: any; medications: any[]; onDataChanged?: () => void }) {
    const { t } = useTranslation('health');
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        medication_name: '',
        dosage: '',
        frequency: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        notes: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.medication_name.trim()) {
            toast.error(t('toast_pleaseEnterMedicationName'));
            return;
        }

        setSaving(true);
        try {
            const data = {
                baby_id: baby.id,
                medication_name: formData.medication_name.trim(),
                dosage: formData.dosage || null,
                frequency: formData.frequency || null,
                start_date: new Date(formData.start_date).toISOString(),
                end_date: formData.end_date
                    ? new Date(formData.end_date).toISOString()
                    : null,
                is_active: true,
                notes: formData.notes || null,
            };

            await api.createMedication(data);
            toast.success(t('toast_medicationAdded'));
            setFormData({
                medication_name: '',
                dosage: '',
                frequency: '',
                start_date: new Date().toISOString().split('T')[0],
                end_date: '',
                notes: '',
            });
            setIsAdding(false);
            if (onDataChanged) onDataChanged();
        } catch (error) {
            toast.error(t('failedToSave'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.deleteMedication(id);
            toast.success(t('toast_medicationDeleted'));
            if (onDataChanged) onDataChanged();
        } catch (error) {
            toast.error(t('failedToDelete'));
        }
    };

    const handleToggleActive = async (med: any) => {
        try {
            await api.updateMedication(med.id, { is_active: !med.is_active });
            toast.success(med.is_active ? t('records.medicationStopped') : t('records.medicationReactivated'));
            if (onDataChanged) onDataChanged();
        } catch (error) {
            toast.error(t('failedToSave'));
        }
    };

    const formatDate = (dateStr: string): string => {
        try {
            return format(parseISO(dateStr), 'MMM d');
        } catch {
            return dateStr;
        }
    };

    // Split into active and past
    const activeMeds = medications?.filter(m => m.is_active) || [];
    const pastMeds = medications?.filter(m => !m.is_active) || [];

    return (
        <div className="records-panel">
            {/* Active medications */}
            {activeMeds.length > 0 && (
                <div className="medications-active">
                    <h4 className="meds-section-title">{t('records.active')}</h4>
                    {activeMeds.map((med) => (
                        <div key={med.id} className="medication-item active">
                            <div className="medication-header">
                                <span className="medication-name">{med.medication_name}</span>
                                <button
                                    className="medication-toggle"
                                    onClick={() => handleToggleActive(med)}
                                    title={t('title_markAsStopped')}
                                >
                                    {t('records.stop')}
                                </button>
                                <button
                                    className="record-delete"
                                    onClick={() => handleDelete(med.id)}
                                    aria-label={t('arialabel_deleteMedication')}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            {(med.dosage || med.frequency) && (
                                <p className="medication-dosage">
                                    {med.dosage}{med.dosage && med.frequency && ' - '}{med.frequency}
                                </p>
                            )}
                            <p className="medication-dates">
                                {t('records.started', { date: formatDate(med.start_date) })}
                            </p>
                            {med.notes && <p className="medication-notes">{med.notes}</p>}
                        </div>
                    ))}
                </div>
            )}

            {/* Past medications */}
            {pastMeds.length > 0 && (
                <div className="medications-past">
                    <h4 className="meds-section-title">{t('records.past')}</h4>
                    {pastMeds.map((med) => (
                        <div key={med.id} className="medication-item past">
                            <div className="medication-header">
                                <span className="medication-name">{med.medication_name}</span>
                                <button
                                    className="medication-toggle"
                                    onClick={() => handleToggleActive(med)}
                                    title={t('title_reactivate')}
                                >
                                    {t('records.restart')}
                                </button>
                                <button
                                    className="record-delete"
                                    onClick={() => handleDelete(med.id)}
                                    aria-label={t('arialabel_deleteMedication')}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            {med.dosage && <p className="medication-dosage">{med.dosage}</p>}
                        </div>
                    ))}
                </div>
            )}

            {medications?.length === 0 && (
                <p className="records-empty">{t('records.noMedications')}</p>
            )}

            {isAdding ? (
                <form onSubmit={handleSubmit} className="record-form">
                    <input
                        type="text"
                        placeholder={t('placeholder_medicationName')}
                        value={formData.medication_name}
                        onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                        className="record-text-input"
                        autoFocus
                    />
                    <div className="record-form-row">
                        <input
                            type="text"
                            placeholder={t('placeholder_dosageEg25ml')}
                            value={formData.dosage}
                            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                            className="record-text-input"
                        />
                        <input
                            type="text"
                            placeholder={t('placeholder_frequencyEgTwiceDaily')}
                            value={formData.frequency}
                            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                            className="record-text-input"
                        />
                    </div>
                    <div className="record-form-row">
                        <label className="record-date-label">
                            {t('records.startField')}
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="record-date-input"
                            />
                        </label>
                        <label className="record-date-label">
                            {t('records.endField')}
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="record-date-input"
                            />
                        </label>
                    </div>
                    <textarea
                        placeholder={t('placeholder_notes')}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="record-notes-input"
                        rows={2}
                    />
                    <div className="record-form-actions">
                        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                            {saving ? t('common:saving') : t('records.addMed')}
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setIsAdding(false)}
                        >
                            {t('common:cancel')}
                        </button>
                    </div>
                </form>
            ) : (
                <button className="records-add-btn" onClick={() => setIsAdding(true)}>
                    <Plus size={16} />
                    {t('records.addMedication')}
                </button>
            )}
        </div>
    );
}
