export default function DailySummary({ summary }) {
    if (!summary) return null;

    const formatTime = (minutes) => {
        if (!minutes) return '0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    return (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="card-header">
                <h3 className="card-title">📊 Today's Summary</h3>
            </div>
            <div style={{
                padding: 'var(--space-md)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 'var(--space-md)'
            }}>
                {/* Feedings */}
                <div style={{
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-md)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '1.5rem' }}>🍼</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {summary.total_feedings}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        feedings
                    </div>
                    {summary.total_ml > 0 && (
                        <div style={{ fontSize: '0.9rem', fontWeight: '500', marginTop: '0.25rem' }}>
                            {summary.total_ml} ml
                        </div>
                    )}
                </div>

                {/* Diapers */}
                <div style={{
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-md)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '1.5rem' }}>🧷</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
                        {summary.total_diapers}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        diapers
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        💧{summary.pee_count} 💩{summary.poo_count} 🔄{summary.mixed_count}
                    </div>
                </div>

                {/* Sleep */}
                <div style={{
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-md)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '1.5rem' }}>😴</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                        {formatTime(summary.total_sleep_minutes)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        sleep
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        {summary.sleep_count} naps
                    </div>
                </div>

                {/* Pumping */}
                {summary.pumping_count > 0 && (
                    <div style={{
                        background: 'var(--surface)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-md)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '1.5rem' }}>🍶</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text)' }}>
                            {summary.pumping_count}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            pumps
                        </div>
                        {summary.total_pumping_ml > 0 && (
                            <div style={{ fontSize: '0.9rem', fontWeight: '500', marginTop: '0.25rem' }}>
                                {summary.total_pumping_ml} ml
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
