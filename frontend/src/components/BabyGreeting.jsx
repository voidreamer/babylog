import { useBaby } from '../hooks/useBaby';
import { Baby, Sparkles } from 'lucide-react';

// Get time-based greeting
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', icon: '☀️' };
    if (hour < 17) return { text: 'Good afternoon', icon: '🌤️' };
    return { text: 'Good evening', icon: '🌙' };
}

// Calculate age from birth date
function calculateAge(birthDate) {
    if (!birthDate) return null;

    const birth = new Date(birthDate);
    const now = new Date();
    const diffMs = now - birth;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return null;
    if (diffDays === 0) return 'Born today!';
    if (diffDays === 1) return '1 day old';
    if (diffDays < 7) return `${diffDays} days old`;

    const weeks = Math.floor(diffDays / 7);
    if (weeks < 12) return `${weeks} week${weeks > 1 ? 's' : ''} old`;

    const months = Math.floor(diffDays / 30.44);
    if (months < 24) return `${months} month${months > 1 ? 's' : ''} old`;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''} old`;
    return `${years}y ${remainingMonths}m old`;
}

// Get encouraging message based on daily stats
function getEncouragement(summary) {
    if (!summary) return "Let's track today's activities!";

    const total = (summary.total_feedings || 0) + (summary.total_diapers || 0) + (summary.sleep_count || 0);

    if (total === 0) return "Ready to log today's first event!";
    if (total <= 3) return "Great start to the day!";
    if (total <= 8) return "You're doing amazing!";
    return "Super parent! Keep it up!";
}

// Generate consistent pastel color from name
function getAvatarColor(name) {
    if (!name) return 'hsl(280, 70%, 70%)';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 75%)`;
}

export default function BabyGreeting({ summary }) {
    const { selectedBaby } = useBaby();

    if (!selectedBaby) return null;

    const greeting = getGreeting();
    const age = calculateAge(selectedBaby.birth_date);
    const encouragement = getEncouragement(summary);
    const avatarColor = getAvatarColor(selectedBaby.name);

    return (
        <div className="baby-greeting">
            <div className="baby-greeting-header">
                <span className="greeting-icon">{greeting.icon}</span>
                <span className="greeting-text">{greeting.text}!</span>
            </div>

            <div className="baby-greeting-content">
                <div
                    className="baby-greeting-avatar"
                    style={{ background: avatarColor }}
                >
                    {selectedBaby.name.charAt(0).toUpperCase()}
                </div>

                <div className="baby-greeting-info">
                    <div className="baby-greeting-name">{selectedBaby.name}</div>
                    {age && <div className="baby-greeting-age">{age}</div>}
                </div>
            </div>

            <div className="baby-greeting-encouragement">
                <Sparkles size={14} />
                <span>{encouragement}</span>
            </div>
        </div>
    );
}

export { getAvatarColor };
