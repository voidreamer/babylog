import { format, parseISO } from 'date-fns';

/**
 * Format a date string (ISO format) to a human-readable date.
 * Used across health components (TeethingCard, MilestonesCard, RecordsSection, AllergiesCard).
 */
export function formatDate(dateStr: string): string {
    try {
        return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
        return dateStr;
    }
}
