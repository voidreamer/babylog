/**
 * Parse a birth date string safely, avoiding UTC timezone shift.
 * Normalizes "2025-01-17T00:00:00Z" → noon local time so the day doesn't drift.
 */
function parseBirthDate(birthDate: string): Date {
    const datePart = birthDate.includes('T') ? birthDate.split('T')[0] : birthDate;
    return new Date(datePart + 'T12:00:00');
}

export function calculateAgeInMonths(birthDate: string): number {
    const birth = parseBirthDate(birthDate);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 +
        (today.getMonth() - birth.getMonth());
    // Adjust if we haven't reached the birth day this month yet
    if (today.getDate() < birth.getDate()) {
        return Math.max(0, months - 1);
    }
    return Math.max(0, months);
}

/**
 * Format baby age as a precise, human-readable string.
 * Uses the same logic as BabyGreeting for consistency.
 * Returns { key, params } for i18n translation.
 */
export function calculatePreciseAge(birthDate: string): { days: number; weeks: number; months: number; years: number } {
    const birth = parseBirthDate(birthDate);
    const now = new Date();
    const diffMs = now.getTime() - birth.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);

    // Calendar-based months (more precise than dividing by 30.44)
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (now.getDate() < birth.getDate()) months--;
    months = Math.max(0, months);

    const years = Math.floor(months / 12);

    return { days, weeks, months, years };
}
