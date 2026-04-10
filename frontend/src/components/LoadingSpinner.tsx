import { useMemo } from 'react';

const CUTE_MESSAGES = [
    'Getting things ready...',
    'Loading your little one...',
    'Almost there...',
    'Warming up the bottle...',
    'Counting tiny toes...',
];

function pickMessage(): string {
    return CUTE_MESSAGES[Math.floor(Math.random() * CUTE_MESSAGES.length)];
}

interface LoadingSpinnerProps {
    text?: string;
    fullPage?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ text, fullPage = true, size = 'md' }: LoadingSpinnerProps) {
    const message = useMemo(() => text ?? pickMessage(), [text]);

    const sizeMap = { sm: 48, md: 80, lg: 112 };
    const imgSize = sizeMap[size];

    const content = (
        <div className="loading-spinner-inner">
            <img
                src={`${import.meta.env.BASE_URL}icons/loading.png`}
                alt=""
                className="loading-logo"
                style={{ width: imgSize, height: imgSize }}
            />
            <span className="loading-text">{message}</span>
        </div>
    );

    if (fullPage) {
        return (
            <div className="loading">
                {content}
            </div>
        );
    }

    return (
        <div className="loading-inline">
            {content}
        </div>
    );
}
