import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClipboardList, Syringe, Pill, Star, TrendingUp, Trash2, Ruler, Baby, BarChart2, Pencil, X, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GrowthChart from '../components/GrowthChart';
import { VisitModal, VaccModal, MedModal, MilestoneModal, GrowthModal } from '../components/health/HealthModals';

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

    // Editing states
    const [editingVisit, setEditingVisit] = useState(null);
    const [editingVacc, setEditingVacc] = useState(null);
    const [editingMed, setEditingMed] = useState(null);
    const [editingMilestone, setEditingMilestone] = useState(null);
    const [editingGrowth, setEditingGrowth] = useState(null);

    // Confirm delete modal
    const [confirmDelete, setConfirmDelete] = useState(null);

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
            toast.error('Failed to load health data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedBaby]);

    // Handle confirm delete
    const handleDeleteConfirm = async () => {
        if (!confirmDelete) return;
        const { type, id, label } = confirmDelete;

        try {
            switch (type) {
                case 'visit':
                    await api.deleteDoctorVisit(id);
                    break;
                case 'vaccination':
                    await api.deleteVaccination(id);
                    break;
                case 'medication':
                    await api.deleteMedication(id);
                    break;
                case 'milestone':
                    await api.deleteMilestone(id);
                    break;
                case 'growth':
                    await api.deleteGrowthRecord(id);
                    break;
            }
            toast.success(`${label} deleted`);
            loadData();
        } catch (error) {
            toast.error(`Failed to delete ${label.toLowerCase()}`);
        }
        setConfirmDelete(null);
    };

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
                    onEdit={(visit) => { setEditingVisit(visit); setShowVisitModal(true); }}
                    onDelete={(visit) => setConfirmDelete({ type: 'visit', id: visit.id, label: 'Doctor visit' })}
                />
            )}
            {activeSection === 'vaccinations' && (
                <VaccinationsSection
                    vaccinations={vaccinations}
                    onAdd={() => setShowVaccModal(true)}
                    onEdit={(vacc) => { setEditingVacc(vacc); setShowVaccModal(true); }}
                    onDelete={(vacc) => setConfirmDelete({ type: 'vaccination', id: vacc.id, label: 'Vaccination' })}
                />
            )}
            {activeSection === 'medications' && (
                <MedicationsSection
                    medications={medications}
                    onAdd={() => setShowMedModal(true)}
                    onEdit={(med) => { setEditingMed(med); setShowMedModal(true); }}
                    onDelete={(med) => setConfirmDelete({ type: 'medication', id: med.id, label: 'Medication' })}
                    onToggle={async (med) => {
                        try {
                            await api.toggleMedicationActive(med.id);
                            toast.success(med.is_active ? 'Medication stopped' : 'Medication resumed');
                            loadData();
                        } catch (error) {
                            toast.error('Failed to update medication');
                        }
                    }}
                />
            )}
            {activeSection === 'milestones' && (
                <MilestonesSection
                    milestones={milestones}
                    onAdd={() => setShowMilestoneModal(true)}
                    onEdit={(m) => { setEditingMilestone(m); setShowMilestoneModal(true); }}
                    onDelete={(m) => setConfirmDelete({ type: 'milestone', id: m.id, label: 'Milestone' })}
                />
            )}
            {activeSection === 'growth' && (
                <GrowthSection
                    records={growth}
                    birthDate={selectedBaby?.birth_date}
                    gender={selectedBaby?.gender}
                    onAdd={() => setShowGrowthModal(true)}
                    onEdit={(r) => { setEditingGrowth(r); setShowGrowthModal(true); }}
                    onDelete={(r) => setConfirmDelete({ type: 'growth', id: r.id, label: 'Growth record' })}
                />
            )}

            {/* Modals */}
            {showVisitModal && (
                <VisitModal
                    babyId={selectedBaby.id}
                    editData={editingVisit}
                    onClose={() => { setShowVisitModal(false); setEditingVisit(null); }}
                    onSave={() => { setShowVisitModal(false); setEditingVisit(null); loadData(); }}
                />
            )}
            {showVaccModal && (
                <VaccModal
                    babyId={selectedBaby.id}
                    editData={editingVacc}
                    onClose={() => { setShowVaccModal(false); setEditingVacc(null); }}
                    onSave={() => { setShowVaccModal(false); setEditingVacc(null); loadData(); }}
                />
            )}
            {showMedModal && (
                <MedModal
                    babyId={selectedBaby.id}
                    editData={editingMed}
                    onClose={() => { setShowMedModal(false); setEditingMed(null); }}
                    onSave={() => { setShowMedModal(false); setEditingMed(null); loadData(); }}
                />
            )}
            {showMilestoneModal && (
                <MilestoneModal
                    babyId={selectedBaby.id}
                    editData={editingMilestone}
                    onClose={() => { setShowMilestoneModal(false); setEditingMilestone(null); }}
                    onSave={() => { setShowMilestoneModal(false); setEditingMilestone(null); loadData(); }}
                />
            )}
            {showGrowthModal && (
                <GrowthModal
                    babyId={selectedBaby.id}
                    editData={editingGrowth}
                    onClose={() => { setShowGrowthModal(false); setEditingGrowth(null); }}
                    onSave={() => { setShowGrowthModal(false); setEditingGrowth(null); loadData(); }}
                />
            )}

            {/* Confirm Delete Modal */}
            <AnimatePresence>
                {confirmDelete && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setConfirmDelete(null)}
                    >
                        <motion.div
                            className="confirm-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="modal-close" onClick={() => setConfirmDelete(null)}>
                                <X size={20} />
                            </button>
                            <div className="confirm-modal-content">
                                <Trash2 size={32} className="confirm-icon" />
                                <h3>Delete {confirmDelete.label}?</h3>
                                <p>This action cannot be undone.</p>
                                <div className="confirm-modal-actions">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setConfirmDelete(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={handleDeleteConfirm}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// Section Components
// ============================================================================

function VisitsSection({ visits, onAdd, onEdit, onDelete }) {
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
                            <div className="timeline-icon health-visit"><ClipboardList size={16} /></div>
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
                                <div className="timeline-actions">
                                    <button className="btn-icon-edit" onClick={() => onEdit(visit)}><Pencil size={14} /></button>
                                    <button className="btn-icon-delete" onClick={() => onDelete(visit)}><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function VaccinationsSection({ vaccinations, onAdd, onEdit, onDelete }) {
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
                            <div className="timeline-icon health-vaccine"><Syringe size={16} /></div>
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
                                <div className="timeline-actions">
                                    <button className="btn-icon-edit" onClick={() => onEdit(vacc)}><Pencil size={14} /></button>
                                    <button className="btn-icon-delete" onClick={() => onDelete(vacc)}><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function MedicationsSection({ medications, onAdd, onEdit, onDelete, onToggle }) {
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
                                        <div className="timeline-icon health-med"><Pill size={16} /></div>
                                        <div className="timeline-content">
                                            <div className="timeline-title">{med.medication_name}</div>
                                            <div className="timeline-subtitle">
                                                {med.dosage && `${med.dosage}`}
                                                {med.frequency && ` • ${med.frequency}`}
                                            </div>
                                        </div>
                                        <div className="timeline-time">
                                            Since {format(parseUTCTime(med.start_date), 'MMM d')}
                                            <div className="timeline-actions">
                                                <button className="btn-icon-toggle active" onClick={() => onToggle(med)} title="Stop medication"><Power size={14} /></button>
                                                <button className="btn-icon-edit" onClick={() => onEdit(med)}><Pencil size={14} /></button>
                                                <button className="btn-icon-delete" onClick={() => onDelete(med)}><Trash2 size={14} /></button>
                                            </div>
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
                                            <div className="timeline-subtitle">
                                                {med.dosage && `${med.dosage}`}
                                                {med.frequency && ` • ${med.frequency}`}
                                            </div>
                                        </div>
                                        <div className="timeline-time">
                                            <div className="timeline-actions">
                                                <button className="btn-icon-toggle" onClick={() => onToggle(med)} title="Resume medication"><Power size={14} /></button>
                                                <button className="btn-icon-delete" onClick={() => onDelete(med)}><Trash2 size={14} /></button>
                                            </div>
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

function MilestonesSection({ milestones, onAdd, onEdit, onDelete }) {
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
                            <div className="timeline-icon health-milestone"><Star size={16} /></div>
                            <div className="timeline-content">
                                <div className="timeline-title">{m.milestone_type}</div>
                                {m.notes && <div className="timeline-subtitle">{m.notes}</div>}
                            </div>
                            <div className="timeline-time">
                                {format(parseUTCTime(m.achieved_date), 'MMM d, yyyy')}
                                <div className="timeline-actions">
                                    <button className="btn-icon-edit" onClick={() => onEdit(m)}><Pencil size={14} /></button>
                                    <button className="btn-icon-delete" onClick={() => onDelete(m)}><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function GrowthSection({ records, birthDate, gender, onAdd, onEdit, onDelete }) {
    const [showChart, setShowChart] = useState(false);
    const [chartMetric, setChartMetric] = useState('weight');

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
                            <div className="timeline-icon health-growth"><Ruler size={16} /></div>
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
                                <div className="timeline-actions">
                                    <button className="btn-icon-edit" onClick={() => onEdit(r)}><Pencil size={14} /></button>
                                    <button className="btn-icon-delete" onClick={() => onDelete(r)}><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

