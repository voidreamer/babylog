export default function QuickActions({ onFeeding, onDiaper, onSleep, onPumping }) {
    return (
        <div className="quick-actions">
            <button className="action-btn feeding" onClick={onFeeding}>
                <span className="icon">🍼</span>
                <span>Feeding</span>
            </button>

            <button className="action-btn diaper" onClick={onDiaper}>
                <span className="icon">🧷</span>
                <span>Diaper</span>
            </button>

            <button className="action-btn sleep" onClick={onSleep}>
                <span className="icon">😴</span>
                <span>Sleep</span>
            </button>

            <button className="action-btn pumping" onClick={onPumping}>
                <span className="icon">🍶</span>
                <span>Pump</span>
            </button>
        </div>
    );
}
