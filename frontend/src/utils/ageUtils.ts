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

/**
 * Fractional calendar-based age in months, suitable for plotting on a
 * continuous axis (e.g. WHO growth charts). Uses the day-of-month to
 * interpolate between whole calendar months instead of dividing by 30.44.
 */
export function calculateFractionalAgeMonths(birthDate: string, at: Date = new Date()): number {
    const birth = parseBirthDate(birthDate);
    let months = (at.getFullYear() - birth.getFullYear()) * 12 + (at.getMonth() - birth.getMonth());
    const dayDelta = at.getDate() - birth.getDate();
    if (dayDelta < 0) {
        // Not yet reached the birth day this month — back off a month and
        // add the fraction completed within that prior month.
        const prevMonthEnd = new Date(at.getFullYear(), at.getMonth(), 0).getDate();
        months -= 1;
        months += (prevMonthEnd + dayDelta) / prevMonthEnd;
    } else {
        const curMonthEnd = new Date(at.getFullYear(), at.getMonth() + 1, 0).getDate();
        months += dayDelta / curMonthEnd;
    }
    return Math.max(0, months);
}

type TFn = (key: string | string[], options?: Record<string, unknown>) => string;

/**
 * Render the baby's age as a translated human-readable label (e.g. "4 months old").
 * Centralises age-label formatting so dashboard/insights/profile stay consistent.
 * Translation keys live in the `dashboard` namespace.
 */
export function formatAgeLabel(birthDate: string | null | undefined, t: TFn): string | null {
    if (!birthDate) return null;
    const age = calculatePreciseAge(birthDate);
    if (age.days < 0) return null;
    if (age.days === 0) return t('dashboard:age.bornToday');
    if (age.days < 7) {
        return t(age.days === 1 ? 'dashboard:age.daysOld' : 'dashboard:age.daysOld_plural', { count: age.days });
    }
    if (age.weeks < 12) {
        return t(age.weeks === 1 ? 'dashboard:age.weeksOld' : 'dashboard:age.weeksOld_plural', { count: age.weeks });
    }
    if (age.months < 24) {
        return t(age.months === 1 ? 'dashboard:age.monthsOld' : 'dashboard:age.monthsOld_plural', { count: age.months });
    }
    const remainingMonths = age.months % 12;
    if (remainingMonths === 0) {
        return t(age.years === 1 ? 'dashboard:age.yearsOld' : 'dashboard:age.yearsOld_plural', { count: age.years });
    }
    return t('dashboard:age.yearsMonthsOld', { years: age.years, months: remainingMonths });
}
