/**
 * Parse a UTC time string from the API into a local Date object.
 * Ensures the 'Z' suffix is present for proper UTC parsing.
 */
export function parseUTCTime(timeStr: string | null | undefined): Date {
    if (!timeStr) return new Date();
    const utcTime = typeof timeStr === 'string' && timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
    return new Date(utcTime);
}
