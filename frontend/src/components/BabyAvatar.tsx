import { useState } from 'react';

export function getAvatarColor(name: string | null): string {
    if (!name) return 'hsl(280, 70%, 70%)';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 75%)`;
}

interface BabyAvatarProps {
    name: string;
    photoUrl?: string | null;
    size?: number;
    className?: string;
}

export default function BabyAvatar({ name, photoUrl, size = 36, className = '' }: BabyAvatarProps) {
    const [imgError, setImgError] = useState(false);

    if (photoUrl && !imgError) {
        return (
            <img
                src={photoUrl}
                alt={name}
                className={`baby-avatar-img ${className}`}
                style={{ width: size, height: size }}
                onError={() => setImgError(true)}
            />
        );
    }

    // Letter circle fallback
    const color = getAvatarColor(name);
    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: size * 0.45,
                color: '#fff',
                flexShrink: 0,
            }}
        >
            {name ? name.charAt(0).toUpperCase() : '?'}
        </div>
    );
}
