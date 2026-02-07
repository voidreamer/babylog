import { useState, useRef, useCallback } from 'react';

const THRESHOLD = 80;

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const [pulling, setPulling] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const startY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        // Only activate if scrolled to top
        if (containerRef.current && containerRef.current.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
            setPulling(true);
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!pulling || refreshing) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;
        if (diff > 0) {
            // Apply resistance — diminishing returns as you pull further
            setPullDistance(Math.min(diff * 0.5, THRESHOLD * 1.5));
        }
    }, [pulling, refreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (!pulling) return;
        setPulling(false);

        if (pullDistance >= THRESHOLD) {
            setRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setRefreshing(false);
            }
        }
        setPullDistance(0);
    }, [pulling, pullDistance, onRefresh]);

    const progress = Math.min(pullDistance / THRESHOLD, 1);

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ position: 'relative' }}
        >
            {/* Pull indicator */}
            {(pullDistance > 0 || refreshing) && (
                <div
                    className="pull-to-refresh-indicator"
                    style={{ height: refreshing ? 48 : pullDistance }}
                >
                    <div
                        className={`pull-to-refresh-icon ${refreshing ? 'spinning' : ''}`}
                        style={{ opacity: refreshing ? 1 : progress, transform: `rotate(${progress * 180}deg)` }}
                    >
                        {refreshing ? '⟳' : '↓'}
                    </div>
                </div>
            )}
            {children}
        </div>
    );
}
