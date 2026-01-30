import { useState } from 'react';
import { Lock } from 'lucide-react';
import { usePremium } from '../hooks/usePremium';
import UpgradeDialog from './UpgradeDialog';
import { useTranslation } from 'react-i18next';

interface PremiumGateProps {
  children: React.ReactNode;
  feature?: string;
}

export default function PremiumGate({ children, feature }: PremiumGateProps) {
    const { t } = useTranslation('settings');
  const { isPremium, isLoading } = usePremium();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (isLoading) return null;
  if (isPremium) return <>{children}</>;

  return (
    <>
      <div
        className="premium-gate"
        onClick={() => setShowUpgrade(true)}
        style={{
          position: 'relative',
          cursor: 'pointer',
          borderRadius: 'var(--radius-lg)',
          border: '2px dashed var(--border)',
          padding: 'var(--space-lg)',
          textAlign: 'center',
          background: 'var(--surface)',
        }}
      >
        <Lock size={24} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }} />
        <p style={{ fontWeight: 600, margin: 0 }}>Premium Feature</p>
        {feature && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Upgrade to unlock {feature}
          </p>
        )}
        <span
          className="settings-badge lavender"
          style={{ marginTop: 'var(--space-sm)', display: 'inline-block' }}
        >
          Upgrade
        </span>
      </div>
      {showUpgrade && <UpgradeDialog onClose={() => setShowUpgrade(false)} />}
    </>
  );
}
