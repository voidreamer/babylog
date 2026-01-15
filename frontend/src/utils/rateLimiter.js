/**
 * Simple client-side rate limiter using localStorage.
 *
 * Prevents abuse of rate-limited actions like promo code redemption.
 * Note: This is client-side only - server should also have rate limiting.
 */

const STORAGE_KEY_PREFIX = 'rateLimit_';

/**
 * Check if an action is rate limited
 * @param {string} action - The action identifier (e.g., 'promoCode')
 * @param {number} maxAttempts - Maximum attempts allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ allowed: boolean, remainingAttempts: number, resetTime: number | null }}
 */
export function checkRateLimit(action, maxAttempts = 3, windowMs = 60000) {
    const key = STORAGE_KEY_PREFIX + action;
    const now = Date.now();

    try {
        const stored = localStorage.getItem(key);
        let data = stored ? JSON.parse(stored) : { attempts: [], windowStart: now };

        // Filter out attempts outside the current window
        data.attempts = data.attempts.filter(timestamp => now - timestamp < windowMs);

        // Reset window if it's expired
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
    } catch (e) {
        // If localStorage fails, allow the action
        return { allowed: true, remainingAttempts: maxAttempts, resetTime: null };
    }
}

/**
 * Record an attempt for rate limiting
 * @param {string} action - The action identifier
 * @param {number} windowMs - Time window in milliseconds
 */
export function recordAttempt(action, windowMs = 60000) {
    const key = STORAGE_KEY_PREFIX + action;
    const now = Date.now();

    try {
        const stored = localStorage.getItem(key);
        let data = stored ? JSON.parse(stored) : { attempts: [], windowStart: now };

        // Filter out old attempts
        data.attempts = data.attempts.filter(timestamp => now - timestamp < windowMs);

        // Reset window if expired
        if (now - data.windowStart >= windowMs) {
            data = { attempts: [], windowStart: now };
        }

        // Add new attempt
        data.attempts.push(now);

        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        // Silently fail if localStorage is unavailable
    }
}

/**
 * Get time until rate limit resets (for user messaging)
 * @param {number} resetTime - Timestamp when limit resets
 * @returns {string} Human-readable time remaining
 */
export function getTimeUntilReset(resetTime) {
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

/**
 * Clear rate limit for an action (useful for testing or after successful action)
 * @param {string} action - The action identifier
 */
export function clearRateLimit(action) {
    const key = STORAGE_KEY_PREFIX + action;
    try {
        localStorage.removeItem(key);
    } catch (e) {
        // Silently fail
    }
}
