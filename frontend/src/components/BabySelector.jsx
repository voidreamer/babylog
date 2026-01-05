import { useState } from 'react';
import { useBaby } from '../hooks/useBaby';
import { api } from '../api/client';
import ShareModal from './ShareModal';
import AddBabyForm from './AddBabyForm';
import { toast } from 'sonner';

export default function BabySelector() {
    const { babies, selectedBaby, selectBaby, refresh, removeBaby } = useBaby();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleAddBaby = async (formData) => {
        setSaving(true);
        try {
            // Create baby
            const baby = await api.createBaby({
                name: formData.name,
                birth_date: formData.birthDate ? new Date(formData.birthDate).toISOString() : null,
                gender: formData.gender,
            });

            // If birth weight or height provided, create initial growth record
            if ((formData.birthWeight || formData.birthHeight) && baby?.id) {
                try {
                    await api.createGrowthRecord({
                        baby_id: baby.id,
                        recorded_date: formData.birthDate
                            ? new Date(formData.birthDate).toISOString()
                            : new Date().toISOString(),
                        weight_kg: formData.birthWeight,
                        height_cm: formData.birthHeight,
                        notes: 'Birth measurements',
                    });
                } catch (err) {
                    console.error('Failed to save birth measurements:', err);
                }
            }

            await refresh();
            setShowAddForm(false);
            setShowDropdown(false);
            toast.success(`${formData.name} added!`);
        } catch (error) {
            console.error('Failed to add baby:', error);
            toast.error('Failed to add baby');
        } finally {
            setSaving(false);
        }
    };

    if (!selectedBaby && babies.length === 0) {
        return (
            <div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddForm(true)}
                >
                    + Add Baby
                </button>

                {showAddForm && (
                    <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">Add Your Baby</h2>
                                <button className="modal-close" onClick={() => setShowAddForm(false)}>×</button>
                            </div>
                            <div className="modal-body">
                                <AddBabyForm
                                    onSubmit={handleAddBaby}
                                    onCancel={() => setShowAddForm(false)}
                                    saving={saving}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const getInitial = (name) => name ? name.charAt(0).toUpperCase() : '?';

    return (
        <div style={{ position: 'relative' }}>
            <div
                className="baby-selector"
                onClick={() => setShowDropdown(!showDropdown)}
            >
                <div className="baby-avatar">
                    {selectedBaby ? getInitial(selectedBaby.name) : '?'}
                </div>
                <span className="baby-name">{selectedBaby?.name || 'Select Baby'}</span>
                <span style={{ marginLeft: 'auto' }}>▼</span>
            </div>

            {showDropdown && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: 'var(--space-sm)',
                        background: 'var(--surface)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-lg)',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                        zIndex: 50,
                    }}
                >
                    {babies.map((baby) => (
                        <div
                            key={baby.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)',
                                padding: 'var(--space-md)',
                                cursor: 'pointer',
                                background: baby.id === selectedBaby?.id ? 'var(--surface-hover)' : 'transparent',
                            }}
                            onClick={() => {
                                selectBaby(baby);
                                setShowDropdown(false);
                            }}
                        >
                            <div className="baby-avatar">{getInitial(baby.name)}</div>
                            <span>{baby.name}</span>
                            {!baby.is_owner && (
                                <span style={{
                                    fontSize: '0.75rem',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                }}>
                                    Shared
                                </span>
                            )}
                            {baby.id === selectedBaby?.id && <span style={{ marginLeft: 'auto' }}>✓</span>}
                        </div>
                    ))}

                    {selectedBaby?.is_owner && (
                        <div
                            style={{
                                padding: 'var(--space-md)',
                                borderTop: '1px solid var(--border)',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                            }}
                            onClick={() => {
                                setShowShareModal(true);
                                setShowDropdown(false);
                            }}
                        >
                            Share {selectedBaby?.name}
                        </div>
                    )}

                    {selectedBaby?.is_owner && (
                        <div
                            style={{
                                padding: 'var(--space-md)',
                                cursor: 'pointer',
                                color: 'var(--danger)',
                            }}
                            onClick={() => {
                                if (confirm(`Are you sure you want to delete ${selectedBaby.name}? This will remove all feeding, diaper, sleep, and health records. This cannot be undone.`)) {
                                    removeBaby(selectedBaby.id);
                                    setShowDropdown(false);
                                }
                            }}
                        >
                            Delete {selectedBaby?.name}
                        </div>
                    )}

                    <div
                        style={{
                            padding: 'var(--space-md)',
                            borderTop: '1px solid var(--border)',
                            cursor: 'pointer',
                            color: 'var(--primary)',
                            fontWeight: 500,
                        }}
                        onClick={() => {
                            setShowAddForm(true);
                            setShowDropdown(false);
                        }}
                    >
                        + Add Another Baby
                    </div>
                </div>
            )}

            {showAddForm && (
                <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add Baby</h2>
                            <button className="modal-close" onClick={() => setShowAddForm(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <AddBabyForm
                                onSubmit={handleAddBaby}
                                onCancel={() => setShowAddForm(false)}
                                saving={saving}
                            />
                        </div>
                    </div>
                </div>
            )}

            {showShareModal && selectedBaby && (
                <ShareModal
                    baby={selectedBaby}
                    onClose={() => setShowShareModal(false)}
                    onShare={() => refresh()}
                />
            )}
        </div>
    );
}
