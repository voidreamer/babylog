export default function Widget({ type, icon, label, value, detail, isSleeping, onClick }) {
    return (
        <div
            className={`widget ${type} ${isSleeping ? 'sleeping' : ''}`}
            onClick={onClick}
        >
            <div className="widget-icon">{icon}</div>
            <div className="widget-label">{label}</div>
            <div className="widget-value">{value}</div>
            {detail && <div className="widget-detail">{detail}</div>}
        </div>
    );
}
