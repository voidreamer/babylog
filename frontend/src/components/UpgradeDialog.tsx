import { useState } from 'react';
import { X, Check, Sparkles, Crown } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_MONTHLY || 'price_1Sv6BoFddQLEQqx0mPG0LweR';
const YEARLY_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_YEARLY || 'price_1Sv6BoFddQLEQqx0bOrKID81';

const FEATURES = [
  'AI-powered baby insights & predictions',
  'Growth charts with WHO percentiles',
  'Export all your data (CSV)',
  'Share with unlimited caregivers',
  'Track multiple babies',
  'Priority support',
];

interface UpgradeDialogProps {
  onClose: () => void;
}

export default function UpgradeDialog({ onClose }: UpgradeDialogProps) {
    const { t } = useTranslation('settings');
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (priceId: string) => {
    setLoading(priceId);
    try {
      const origin = window.location.origin;
      const result = await api.createCheckoutSession(
        priceId,
        `${origin}/?premium=success`,
        `${origin}/?premium=cancel`,
      );
      window.location.href = result.checkout_url;
    } catch {
      toast.error(t('toast_couldNotStartCheckoutPleaseTryAgai'));
      setLoading(null);
    }
  };

  const handleRestore = async () => {
    try {
      const res = await api.getBillingSubscription();
      if (res.is_premium) {
        localStorage.setItem('isPremium', 'true');
        toast.success(t('toast_premiumRestoredReloading'));
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.info(t('toast_noActiveSubscriptionFoundForThisAc'));
      }
    } catch {
      toast.error(t('toast_couldNotCheckSubscription'));
    }
  };

  const promoBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: '#fff',
    fontSize: '0.58rem',
    fontWeight: 800,
    padding: '2px 7px',
    borderRadius: 8,
    whiteSpace: 'nowrap',
    letterSpacing: '0.03em',
    boxShadow: '0 2px 6px rgba(239,68,68,0.35)',
  };

  const cardBase: React.CSSProperties = {
    flex: 1,
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-md)',
    background: 'var(--surface)',
    cursor: loading ? 'wait' : 'pointer',
    textAlign: 'center',
    position: 'relative',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 420, padding: 'var(--space-xl)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Crown size={24} style={{ color: '#f59e0b' }} />
            <h2 style={{ margin: 0 }}>{t('upgrade.heyBubPremium')}</h2>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Features */}
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--space-lg)' }}>
          {FEATURES.map((f) => (
            <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: '0.9rem' }}>
              <Check size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
              {f}
            </li>
          ))}
        </ul>

        {/* Pricing cards */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          {/* Monthly */}
          <button
            onClick={() => handleCheckout(MONTHLY_PRICE_ID)}
            disabled={!!loading}
            style={{ ...cardBase, border: '2px solid var(--border)' }}
          >
            <span style={promoBadgeStyle}>LIMITED TIME · 50% OFF</span>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'line-through', marginTop: 4 }}>
              $4.99/mo
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>$2.49</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>per month</div>
          </button>

          {/* Yearly */}
          <button
            onClick={() => handleCheckout(YEARLY_PRICE_ID)}
            disabled={!!loading}
            style={{ ...cardBase, border: '2px solid #f59e0b' }}
          >
            <span style={promoBadgeStyle}>LIMITED TIME · 50% OFF</span>
            <span
              style={{
                position: 'absolute',
                top: -10,
                right: -6,
                background: '#f59e0b',
                color: '#fff',
                fontSize: '0.58rem',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: 8,
              }}
            >
              BEST VALUE
            </span>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'line-through', marginTop: 4 }}>
              $29.99/yr
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>$14.99</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>per year</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Just $1.25/mo
            </div>
          </button>
        </div>

        {/* CTA */}
        <button
          className="btn btn-primary"
          onClick={() => handleCheckout(YEARLY_PRICE_ID)}
          disabled={!!loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Sparkles size={16} />
          {loading ? t('upgrade.redirecting') : t('upgrade.startTrial')}
        </button>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-md)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Cancel anytime · No commitment ·{' '}
          <button
            onClick={handleRestore}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline', padding: 0 }}
          >
            {t('upgrade.restorePurchase')}
          </button>
        </div>
      </div>
    </div>
  );
}
