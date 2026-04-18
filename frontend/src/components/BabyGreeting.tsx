/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useBaby } from '../hooks/useBaby';
import { api } from '../api/client';
import { Sparkles, ChevronDown, Plus, Share2, Trash2, Check, Pencil, Sun, CloudSun, Moon, Baby } from 'lucide-react';
import CaregiverModal from './CaregiverModal';
import AddBabyForm from './AddBabyForm';
import BabyAvatar, { getAvatarColor } from './BabyAvatar';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { formatAgeLabel } from '../utils/ageUtils';


// Get time-based greeting
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'goodMorning', icon: 'sun' };
    if (hour < 17) return { text: 'goodAfternoon', icon: 'cloud-sun' };
    return { text: 'goodEvening', icon: 'moon' };
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
interface BabyGreetingProps { summary: any; latestGrowth: any; }
export default function BabyGreeting({ summary }: BabyGreetingProps) {
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
                    <span className="greeting-icon"><Baby size={20} /></span>
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
                        <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
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
    const ageLabel = formatAgeLabel(selectedBaby.birth_date, t);
    const encouragement = getEncouragement(summary);
    const avatarColor = getAvatarColor(selectedBaby.name);

    return (
        <>
            <div className="baby-greeting">
                <div className="baby-greeting-header">
                    <span className="greeting-icon">
                        {greeting.icon === 'sun' && <Sun size={20} />}
                        {greeting.icon === 'cloud-sun' && <CloudSun size={20} />}
                        {greeting.icon === 'moon' && <Moon size={20} />}
                    </span>
                    <span className="greeting-text">{t(`greeting.${greeting.text}`)}!</span>
                </div>

                {/* Tappable baby selector */}
                <div
                    className="baby-greeting-content baby-greeting-selector"
                    onClick={() => setShowDropdown(!showDropdown)}
                >
                    <BabyAvatar
                        name={selectedBaby.name}
                        photoUrl={selectedBaby.profile_photo_url}
                        size={36}
                        className="baby-greeting-avatar"
                    />

                    <div className="baby-greeting-info">
                        <div className="baby-greeting-name">
                            {selectedBaby.name}
                            <ChevronDown size={20} className="baby-greeting-chevron" />
                        </div>
                        {ageLabel && <div className="baby-greeting-age">{ageLabel}</div>}
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
                                <BabyAvatar
                                    name={baby.name}
                                    photoUrl={baby.profile_photo_url}
                                    size={28}
                                    className="baby-dropdown-avatar"
                                />
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

            </div>

            {showAddForm && (
                <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
                    <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
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
                    <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
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
                <CaregiverModal
                    baby={selectedBaby}
                    onClose={() => setShowShareModal(false)}
                    onShare={() => refresh()}
                />
            )}
        </>
    );
}

