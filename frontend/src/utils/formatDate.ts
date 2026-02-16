import { format, parseISO } from 'date-fns';

/**
 * Format a date string (ISO format) to a human-readable date.
 * Handles both date-only ("2026-02-07") and full ISO ("2026-02-07T00:00:00Z") strings.
 * For date-only strings, appends T12:00:00 to avoid timezone shift issues.
 * Used across health components (TeethingCard, RecordsSection, AllergiesCard).
 */
export function formatDate(dateStr: string): string {
    try {
        // Date-only string (YYYY-MM-DD): parse at noon to avoid timezone drift
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return format(parseISO(dateStr + 'T12:00:00'), 'MMM d, yyyy');
        }
        // Full ISO string: extract just the date part to avoid timezone issues
        if (dateStr.includes('T')) {
            const datePart = dateStr.split('T')[0];
            return format(parseISO(datePart + 'T12:00:00'), 'MMM d, yyyy');
        }
        return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
        return dateStr;
    }
}
