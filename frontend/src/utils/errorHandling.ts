import { toast } from 'sonner';
import { ApiError } from '../api/client';
import type { TFunction } from 'i18next';

export function isPermissionError(error: unknown): boolean {
    return error instanceof ApiError && error.status === 403;
}

export function showApiError(error: unknown, fallbackMessage: string, t?: TFunction) {
    if (isPermissionError(error)) {
        toast.error(t ? t('common:permissionDenied') : 'View-only access', {
            description: t ? t('common:permissionDeniedDesc') : "Ask the baby's owner to upgrade your permissions.",
        });
    } else {
        toast.error(fallbackMessage);
    }
}
