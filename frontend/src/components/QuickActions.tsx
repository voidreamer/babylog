/* eslint-disable @typescript-eslint/no-explicit-any */
import Icon from './Icon';
import { useTranslation } from 'react-i18next';

interface QuickActionsProps { onFeeding: () => void; onDiaper: () => void; onSleep: () => void; onPumping: () => void; }
export default function QuickActions({ onFeeding, onDiaper, onSleep, onPumping }: QuickActionsProps) {
    const { t } = useTranslation('dashboard');
    return (
        <div className="quick-actions">
            <button className="action-btn feeding" onClick={onFeeding}>
                <Icon name="feeding" size={36} />
                <span>{t('quickActionsSection.feeding')}</span>
            </button>

            <button className="action-btn diaper" onClick={onDiaper}>
                <Icon name="diaper" size={36} />
                <span>{t('quickActionsSection.diaper')}</span>
            </button>

            <button className="action-btn sleep" onClick={onSleep}>
                <Icon name="sleep" size={36} />
                <span>{t('quickActionsSection.sleep')}</span>
            </button>

            <button className="action-btn pumping" onClick={onPumping}>
                <Icon name="pumping" size={36} />
                <span>{t('quickActionsSection.pump')}</span>
            </button>
        </div>
    );
}
