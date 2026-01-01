// Custom app icons
const icons = {
    feeding: '/icons/feeding.png',
    diaper: '/icons/diaper.png',
    sleep: '/icons/sleep.png',
    pumping: '/icons/pumping.png',
    logo: '/icons/logo.png',
};

export default function Icon({ name, size = 32, className = '' }) {
    const src = icons[name];

    if (!src) {
        console.warn(`Icon not found: ${name}`);
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
