import { describe, it, expect, vi } from 'vitest';
import { showError, showSuccess, showInfo, ErrorMessages } from '../utils/notifications';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from 'sonner';

describe('notifications', () => {
  describe('showError', () => {
    it('calls toast.error with message', () => {
      showError('Something failed');
      expect(toast.error).toHaveBeenCalledWith('Something failed', expect.objectContaining({
        description: 'Please try again.',
      }));
    });

    it('uses Error message as description', () => {
      showError('Failed', new Error('Network down'));
      expect(toast.error).toHaveBeenCalledWith('Failed', expect.objectContaining({
        description: 'Network down',
      }));
    });

    it('uses string error as description', () => {
      showError('Failed', 'Custom error');
      expect(toast.error).toHaveBeenCalledWith('Failed', expect.objectContaining({
        description: 'Custom error',
      }));
    });

    it('passes additional options', () => {
      showError('Failed', null, { description: 'override' });
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('showSuccess', () => {
    it('calls toast.success', () => {
      showSuccess('Saved!');
      expect(toast.success).toHaveBeenCalledWith('Saved!', {});
    });

    it('passes options', () => {
      showSuccess('Done', { description: 'All good' });
      expect(toast.success).toHaveBeenCalledWith('Done', { description: 'All good' });
    });
  });

  describe('showInfo', () => {
    it('calls toast.info', () => {
      showInfo('FYI');
      expect(toast.info).toHaveBeenCalledWith('FYI', {});
    });
  });

  describe('ErrorMessages', () => {
    it('has expected constants', () => {
      expect(ErrorMessages.NETWORK).toBeDefined();
      expect(ErrorMessages.UNAUTHORIZED).toBeDefined();
      expect(ErrorMessages.SERVER).toBeDefined();
      expect(ErrorMessages.LOAD_FAILED).toBeDefined();
      expect(ErrorMessages.SAVE_FAILED).toBeDefined();
      expect(ErrorMessages.DELETE_FAILED).toBeDefined();
    });
  });
});
