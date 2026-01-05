import { useState } from 'react';
import { useBaby } from '../hooks/useBaby';
import { api } from '../api/client';
import { Sparkles, ChevronDown, Plus, Share2, Trash2, Check } from 'lucide-react';
import ShareModal from './ShareModal';
import AddBabyForm from './AddBabyForm';
import { toast } from 'sonner';

// Get time-based greeting
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', icon: '☀️' };
    if (hour < 17) return { text: 'Good afternoon', icon: '🌤️' };
    return { text: 'Good evening', icon: '🌙' };
}

// Calculate age from birth date
function calculateAge(birthDate) {
    if (!birthDate) return null;

    const birth = new Date(birthDate);
    const now = new Date();
    const diffMs = now - birth;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return null;
    if (diffDays === 0) return 'Born today!';
    if (diffDays === 1) return '1 day old';
    if (diffDays < 7) return `${diffDays} days old`;

    const weeks = Math.floor(diffDays / 7);
    if (weeks < 12) return `${weeks} week${weeks > 1 ? 's' : ''} old`;

    const months = Math.floor(diffDays / 30.44);
    if (months < 24) return `${months} month${months > 1 ? 's' : ''} old`;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''} old`;
    return `${years}y ${remainingMonths}m old`;
}

// Get encouraging message based on daily stats
function getEncouragement(summary) {
    if (!summary) return "Let's track today's activities!";

    const total = (summary.total_feedings || 0) + (summary.total_diapers || 0) + (summary.sleep_count || 0);

    if (total === 0) return "Ready to log today's first event!";
    if (total <= 3) return "Great start to the day!";
    if (total <= 8) return "You're doing amazing!";
    return "Super parent! Keep it up!";
}

// Generate consistent pastel color from name
function getAvatarColor(name) {
    if (!name) return 'hsl(280, 70%, 70%)';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 75%)`;
}

export default function BabyGreeting({ summary }) {
    const { babies, selectedBaby, selectBaby, removeBaby, refresh } = useBaby();
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
            toast.success(`${formData.name} added!`);
        } catch (error) {
            console.error('Failed to add baby:', error);
            toast.error('Failed to add baby');
        } finally {
            setSaving(false);
        }
    };

    // Show add baby prompt if no babies
    if (!selectedBaby && babies.length === 0) {
        return (
            <div className="baby-greeting baby-greeting-empty">
                <div className="baby-greeting-header">
                    <span className="greeting-icon">👶</span>
                    <span className="greeting-text">Welcome!</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                    Add your first baby to get started
                </p>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddForm(true)}
                >
                    <Plus size={18} />
                    Add Baby
                </button>

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
            </div>
        );
    }

    if (!selectedBaby) return null;

    const greeting = getGreeting();
    const age = calculateAge(selectedBaby.birth_date);
    const encouragement = getEncouragement(summary);
    const avatarColor = getAvatarColor(selectedBaby.name);

    return (
        <>
            <div className="baby-greeting">
                <div className="baby-greeting-header">
                    <span className="greeting-icon">{greeting.icon}</span>
                    <span className="greeting-text">{greeting.text}!</span>
                </div>

                {/* Tappable baby selector */}
                <div
                    className="baby-greeting-content baby-greeting-selector"
                    onClick={() => setShowDropdown(!showDropdown)}
                >
                    <div
                        className="baby-greeting-avatar"
                        style={{ background: avatarColor }}
                    >
                        {selectedBaby.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="baby-greeting-info">
                        <div className="baby-greeting-name">
                            {selectedBaby.name}
                            <ChevronDown size={20} className="baby-greeting-chevron" />
                        </div>
                        {age && <div className="baby-greeting-age">{age}</div>}
                    </div>
                </div>

                {/* Dropdown menu */}
                {showDropdown && (
                    <div className="baby-dropdown">
                        {babies.map((baby) => (
                            <div
                                key={baby.id}
                                className={`baby-dropdown-item ${baby.id === selectedBaby?.id ? 'active' : ''}`}
                                onClick={() => {
                                    selectBaby(baby);
                                    setShowDropdown(false);
                                }}
                            >
                                <div
                                    className="baby-dropdown-avatar"
                                    style={{ background: getAvatarColor(baby.name) }}
                                >
                                    {baby.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="baby-dropdown-name">{baby.name}</span>
                                {!baby.is_owner && (
                                    <span className="baby-dropdown-shared">Shared</span>
                                )}
                                {baby.id === selectedBaby?.id && <Check size={16} />}
                            </div>
                        ))}

                        <div className="baby-dropdown-divider" />

                        {selectedBaby?.is_owner && (
                            <div
                                className="baby-dropdown-item"
                                onClick={() => {
                                    setShowShareModal(true);
                                    setShowDropdown(false);
                                }}
                            >
                                <Share2 size={16} />
                                <span>Share {selectedBaby.name}</span>
                            </div>
                        )}

                        <div
                            className="baby-dropdown-item"
                            onClick={() => {
                                setShowAddForm(true);
                                setShowDropdown(false);
                            }}
                        >
                            <Plus size={16} />
                            <span>Add Baby</span>
                        </div>

                        {selectedBaby?.is_owner && (
                            <div
                                className="baby-dropdown-item danger"
                                onClick={() => {
                                    if (confirm(`Delete ${selectedBaby.name}? This removes all data and cannot be undone.`)) {
                                        removeBaby(selectedBaby.id);
                                        setShowDropdown(false);
                                    }
                                }}
                            >
                                <Trash2 size={16} />
                                <span>Delete {selectedBaby.name}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="baby-greeting-encouragement">
                    <Sparkles size={14} />
                    <span>{encouragement}</span>
                </div>
            </div>

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
        </>
    );
}

export { getAvatarColor };
