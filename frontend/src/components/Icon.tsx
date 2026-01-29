/* eslint-disable @typescript-eslint/no-explicit-any */
// Custom app icons
const icons: Record<string, string> = {
    feeding: '/icons/feeding.png',
    diaper: '/icons/diaper.png',
    sleep: '/icons/sleep.png',
    pumping: '/icons/pumping.png',
    logo: '/icons/logo.png',
};

// Only warn in development
const isDev = import.meta.env.DEV;

interface IconProps { name: string; size?: number; className?: string; }
export default function Icon({ name, size = 32, className = '' }: IconProps) {
    const src = icons[name];

    if (!src) {
        if (isDev) console.warn(`Icon not found: ${name}`);
        return null;
    }

    return (
        <img
            src={src}
            alt={name}
            width={size}
            height={size}
            className={className}
            style={{
                objectFit: 'contain',
                borderRadius: size > 40 ? '12px' : '8px'
            }}
        />
    );
}

// Export icon paths for direct use
export { icons };
