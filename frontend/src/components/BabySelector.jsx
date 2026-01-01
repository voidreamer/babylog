import { useState } from 'react';
import { useBaby } from '../hooks/useBaby';
import ShareModal from './ShareModal';

export default function BabySelector() {
    const { babies, selectedBaby, selectBaby, addBaby, removeBaby, refresh } = useBaby();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [newBabyName, setNewBabyName] = useState('');
    const [newBabyDob, setNewBabyDob] = useState('');

    const handleAddBaby = async (e) => {
        e.preventDefault();
        if (!newBabyName.trim()) return;

        try {
            await addBaby({
                name: newBabyName.trim(),
                birth_date: newBabyDob ? new Date(newBabyDob).toISOString() : null,
            });
            setNewBabyName('');
            setNewBabyDob('');
            setShowAddForm(false);
            setShowDropdown(false);
        } catch (error) {
            console.error('Failed to add baby:', error);
            alert('Failed to add baby');
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
                                <h2 className="modal-title">👶 Add Your Baby</h2>
                                <button className="modal-close" onClick={() => setShowAddForm(false)}>×</button>
                            </div>

                            <form onSubmit={handleAddBaby}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Baby's Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Enter name..."
                                            value={newBabyName}
                                            onChange={(e) => setNewBabyName(e.target.value)}
                                            autoFocus
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Birth Date (optional)</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={newBabyDob}
                                            onChange={(e) => setNewBabyDob(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Add Baby
                                    </button>
                                </div>
                            </form>
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
                            🔗 Share {selectedBaby?.name}
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
                            🗑️ Delete {selectedBaby?.name}
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
                            <h2 className="modal-title">👶 Add Baby</h2>
                            <button className="modal-close" onClick={() => setShowAddForm(false)}>×</button>
                        </div>

                        <form onSubmit={handleAddBaby}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Baby's Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter name..."
                                        value={newBabyName}
                                        onChange={(e) => setNewBabyName(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Birth Date (optional)</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={newBabyDob}
                                        onChange={(e) => setNewBabyDob(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Add Baby
                                </button>
                            </div>
                        </form>
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
