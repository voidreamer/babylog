const STORAGE_KEY_PREFIX = 'rateLimit_';

interface RateLimitData {
    attempts: number[];
    windowStart: number;
}

interface RateLimitResult {
    allowed: boolean;
    remainingAttempts: number;
    resetTime: number | null;
}

export function checkRateLimit(action: string, maxAttempts: number = 3, windowMs: number = 60000): RateLimitResult {
    const key = STORAGE_KEY_PREFIX + action;
    const now = Date.now();

    try {
        const stored = localStorage.getItem(key);
        let data: RateLimitData = stored ? JSON.parse(stored) : { attempts: [], windowStart: now };

        data.attempts = data.attempts.filter((timestamp: number) => now - timestamp < windowMs);

        if (now - data.windowStart >= windowMs) {
            data = { attempts: [], windowStart: now };
        }

        const remainingAttempts = Math.max(0, maxAttempts - data.attempts.length);
        const oldestAttempt = data.attempts[0];
        const resetTime = oldestAttempt ? oldestAttempt + windowMs : null;

        return {
            allowed: data.attempts.length < maxAttempts,
            remainingAttempts,
            resetTime
        };
    } catch {
        return { allowed: true, remainingAttempts: maxAttempts, resetTime: null };
    }
}

export function recordAttempt(action: string, windowMs: number = 60000): void {
    const key = STORAGE_KEY_PREFIX + action;
    const now = Date.now();

    try {
        const stored = localStorage.getItem(key);
        let data: RateLimitData = stored ? JSON.parse(stored) : { attempts: [], windowStart: now };

        data.attempts = data.attempts.filter((timestamp: number) => now - timestamp < windowMs);

        if (now - data.windowStart >= windowMs) {
            data = { attempts: [], windowStart: now };
        }

        data.attempts.push(now);
        localStorage.setItem(key, JSON.stringify(data));
    } catch {
        // Silently fail
    }
}

export function getTimeUntilReset(resetTime: number | null): string {
    if (!resetTime) return '';

    const now = Date.now();
    const remaining = Math.max(0, resetTime - now);

    if (remaining <= 0) return '';

    const seconds = Math.ceil(remaining / 1000);
    if (seconds < 60) {
        return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }

    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

export function clearRateLimit(action: string): void {
    const key = STORAGE_KEY_PREFIX + action;
    try {
        localStorage.removeItem(key);
    } catch {
        // Silently fail
    }
}
