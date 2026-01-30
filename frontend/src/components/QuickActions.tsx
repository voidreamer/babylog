/* eslint-disable @typescript-eslint/no-explicit-any */
import Icon from './Icon';

interface QuickActionsProps { onFeeding: () => void; onDiaper: () => void; onSleep: () => void; onPumping: () => void; }
export default function QuickActions({ onFeeding, onDiaper, onSleep, onPumping }: QuickActionsProps) {
    return (
        <div className="quick-actions">
            <button className="action-btn feeding" onClick={onFeeding}>
                <Icon name="feeding" size={36} />
                <span>Feeding</span>
            </button>

            <button className="action-btn diaper" onClick={onDiaper}>
                <Icon name="diaper" size={36} />
                <span>Diaper</span>
            </button>

            <button className="action-btn sleep" onClick={onSleep}>
                <Icon name="sleep" size={36} />
                <span>Sleep</span>
            </button>

            <button className="action-btn pumping" onClick={onPumping}>
                <Icon name="pumping" size={36} />
                <span>Pump</span>
            </button>
        </div>
    );
}
