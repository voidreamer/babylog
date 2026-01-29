import { toast } from 'sonner';

interface ToastOptions {
    description?: string;
    [key: string]: unknown;
}

export function showError(message: string, error: Error | string | null = null, options: ToastOptions = {}): void {
    const description = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Please try again.');

    toast.error(message, {
        description,
        ...options,
    });
}

export function showSuccess(message: string, options: ToastOptions = {}): void {
    toast.success(message, options);
}

export function showInfo(message: string, options: ToastOptions = {}): void {
    toast.info(message, options);
}

export const ErrorMessages = {
    NETWORK: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'Session expired. Please log in again.',
    SERVER: 'Server error. Please try again later.',
    VALIDATION: 'Please check your input and try again.',
    LOAD_FAILED: 'Failed to load data',
    SAVE_FAILED: 'Failed to save',
    DELETE_FAILED: 'Failed to delete',
} as const;

export default { showError, showSuccess, showInfo, ErrorMessages };
