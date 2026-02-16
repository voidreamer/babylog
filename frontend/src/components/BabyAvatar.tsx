import { useState } from 'react';
import { getAvatarColor } from './BabyGreeting';

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
