/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import api from '../api/client';

interface ShareModalProps { baby: any; onClose: () => void; onShare: () => void; }
export default function ShareModal({ baby, onClose, onShare }: ShareModalProps) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        setError('');

        try {
            await api.shareBaby(baby.id, email.trim());
            setEmail('');
            onShare();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleUnshare = async (emailToRemove: string) => {
        try {
            await api.unshareBaby(baby.id, emailToRemove);
            onShare();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const sharedEmails: string[] = baby.shared_with_emails || [];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Share {baby.name}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleShare}>
                    <div className="form-group">
                        <label>Add by email</label>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="partner@example.com"
                                disabled={loading}
                                style={{ flex: 1 }}
                            />
                            <button type="submit" className="btn btn-primary" disabled={loading || !email.trim()}>
                                {loading ? '...' : 'Share'}
                            </button>
                        </div>
                        {error && <p style={{ color: 'var(--error)', marginTop: 'var(--space-xs)' }}>{error}</p>}
                    </div>
                </form>

                {sharedEmails.length > 0 && (
                    <div className="form-group" style={{ marginTop: 'var(--space-lg)' }}>
                        <label>Shared with</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {sharedEmails.map((sharedEmail) => (
                                <div
                                    key={sharedEmail}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: 'var(--space-sm) var(--space-md)',
                                        background: 'var(--bg-primary)',
                                        borderRadius: 'var(--radius-sm)',
                                    }}
                                >
                                    <span>{sharedEmail}</span>
                                    <button
                                        onClick={() => handleUnshare(sharedEmail)}
                                        className="btn btn-secondary"
                                        style={{ padding: 'var(--space-xs) var(--space-sm)', fontSize: '0.875rem' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {sharedEmails.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-md)' }}>
                        Enter an email to share access to {baby.name} with another person.
                    </p>
                )}

                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
