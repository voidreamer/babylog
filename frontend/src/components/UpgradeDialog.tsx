import { useState } from 'react';
import { X, Check, Sparkles, Crown } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_MONTHLY || 'price_1Sv6BoFddQLEQqx0mPG0LweR';
const YEARLY_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_YEARLY || 'price_1Sv6BoFddQLEQqx0bOrKID81';

const FEATURE_KEYS = [
  'insights',
  'growth',
  'export',
  'share',
  'multiple',
  'support',
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content upgrade-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="upgrade-header">
          <div className="upgrade-header-left">
            <Crown size={24} className="icon-gold" />
            <h2>{t('upgrade.heyBubPremium')}</h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label={t('common:close')}><X size={20} /></button>
        </div>

        {/* Features */}
        <ul className="upgrade-features">
          {FEATURE_KEYS.map((key) => (
            <li key={key} className="upgrade-feature-item">
              <Check size={16} className="icon-green" />
              {t(`upgrade.premiumFeatures.${key}`)}
            </li>
          ))}
        </ul>

        {/* Pricing cards */}
        <div className="pricing-cards">
          {/* Monthly */}
          <button
            className="pricing-card pricing-card-monthly"
            onClick={() => handleCheckout(MONTHLY_PRICE_ID)}
            disabled={!!loading}
          >
            <span className="promo-badge">{t('upgrade.limitedTime')}</span>
            <div className="price-original">$4.99/mo</div>
            <div className="price-main">$2.49</div>
            <div className="price-period">{t('upgrade.perMonth')}</div>
          </button>

          {/* Yearly */}
          <button
            className="pricing-card pricing-card-yearly"
            onClick={() => handleCheckout(YEARLY_PRICE_ID)}
            disabled={!!loading}
          >
            <span className="promo-badge">{t('upgrade.limitedTime')}</span>
            <span className="best-value-badge">{t('upgrade.bestValue')}</span>
            <div className="price-original">$29.99/yr</div>
            <div className="price-main">$14.99</div>
            <div className="price-period">{t('upgrade.perYear')}</div>
            <div className="price-equivalent">Just $1.25/mo</div>
          </button>
        </div>

        {/* CTA */}
        <button
          className="btn btn-primary btn-cta"
          onClick={() => handleCheckout(YEARLY_PRICE_ID)}
          disabled={!!loading}
        >
          <Sparkles size={16} />
          {loading ? t('upgrade.redirecting') : t('upgrade.startTrial')}
        </button>

        {/* Footer */}
        <div className="upgrade-footer">
          {t('upgrade.cancelAnytime')} ·{' '}
          <button
            onClick={handleRestore}
            className="btn-text-link"
          >
            {t('upgrade.restorePurchase')}
          </button>
        </div>
      </div>
    </div>
  );
}
