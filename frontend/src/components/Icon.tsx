/* eslint-disable @typescript-eslint/no-explicit-any */
// Custom app icons
const base = import.meta.env.BASE_URL;
const icons: Record<string, string> = {
    feeding: `${base}icons/feeding.png`,
    diaper: `${base}icons/diaper.png`,
    sleep: `${base}icons/sleep.png`,
    pumping: `${base}icons/pumping.png`,
    activity: `${base}icons/activity.png`,
    medicine: `${base}icons/medicine.png`,
    growth: `${base}icons/growth.png`,
    logo: `${base}icons/logo.png`,
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
            style={{ objectFit: 'contain' }}
        />
    );
}
