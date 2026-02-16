/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import api from '../api/client';
import { useTranslation } from 'react-i18next';
import { X, Trash2 } from 'lucide-react';

interface CaregiverEntry { email: string; role: 'viewer' | 'caregiver'; }
interface CaregiverModalProps { baby: any; onClose: () => void; onShare: () => void; }

export default function CaregiverModal({ baby, onClose, onShare }: CaregiverModalProps) {
    const { t } = useTranslation('dashboard');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'viewer' | 'caregiver'>('caregiver');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        setError('');

        try {
            await api.shareBaby(baby.id, email.trim(), role);
            setEmail('');
            onShare();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (emailToRemove: string) => {
        try {
            await api.unshareBaby(baby.id, emailToRemove);
            onShare();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const handleToggleRole = async (entry: CaregiverEntry) => {
        const newRole = entry.role === 'caregiver' ? 'viewer' : 'caregiver';
        try {
            await api.updateCaregiverRole(baby.id, entry.email, newRole);
            onShare();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const caregivers: CaregiverEntry[] = baby.shared_with || [];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal caregiver-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{t('share.title', { name: baby.name })}</h2>
                    <button className="modal-close" onClick={onClose}><X size={20} /></button>
                </div>

                {/* Owner row */}
                {baby.owner_email && (
                    <div className="caregiver-card caregiver-card-owner">
                        <span className="caregiver-email">{baby.owner_email}</span>
                        <span className="caregiver-owner-badge">{t('share.owner')}</span>
                    </div>
                )}

                {/* Add form */}
                <form onSubmit={handleAdd} className="caregiver-add-form">
                    <div className="caregiver-add-row">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('share.emailPlaceholder')}
                            disabled={loading}
                            className="caregiver-email-input"
                        />
                        <button type="submit" className="btn btn-primary caregiver-add-btn" disabled={loading || !email.trim()}>
                            {loading ? '...' : t('share.add')}
                        </button>
                    </div>
                    <div className="caregiver-role-selector">
                        <button
                            type="button"
                            className={`caregiver-role-option ${role === 'caregiver' ? 'active' : ''}`}
                            onClick={() => setRole('caregiver')}
                        >
                            <span className="caregiver-role-option-label">{t('share.caregiver')}</span>
                            <span className="caregiver-role-option-desc">{t('share.caregiverDesc')}</span>
                        </button>
                        <button
                            type="button"
                            className={`caregiver-role-option ${role === 'viewer' ? 'active' : ''}`}
                            onClick={() => setRole('viewer')}
                        >
                            <span className="caregiver-role-option-label">{t('share.viewer')}</span>
                            <span className="caregiver-role-option-desc">{t('share.viewerDesc')}</span>
                        </button>
                    </div>
                    {error && <p className="caregiver-error">{error}</p>}
                </form>

                {/* Caregiver list */}
                {caregivers.length > 0 && (
                    <div className="caregiver-list">
                        {caregivers.map((entry) => (
                            <div key={entry.email} className="caregiver-card">
                                <div className="caregiver-card-info">
                                    <span className="caregiver-email">{entry.email}</span>
                                    <button
                                        className={`caregiver-role-badge ${entry.role}`}
                                        onClick={() => handleToggleRole(entry)}
                                        title={entry.role === 'caregiver' ? t('share.caregiverDesc') : t('share.viewerDesc')}
                                    >
                                        {entry.role === 'caregiver' ? t('share.caregiver') : t('share.viewer')}
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleRemove(entry.email)}
                                    className="caregiver-remove-btn"
                                    title={t('share.remove')}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {caregivers.length === 0 && (
                    <p className="caregiver-empty-hint">
                        {t('share.noCaregiversHint')}
                    </p>
                )}

                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        {t('share.done')}
                    </button>
                </div>
            </div>
        </div>
    );
}
