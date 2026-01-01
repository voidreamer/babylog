import Icon from './Icon';

export default function Widget({ type, label, value, detail, isSleeping, onClick }) {
    return (
        <div
            className={`widget ${type} ${isSleeping ? 'sleeping' : ''}`}
            onClick={onClick}
        >
            {/* Large semi-transparent background icon */}
            <div className="widget-bg-icon">
                <Icon name={type} size={80} />
            </div>
            <div className="widget-content">
                <div className="widget-label">{label}</div>
                <div className="widget-value">{value}</div>
                {detail && <div className="widget-detail">{detail}</div>}
            </div>
        </div>
    );
}
