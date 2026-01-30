/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useBaby } from '../hooks/useBaby';
import { api } from '../api/client';
import { Sparkles, ChevronDown, Plus, Share2, Trash2, Check, Pencil } from 'lucide-react';
import ShareModal from './ShareModal';
import AddBabyForm from './AddBabyForm';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// Get time-based greeting
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'goodMorning', icon: '☀️' };
    if (hour < 17) return { text: 'goodAfternoon', icon: '🌤️' };
    return { text: 'goodEvening', icon: '🌙' };
}

// Calculate age from birth date
function calculateAge(birthDate: string | null): string | null {
    if (!birthDate) return null;

    const birth = new Date(birthDate);
    const now = new Date();
    const diffMs = now.getTime() - birth.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return null;
    if (diffDays === 0) return null; // handled by t()
    if (diffDays === 1) return null;
    if (diffDays < 7) return null;

    const weeks = Math.floor(diffDays / 7);
    if (weeks < 12) return null;

    const months = Math.floor(diffDays / 30.44);
    if (months < 24) return null;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return null;
    return null;
}

// Get encouraging message based on daily stats
function getEncouragement(summary: any): string {
    if (!summary) return 'letsTrack';

    const total = (summary.total_feedings || 0) + (summary.total_diapers || 0) + (summary.sleep_count || 0);

    if (total === 0) return 'readyToLog';
    if (total <= 3) return 'greatStart';
    if (total <= 8) return 'doingAmazing';
    return 'superParent';
}

// Generate consistent pastel color from name
function getAvatarColor(name: string | null): string {
    if (!name) return 'hsl(280, 70%, 70%)';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 75%)`;
}

interface BabyGreetingProps { summary: any; latestGrowth: any; }
export default function BabyGreeting({ summary, latestGrowth }: BabyGreetingProps) {
    const { t } = useTranslation('dashboard');
    const { babies, selectedBaby, selectBaby, removeBaby, refresh } = useBaby();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleAddBaby = async (formData: any) => {
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
            toast.success(t('greeting.babyAdded', { name: formData.name }));
        } catch (error) {
            console.error('Failed to add baby:', error);
            toast.error(t('toast_failedToAddBaby'));
        } finally {
            setSaving(false);
        }
    };

    const handleEditBaby = async (formData: any) => {
        if (!selectedBaby) return;
        setSaving(true);
        try {
            await api.updateBaby(selectedBaby.id, {
                name: formData.name,
                birth_date: formData.birthDate ? new Date(formData.birthDate).toISOString() : null,
                gender: formData.gender,
            });

            await refresh();
            setShowEditForm(false);
            toast.success(t('greeting.babyUpdated', { name: formData.name }));
        } catch (error) {
            console.error('Failed to update baby:', error);
            toast.error(t('toast_failedToUpdateBaby'));
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
                    <span className="greeting-text">{t('greeting.welcome')}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                    {t('greeting.addFirstBaby')}
                </p>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddForm(true)}
                >
                    <Plus size={18} />
                    {t('greeting.addBaby')}
                </button>

                {showAddForm && (
                    <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">{t('greeting.addBaby')}</h2>
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
                    <span className="greeting-text">{t(`greeting.${greeting.text}`)}!</span>
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
                        {selectedBaby?.birth_date && <div className="baby-greeting-age">{(() => { const birth = new Date(selectedBaby.birth_date); const now = new Date(); const diffMs = now.getTime() - birth.getTime(); const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)); if (diffDays < 0) return null; if (diffDays === 0) return t('age.bornToday'); if (diffDays === 1) return t('age.daysOld', { count: 1 }); if (diffDays < 7) return t('age.daysOld_plural', { count: diffDays }); const weeks = Math.floor(diffDays / 7); if (weeks < 12) return weeks > 1 ? t('age.weeksOld_plural', { count: weeks }) : t('age.weeksOld', { count: weeks }); const months = Math.floor(diffDays / 30.44); if (months < 24) return months > 1 ? t('age.monthsOld_plural', { count: months }) : t('age.monthsOld', { count: months }); const years = Math.floor(months / 12); const rm = months % 12; if (rm === 0) return years > 1 ? t('age.yearsOld_plural', { count: years }) : t('age.yearsOld', { count: years }); return t('age.yearsMonthsOld', { years, months: rm }); })()}</div>}
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
                                    <span className="baby-dropdown-shared">{t('greeting.shared')}</span>
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
                                <span>{t('greeting.shareName', { name: selectedBaby.name })}</span>
                            </div>
                        )}

                        {selectedBaby?.is_owner && (
                            <div
                                className="baby-dropdown-item"
                                onClick={() => {
                                    setShowEditForm(true);
                                    setShowDropdown(false);
                                }}
                            >
                                <Pencil size={16} />
                                <span>{t('greeting.editName', { name: selectedBaby.name })}</span>
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
                            <span>{t('greeting.addBaby')}</span>
                        </div>

                        {selectedBaby?.is_owner && (
                            <div
                                className="baby-dropdown-item danger"
                                onClick={() => {
                                    if (confirm(t('greeting.deleteConfirm', { name: selectedBaby.name }))) {
                                        removeBaby(selectedBaby.id);
                                        setShowDropdown(false);
                                    }
                                }}
                            >
                                <Trash2 size={16} />
                                <span>{t('greeting.deleteName', { name: selectedBaby.name })}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="baby-greeting-encouragement">
                    <Sparkles size={14} />
                    <span>{t(`encouragement.${encouragement}`)}</span>
                </div>

                {latestGrowth && (latestGrowth.weight_kg || latestGrowth.height_cm || latestGrowth.head_cm) && (
                    <div className="baby-greeting-stats">
                        {latestGrowth.weight_kg && (
                            <div className="baby-stat-pill">
                                <span className="baby-stat-value">{latestGrowth.weight_kg}</span>
                                <span className="baby-stat-unit">kg</span>
                            </div>
                        )}
                        {latestGrowth.height_cm && (
                            <div className="baby-stat-pill">
                                <span className="baby-stat-value">{latestGrowth.height_cm}</span>
                                <span className="baby-stat-unit">cm</span>
                            </div>
                        )}
                        {latestGrowth.head_cm && (
                            <div className="baby-stat-pill">
                                <span className="baby-stat-value">{latestGrowth.head_cm}</span>
                                <span className="baby-stat-unit">{t('health:growth.head').toLowerCase()}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showAddForm && (
                <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{t('greeting.addBaby')}</h2>
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

            {showEditForm && selectedBaby && (
                <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{t('greeting.editBaby', { name: selectedBaby.name })}</h2>
                            <button className="modal-close" onClick={() => setShowEditForm(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <AddBabyForm
                                onSubmit={handleEditBaby}
                                onCancel={() => setShowEditForm(false)}
                                saving={saving}
                                submitLabel={t('submitLabel_saveChanges')}
                                initialData={selectedBaby}
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
