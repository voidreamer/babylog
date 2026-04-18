/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useBaby } from '../hooks/useBaby';
import { api } from '../api/client';
import { supabase } from '../lib/supabase';
import { pickPhoto, uploadProfilePhoto } from '../utils/photoUpload';
import BabyAvatar from './BabyAvatar';
import { formatAgeLabel } from '../utils/ageUtils';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface BabyProfileProps {
    onBack: () => void;
}

export default function BabyProfile({ onBack }: BabyProfileProps) {
    const { t } = useTranslation(['settings', 'common']);
    const { selectedBaby, refresh } = useBaby();

    const [bloodType, setBloodType] = useState('');
    const [birthplace, setBirthplace] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [birthWeight, setBirthWeight] = useState('');
    const [birthLength, setBirthLength] = useState('');
    const [birthGrowthId, setBirthGrowthId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const isOwner = selectedBaby?.is_owner !== false;
    const unitsSystem = localStorage.getItem('heybub-units') || 'metric';

    // Load initial data
    useEffect(() => {
        if (!selectedBaby) return;

        setBloodType(selectedBaby.blood_type || '');
        setBirthplace(selectedBaby.birthplace || '');
        setBirthTime(selectedBaby.birth_time || '');

        // Load birth measurements from first growth record
        api.getGrowthRecords(selectedBaby.id).then((records: any[]) => {
            const birthRecord = records?.find((r: any) => r.notes === 'Birth measurements');
            if (birthRecord) {
                setBirthGrowthId(birthRecord.id);
                if (birthRecord.weight_kg != null) {
                    setBirthWeight(
                        unitsSystem === 'imperial'
                            ? String(Math.round(birthRecord.weight_kg * 2.20462 * 100) / 100)
                            : String(birthRecord.weight_kg)
                    );
                }
                if (birthRecord.height_cm != null) {
                    setBirthLength(
                        unitsSystem === 'imperial'
                            ? String(Math.round(birthRecord.height_cm / 2.54 * 100) / 100)
                            : String(birthRecord.height_cm)
                    );
                }
            }
        }).catch(() => {});
    }, [selectedBaby?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!selectedBaby) return null;

    const handlePhotoTap = async () => {
        if (!isOwner) return;

        try {
            setUploading(true);
            const file = await pickPhoto();
            if (!file) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            await uploadProfilePhoto(file, selectedBaby.id, user.id);
            await refresh();
            toast.success(t('settings:babyProfile.photoUpdated'));
        } catch (err: any) {
            const msg = err?.message || JSON.stringify(err);
            console.error('Photo upload failed:', msg, err);
            toast.error(msg || t('settings:babyProfile.photoFailed'));
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Update baby fields
            await api.updateBaby(selectedBaby.id, {
                blood_type: bloodType || null,
                birthplace: birthplace || null,
                birth_time: birthTime || null,
            });

            // Handle birth weight/length via growth record
            const weightVal = birthWeight ? parseFloat(birthWeight) : null;
            const lengthVal = birthLength ? parseFloat(birthLength) : null;

            // Convert from imperial to metric for storage
            const weightKg = weightVal != null
                ? (unitsSystem === 'imperial' ? weightVal / 2.20462 : weightVal)
                : null;
            const heightCm = lengthVal != null
                ? (unitsSystem === 'imperial' ? lengthVal * 2.54 : lengthVal)
                : null;

            if (weightKg != null || heightCm != null) {
                if (birthGrowthId) {
                    await api.updateGrowthRecord(birthGrowthId, {
                        weight_kg: weightKg != null ? Math.round(weightKg * 100) / 100 : null,
                        height_cm: heightCm != null ? Math.round(heightCm * 100) / 100 : null,
                    });
                } else {
                    const record = await api.createGrowthRecord({
                        baby_id: selectedBaby.id,
                        recorded_date: selectedBaby.birth_date || new Date().toISOString(),
                        weight_kg: weightKg != null ? Math.round(weightKg * 100) / 100 : null,
                        height_cm: heightCm != null ? Math.round(heightCm * 100) / 100 : null,
                        notes: 'Birth measurements',
                    });
                    setBirthGrowthId(record.id);
                }
            }

            await refresh();
            toast.success(t('settings:babyProfile.saved'));
        } catch (err: any) {
            const msg = err?.message || JSON.stringify(err);
            console.error('Save failed:', msg, err);
            toast.error(msg || t('settings:babyProfile.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const getAge = () => formatAgeLabel(selectedBaby.birth_date, t) ?? '';

    const weightUnit = unitsSystem === 'imperial' ? t('settings:units.lbs') : t('settings:units.kg');
    const lengthUnit = unitsSystem === 'imperial' ? t('settings:units.in') : t('settings:units.cm');

    return (
        <div className="settings-page">
            {/* Header */}
            <div className="baby-profile-nav">
                <button className="baby-profile-back" onClick={onBack} aria-label="Back">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="settings-page-title">{t('settings:babyProfile.title')}</h2>
            </div>

            {/* Avatar + Name */}
            <div className="baby-profile-header">
                <div
                    className="baby-profile-avatar-wrap"
                    onClick={handlePhotoTap}
                    style={{ cursor: isOwner ? 'pointer' : 'default' }}
                >
                    <BabyAvatar
                        name={selectedBaby.name}
                        photoUrl={selectedBaby.profile_photo_url}
                        size={80}
                    />
                    {isOwner && (
                        <button
                            className="baby-profile-camera-btn"
                            aria-label={t('settings:babyProfile.changePhoto')}
                            disabled={uploading}
                        >
                            <Camera size={16} />
                        </button>
                    )}
                </div>
                <div className="baby-profile-name">{selectedBaby.name}</div>
                {getAge() && <div className="baby-profile-age">{getAge()}</div>}
                {!isOwner && (
                    <div className="baby-profile-readonly">{t('settings:babyProfile.readOnly')}</div>
                )}
            </div>

            {/* Birth Details */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:babyProfile.birthDetails')}</div>

                <div className="form-group">
                    <label className="form-label">{t('settings:babyProfile.bloodType')}</label>
                    <select
                        className="form-input"
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value)}
                        disabled={!isOwner}
                    >
                        <option value="">{t('settings:babyProfile.bloodTypePlaceholder')}</option>
                        {BLOOD_TYPES.map((bt) => (
                            <option key={bt} value={bt}>{bt}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">{t('settings:babyProfile.birthplace')}</label>
                    <input
                        type="text"
                        className="form-input"
                        value={birthplace}
                        onChange={(e) => setBirthplace(e.target.value)}
                        placeholder={t('settings:babyProfile.birthplacePlaceholder')}
                        disabled={!isOwner}
                        maxLength={200}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">{t('settings:babyProfile.birthTime')}</label>
                    <input
                        type="time"
                        className="form-input"
                        value={birthTime}
                        onChange={(e) => setBirthTime(e.target.value)}
                        disabled={!isOwner}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">{t('settings:babyProfile.birthWeight')} ({weightUnit})</label>
                    <input
                        type="number"
                        className="form-input"
                        value={birthWeight}
                        onChange={(e) => setBirthWeight(e.target.value)}
                        step="0.01"
                        min="0"
                        disabled={!isOwner}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">{t('settings:babyProfile.birthLength')} ({lengthUnit})</label>
                    <input
                        type="number"
                        className="form-input"
                        value={birthLength}
                        onChange={(e) => setBirthLength(e.target.value)}
                        step="0.1"
                        min="0"
                        disabled={!isOwner}
                    />
                </div>
            </div>

            {/* Save button */}
            {isOwner && (
                <button
                    className="btn btn-primary baby-profile-save"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? '...' : t('settings:babyProfile.saveChanges')}
                </button>
            )}
        </div>
    );
}
