import { toast } from 'sonner';

/**
 * Standardized error handling utility
 * Provides consistent error messages across the app
 */

/**
 * Show a standardized error toast
 * @param {string} message - Main error message
 * @param {Error|string} error - The error object or message
 * @param {object} options - Additional toast options
 */
export function showError(message, error = null, options = {}) {
    const description = error?.message || (typeof error === 'string' ? error : 'Please try again.');

    toast.error(message, {
        description,
        ...options,
    });
}

/**
 * Show a standardized success toast
 * @param {string} message - Success message
 * @param {object} options - Additional toast options
 */
export function showSuccess(message, options = {}) {
    toast.success(message, options);
}

/**
 * Show a standardized info toast
 * @param {string} message - Info message
 * @param {object} options - Additional toast options
 */
export function showInfo(message, options = {}) {
    toast.info(message, options);
}

/**
 * Common error messages for reuse
 */
export const ErrorMessages = {
    NETWORK: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'Session expired. Please log in again.',
    SERVER: 'Server error. Please try again later.',
    VALIDATION: 'Please check your input and try again.',
    LOAD_FAILED: 'Failed to load data',
    SAVE_FAILED: 'Failed to save',
    DELETE_FAILED: 'Failed to delete',
};

export default { showError, showSuccess, showInfo, ErrorMessages };
