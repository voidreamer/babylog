import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { ClipboardList, Syringe, Pill, Star, TrendingUp, Trash2, Ruler, Baby, BarChart2 } from 'lucide-react';
import GrowthChart from '../components/GrowthChart';

// Parse time from API (UTC) to local Date object
const parseUTCTime = (timeStr) => {
    if (!timeStr) return new Date();
    const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
    return new Date(utcTime);
};

const MILESTONE_OPTIONS = [
    'First smile', 'First laugh', 'Rolled over', 'Sat up independently',
    'First tooth', 'Started crawling', 'First steps', 'First word',
    'First solid food', 'Slept through the night', 'Waved goodbye',
    'Clapped hands', 'Other'
];

export default function Health() {
    const { selectedBaby } = useBaby();
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('visits');

    // Data
    const [visits, setVisits] = useState([]);
    const [vaccinations, setVaccinations] = useState([]);
    const [medications, setMedications] = useState([]);
    const [milestones, setMilestones] = useState([]);
    const [growth, setGrowth] = useState([]);

    // Modals
    const [showVisitModal, setShowVisitModal] = useState(false);
    const [showVaccModal, setShowVaccModal] = useState(false);
    const [showMedModal, setShowMedModal] = useState(false);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);
    const [showGrowthModal, setShowGrowthModal] = useState(false);

    const loadData = async () => {
        if (!selectedBaby) return;
        setLoading(true);
        try {
            const [v, va, m, mi, g] = await Promise.all([
                api.getDoctorVisits(selectedBaby.id),
                api.getVaccinations(selectedBaby.id),
                api.getMedications(selectedBaby.id),
                api.getMilestones(selectedBaby.id),
                api.getGrowthRecords(selectedBaby.id),
            ]);
            setVisits(v);
            setVaccinations(va);
            setMedications(m);
            setMilestones(mi);
            setGrowth(g);
        } catch (error) {
            // Silent fail
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedBaby]);

    if (!selectedBaby) {
        return (
            <div className="empty-state">
                <Baby size={48} style={{ opacity: 0.5, marginBottom: 'var(--space-md)' }} />
                <h2 className="empty-state-title">No baby selected</h2>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    const sections = [
        { id: 'visits', icon: ClipboardList, label: 'Visits', count: visits.length },
        { id: 'vaccinations', icon: Syringe, label: 'Vaccines', count: vaccinations.length },
        { id: 'medications', icon: Pill, label: 'Meds', count: medications.filter(m => m.is_active).length },
        { id: 'milestones', icon: Star, label: 'Milestones', count: milestones.length },
        { id: 'growth', icon: TrendingUp, label: 'Growth', count: growth.length },
    ];

    return (
        <div>
            {/* Section Tabs */}
            <div className="health-tabs">
                {sections.map(section => {
                    const IconComponent = section.icon;
                    return (
                        <button
                            key={section.id}
                            className={`health-tab ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            <IconComponent size={16} />
                            <span>{section.label}</span>
                            {section.count > 0 && (
                                <span className="health-tab-badge">{section.count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {activeSection === 'visits' && (
                <VisitsSection
                    visits={visits}
                    onAdd={() => setShowVisitModal(true)}
                    onRefresh={loadData}
                />
            )}
            {activeSection === 'vaccinations' && (
                <VaccinationsSection
                    vaccinations={vaccinations}
                    onAdd={() => setShowVaccModal(true)}
                    onRefresh={loadData}
                />
            )}
            {activeSection === 'medications' && (
                <MedicationsSection
                    medications={medications}
                    onAdd={() => setShowMedModal(true)}
                    onRefresh={loadData}
                />
            )}
            {activeSection === 'milestones' && (
                <MilestonesSection
                    milestones={milestones}
                    onAdd={() => setShowMilestoneModal(true)}
                    onRefresh={loadData}
                />
            )}
            {activeSection === 'growth' && (
                <GrowthSection
                    records={growth}
                    birthDate={selectedBaby?.birth_date}
                    gender={selectedBaby?.gender}
                    onAdd={() => setShowGrowthModal(true)}
                    onRefresh={loadData}
                />
            )}

            {/* Modals */}
            {showVisitModal && (
                <VisitModal
                    babyId={selectedBaby.id}
                    onClose={() => setShowVisitModal(false)}
                    onSave={() => { setShowVisitModal(false); loadData(); }}
                />
            )}
            {showVaccModal && (
                <VaccModal
                    babyId={selectedBaby.id}
                    onClose={() => setShowVaccModal(false)}
                    onSave={() => { setShowVaccModal(false); loadData(); }}
                />
            )}
            {showMedModal && (
                <MedModal
                    babyId={selectedBaby.id}
                    onClose={() => setShowMedModal(false)}
                    onSave={() => { setShowMedModal(false); loadData(); }}
                />
            )}
            {showMilestoneModal && (
                <MilestoneModal
                    babyId={selectedBaby.id}
                    onClose={() => setShowMilestoneModal(false)}
                    onSave={() => { setShowMilestoneModal(false); loadData(); }}
                />
            )}
            {showGrowthModal && (
                <GrowthModal
                    babyId={selectedBaby.id}
                    onClose={() => setShowGrowthModal(false)}
                    onSave={() => { setShowGrowthModal(false); loadData(); }}
                />
            )}
        </div>
    );
}

// ============================================================================
// Section Components
// ============================================================================

function VisitsSection({ visits, onAdd, onRefresh }) {
    const handleDelete = async (id) => {
        if (!confirm('Delete this visit?')) return;
        await api.deleteDoctorVisit(id);
        onRefresh();
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title"><ClipboardList size={18} style={{ marginRight: '6px' }} /> Doctor Visits</h3>
                <button className="btn btn-primary btn-sm" onClick={onAdd}>+ Add</button>
            </div>
            {visits.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                    <p className="empty-state-text">No doctor visits logged yet</p>
                </div>
            ) : (
                <div className="timeline">
                    {visits.map(visit => (
                        <div key={visit.id} className="timeline-item">
                            <div className="timeline-icon feeding"><ClipboardList size={16} /></div>
                            <div className="timeline-content">
                                <div className="timeline-title">
                                    {visit.visit_type?.charAt(0).toUpperCase() + visit.visit_type?.slice(1) || 'Visit'}
                                    {visit.doctor_name && ` - Dr. ${visit.doctor_name}`}
                                </div>
                                <div className="timeline-subtitle">
                                    {visit.weight_kg && `${visit.weight_kg}kg`}
                                    {visit.height_cm && ` • ${visit.height_cm}cm`}
                                    {visit.head_cm && ` • Head: ${visit.head_cm}cm`}
                                </div>
                                {visit.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{visit.notes}</div>}
                            </div>
                            <div className="timeline-time">
                                {format(parseUTCTime(visit.visit_date), 'MMM d, yyyy')}
                                <button className="btn-icon-delete" onClick={() => handleDelete(visit.id)}><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function VaccinationsSection({ vaccinations, onAdd, onRefresh }) {
    const handleDelete = async (id) => {
        if (!confirm('Delete this vaccination record?')) return;
        await api.deleteVaccination(id);
        onRefresh();
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title"><Syringe size={18} style={{ marginRight: '6px' }} /> Vaccinations</h3>
                <button className="btn btn-primary btn-sm" onClick={onAdd}>+ Add</button>
            </div>
            {vaccinations.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                    <p className="empty-state-text">No vaccinations logged yet</p>
                </div>
            ) : (
                <div className="timeline">
                    {vaccinations.map(vacc => (
                        <div key={vacc.id} className="timeline-item">
                            <div className="timeline-icon diaper"><Syringe size={16} /></div>
                            <div className="timeline-content">
                                <div className="timeline-title">
                                    {vacc.vaccine_name}
                                    {vacc.dose_number > 1 && ` (Dose ${vacc.dose_number})`}
                                </div>
                                <div className="timeline-subtitle">
                                    {vacc.administered_by && `By: ${vacc.administered_by}`}
                                    {vacc.next_due_date && ` • Next: ${format(parseUTCTime(vacc.next_due_date), 'MMM d, yyyy')}`}
                                </div>
                            </div>
                            <div className="timeline-time">
                                {format(parseUTCTime(vacc.given_date), 'MMM d, yyyy')}
                                <button className="btn-icon-delete" onClick={() => handleDelete(vacc.id)}><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function MedicationsSection({ medications, onAdd, onRefresh }) {
    const handleDelete = async (id) => {
        if (!confirm('Delete this medication?')) return;
        await api.deleteMedication(id);
        onRefresh();
    };

    const active = medications.filter(m => m.is_active);
    const past = medications.filter(m => !m.is_active);

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title"><Pill size={18} style={{ marginRight: '6px' }} /> Medications</h3>
                <button className="btn btn-primary btn-sm" onClick={onAdd}>+ Add</button>
            </div>
            {medications.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                    <p className="empty-state-text">No medications logged</p>
                </div>
            ) : (
                <>
                    {active.length > 0 && (
                        <>
                            <div style={{ padding: 'var(--space-sm) var(--space-md)', fontWeight: 'bold', color: 'var(--primary)' }}>Active</div>
                            <div className="timeline">
                                {active.map(med => (
                                    <div key={med.id} className="timeline-item">
                                        <div className="timeline-icon sleep"><Pill size={16} /></div>
                                        <div className="timeline-content">
                                            <div className="timeline-title">{med.medication_name}</div>
                                            <div className="timeline-subtitle">
                                                {med.dosage && `${med.dosage}`}
                                                {med.frequency && ` • ${med.frequency}`}
                                            </div>
                                        </div>
                                        <div className="timeline-time">
                                            Since {format(parseUTCTime(med.start_date), 'MMM d')}
                                            <button className="btn-icon-delete" onClick={() => handleDelete(med.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    {past.length > 0 && (
                        <>
                            <div style={{ padding: 'var(--space-sm) var(--space-md)', fontWeight: 'bold', color: 'var(--text-muted)' }}>Past</div>
                            <div className="timeline" style={{ opacity: 0.6 }}>
                                {past.map(med => (
                                    <div key={med.id} className="timeline-item">
                                        <div className="timeline-icon"><Pill size={16} /></div>
                                        <div className="timeline-content">
                                            <div className="timeline-title">{med.medication_name}</div>
                                        </div>
                                        <div className="timeline-time">
                                            <button className="btn-icon-delete" onClick={() => handleDelete(med.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}

function MilestonesSection({ milestones, onAdd, onRefresh }) {
    const handleDelete = async (id) => {
        if (!confirm('Delete this milestone?')) return;
        await api.deleteMilestone(id);
        onRefresh();
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title"><Star size={18} style={{ marginRight: '6px' }} /> Milestones</h3>
                <button className="btn btn-primary btn-sm" onClick={onAdd}>+ Add</button>
            </div>
            {milestones.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                    <p className="empty-state-text">No milestones recorded yet</p>
                </div>
            ) : (
                <div className="timeline">
                    {milestones.map(m => (
                        <div key={m.id} className="timeline-item">
                            <div className="timeline-icon pumping"><Star size={16} /></div>
                            <div className="timeline-content">
                                <div className="timeline-title">{m.milestone_type}</div>
                                {m.notes && <div className="timeline-subtitle">{m.notes}</div>}
                            </div>
                            <div className="timeline-time">
                                {format(parseUTCTime(m.achieved_date), 'MMM d, yyyy')}
                                <button className="btn-icon-delete" onClick={() => handleDelete(m.id)}><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function GrowthSection({ records, birthDate, gender, onAdd, onRefresh }) {
    const [showChart, setShowChart] = useState(false);
    const [chartMetric, setChartMetric] = useState('weight');

    const handleDelete = async (id) => {
        if (!confirm('Delete this record?')) return;
        await api.deleteGrowthRecord(id);
        onRefresh();
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title"><TrendingUp size={18} style={{ marginRight: '6px' }} /> Growth Records</h3>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button
                        className={`btn btn-sm ${showChart ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setShowChart(!showChart)}
                    >
                        <BarChart2 size={14} /> Chart
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={onAdd}>+ Add</button>
                </div>
            </div>

            {showChart && (
                <div className="growth-chart-section">
                    <div className="growth-chart-tabs">
                        <button
                            className={`growth-chart-tab ${chartMetric === 'weight' ? 'active' : ''}`}
                            onClick={() => setChartMetric('weight')}
                        >
                            Weight
                        </button>
                        <button
                            className={`growth-chart-tab ${chartMetric === 'height' ? 'active' : ''}`}
                            onClick={() => setChartMetric('height')}
                        >
                            Height
                        </button>
                    </div>
                    <GrowthChart
                        records={records}
                        birthDate={birthDate}
                        metric={chartMetric}
                        gender={gender}
                    />
                </div>
            )}

            {records.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                    <p className="empty-state-text">No growth records yet</p>
                </div>
            ) : (
                <div className="timeline">
                    {records.map(r => (
                        <div key={r.id} className="timeline-item">
                            <div className="timeline-icon feeding"><Ruler size={16} /></div>
                            <div className="timeline-content">
                                <div className="timeline-title">
                                    {r.weight_kg && `${r.weight_kg} kg`}
                                    {r.height_cm && ` • ${r.height_cm} cm`}
                                    {r.head_cm && ` • Head: ${r.head_cm} cm`}
                                </div>
                                {r.notes && <div className="timeline-subtitle">{r.notes}</div>}
                            </div>
                            <div className="timeline-time">
                                {format(parseUTCTime(r.recorded_date), 'MMM d, yyyy')}
                                <button className="btn-icon-delete" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Modal Components
// ============================================================================

function VisitModal({ babyId, onClose, onSave }) {
    const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
    const [visitType, setVisitType] = useState('checkup');
    const [doctorName, setDoctorName] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [head, setHead] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.createDoctorVisit({
                baby_id: babyId,
                visit_date: new Date(visitDate).toISOString(),
                visit_type: visitType,
                doctor_name: doctorName || null,
                weight_kg: weight ? parseFloat(weight) : null,
                height_cm: height ? parseFloat(height) : null,
                head_cm: head ? parseFloat(head) : null,
                notes: notes || null,
            });
            onSave();
        } catch (error) {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><ClipboardList size={20} style={{ marginRight: '8px' }} /> Log Doctor Visit</h2>
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
                            <input type="text" className="form-input" value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Optional" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Weight (kg)</label>
                                <input type="number" step="0.01" className="form-input" value={weight} onChange={e => setWeight(e.target.value)} placeholder="3.5" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Height (cm)</label>
                                <input type="number" step="0.1" className="form-input" value={height} onChange={e => setHeight(e.target.value)} placeholder="50" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Head (cm)</label>
                                <input type="number" step="0.1" className="form-input" value={head} onChange={e => setHead(e.target.value)} placeholder="35" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
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

function VaccModal({ babyId, onClose, onSave }) {
    const [vaccineName, setVaccineName] = useState('');
    const [doseNumber, setDoseNumber] = useState(1);
    const [givenDate, setGivenDate] = useState(new Date().toISOString().slice(0, 10));
    const [administeredBy, setAdministeredBy] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.createVaccination({
                baby_id: babyId,
                vaccine_name: vaccineName,
                dose_number: doseNumber,
                given_date: new Date(givenDate).toISOString(),
                administered_by: administeredBy || null,
                notes: notes || null,
            });
            onSave();
        } catch (error) {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Syringe size={20} style={{ marginRight: '8px' }} /> Log Vaccination</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Vaccine Name</label>
                            <input type="text" className="form-input" value={vaccineName} onChange={e => setVaccineName(e.target.value)} placeholder="e.g., DTaP, MMR" required />
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
                            <input type="text" className="form-input" value={administeredBy} onChange={e => setAdministeredBy(e.target.value)} placeholder="Doctor/Clinic name" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
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

function MedModal({ babyId, onClose, onSave }) {
    const [medicationName, setMedicationName] = useState('');
    const [dosage, setDosage] = useState('');
    const [frequency, setFrequency] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.createMedication({
                baby_id: babyId,
                medication_name: medicationName,
                dosage: dosage || null,
                frequency: frequency || null,
                start_date: new Date(startDate).toISOString(),
                is_active: true,
                notes: notes || null,
            });
            onSave();
        } catch (error) {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Pill size={20} style={{ marginRight: '8px' }} /> Add Medication</h2>
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
                                <input type="text" className="form-input" value={dosage} onChange={e => setDosage(e.target.value)} placeholder="e.g., 2.5ml" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Frequency</label>
                                <input type="text" className="form-input" value={frequency} onChange={e => setFrequency(e.target.value)} placeholder="e.g., Twice daily" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
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

function MilestoneModal({ babyId, onClose, onSave }) {
    const [milestoneType, setMilestoneType] = useState('');
    const [customType, setCustomType] = useState('');
    const [achievedDate, setAchievedDate] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.createMilestone({
                baby_id: babyId,
                milestone_type: milestoneType === 'Other' ? customType : milestoneType,
                achieved_date: new Date(achievedDate).toISOString(),
                notes: notes || null,
            });
            onSave();
        } catch (error) {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Star size={20} style={{ marginRight: '8px' }} /> Log Milestone</h2>
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
                            <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
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

function GrowthModal({ babyId, onClose, onSave }) {
    const [recordedDate, setRecordedDate] = useState(new Date().toISOString().slice(0, 10));
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [head, setHead] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.createGrowthRecord({
                baby_id: babyId,
                recorded_date: new Date(recordedDate).toISOString(),
                weight_kg: weight ? parseFloat(weight) : null,
                height_cm: height ? parseFloat(height) : null,
                head_cm: head ? parseFloat(head) : null,
                notes: notes || null,
            });
            onSave();
        } catch (error) {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><TrendingUp size={20} style={{ marginRight: '8px' }} /> Log Growth</h2>
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
                                <input type="number" step="0.01" className="form-input" value={weight} onChange={e => setWeight(e.target.value)} placeholder="3.5" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Height (cm)</label>
                                <input type="number" step="0.1" className="form-input" value={height} onChange={e => setHeight(e.target.value)} placeholder="50" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Head (cm)</label>
                                <input type="number" step="0.1" className="form-input" value={head} onChange={e => setHead(e.target.value)} placeholder="35" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
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
