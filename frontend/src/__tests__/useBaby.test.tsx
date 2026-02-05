import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { BabyProvider, useBaby } from '../hooks/useBaby';

vi.mock('../api/client', () => ({
    api: {
        getBabies: vi.fn(),
        createBaby: vi.fn(),
        deleteBaby: vi.fn(),
    },
}));
vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

import { api } from '../api/client';
import { toast } from 'sonner';

const mockBabies = [
    { id: 1, name: 'Luna', birth_date: '2024-01-15', gender: 'girl' },
    { id: 2, name: 'Max', birth_date: '2024-06-20', gender: 'boy' },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BabyProvider>{children}</BabyProvider>
);

describe('useBaby', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.mocked(api.getBabies).mockResolvedValue(mockBabies);
        vi.mocked(api.createBaby).mockResolvedValue({ id: 3, name: 'Mia', birth_date: '2025-01-01', gender: 'girl' });
        vi.mocked(api.deleteBaby).mockResolvedValue(null);
        vi.mocked(toast.success).mockImplementation(() => '');
        vi.mocked(toast.error).mockImplementation(() => '');
    });

    it('throws error when used outside BabyProvider', () => {
        // Suppress console.error from React for this expected error
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => {
            renderHook(() => useBaby());
        }).toThrow('useBaby must be used within a BabyProvider');
        spy.mockRestore();
    });

    it('loads babies on mount', async () => {
        const { result } = renderHook(() => useBaby(), { wrapper });

        // Initially loading
        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(api.getBabies).toHaveBeenCalledOnce();
        expect(result.current.babies).toEqual(mockBabies);
    });

    it('sets first baby as selected by default', async () => {
        const { result } = renderHook(() => useBaby(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.selectedBaby).toEqual(mockBabies[0]);
    });

    it('uses saved baby ID from localStorage if available', async () => {
        localStorage.setItem('selected_baby_id', '2');

        const { result } = renderHook(() => useBaby(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.selectedBaby).toEqual(mockBabies[1]);
    });

    it('falls back to first baby if saved ID not found in list', async () => {
        localStorage.setItem('selected_baby_id', '999');

        const { result } = renderHook(() => useBaby(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.selectedBaby).toEqual(mockBabies[0]);
    });

    it('selectBaby updates selectedBaby and saves to localStorage', async () => {
        const { result } = renderHook(() => useBaby(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        act(() => {
            result.current.selectBaby(mockBabies[1]);
        });

        expect(result.current.selectedBaby).toEqual(mockBabies[1]);
        expect(localStorage.setItem).toHaveBeenCalledWith('selected_baby_id', '2');
    });

    it('addBaby calls api.createBaby and updates babies array', async () => {
        const { result } = renderHook(() => useBaby(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        const newBabyData = { name: 'Mia', birth_date: '2025-01-01', gender: 'girl' };

        await act(async () => {
            await result.current.addBaby(newBabyData);
        });

        expect(api.createBaby).toHaveBeenCalledWith(newBabyData);
        expect(result.current.babies).toHaveLength(3);
        expect(result.current.babies[2]).toEqual(
            expect.objectContaining({ id: 3, name: 'Mia' })
        );
        expect(toast.success).toHaveBeenCalledWith(
            'Mia added!',
            expect.objectContaining({ description: 'Baby profile created successfully.' })
        );
    });

    it('removeBaby calls api.deleteBaby and removes from array', async () => {
        const { result } = renderHook(() => useBaby(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        await act(async () => {
            await result.current.removeBaby(1);
        });

        expect(api.deleteBaby).toHaveBeenCalledWith(1);
        expect(result.current.babies).toHaveLength(1);
        expect(result.current.babies[0].id).toBe(2);
        expect(toast.success).toHaveBeenCalledWith(
            'Luna removed',
            expect.objectContaining({ description: 'Baby profile deleted successfully.' })
        );
    });

    it('removeBaby updates selectedBaby when the selected baby is removed', async () => {
        const { result } = renderHook(() => useBaby(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // The first baby (Luna, id: 1) is selected by default
        expect(result.current.selectedBaby?.id).toBe(1);

        await act(async () => {
            await result.current.removeBaby(1);
        });

        // After removing the selected baby, it should select the next available
        expect(result.current.selectedBaby?.id).toBe(2);
    });

    it('shows error toast when getBabies fails', async () => {
        const error = new Error('Network error');
        vi.mocked(api.getBabies).mockRejectedValue(error);
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { result } = renderHook(() => useBaby(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('Failed to load babies. Please try again.');
        expect(toast.error).toHaveBeenCalledWith(
            'Failed to load babies',
            expect.objectContaining({ description: 'Network error' })
        );
        consoleSpy.mockRestore();
    });

    it('shows error toast when addBaby fails', async () => {
        const error = new Error('Create failed');
        vi.mocked(api.createBaby).mockRejectedValue(error);
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { result } = renderHook(() => useBaby(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        await expect(
            act(async () => {
                await result.current.addBaby({ name: 'Test' });
            })
        ).rejects.toThrow('Create failed');

        expect(toast.error).toHaveBeenCalledWith(
            'Failed to add baby',
            expect.objectContaining({ description: 'Create failed' })
        );
        consoleSpy.mockRestore();
    });

    it('shows error toast when removeBaby fails', async () => {
        const error = new Error('Delete failed');
        vi.mocked(api.deleteBaby).mockRejectedValue(error);
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { result } = renderHook(() => useBaby(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        await expect(
            act(async () => {
                await result.current.removeBaby(1);
            })
        ).rejects.toThrow('Delete failed');

        expect(toast.error).toHaveBeenCalledWith(
            'Failed to remove baby',
            expect.objectContaining({ description: 'Delete failed' })
        );
        consoleSpy.mockRestore();
    });

    it('handles empty babies array from API', async () => {
        vi.mocked(api.getBabies).mockResolvedValue([]);

        const { result } = renderHook(() => useBaby(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.babies).toEqual([]);
        expect(result.current.selectedBaby).toBeNull();
    });

    it('addBaby auto-selects baby when no baby is currently selected', async () => {
        vi.mocked(api.getBabies).mockResolvedValue([]);

        const { result } = renderHook(() => useBaby(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.selectedBaby).toBeNull();

        await act(async () => {
            await result.current.addBaby({ name: 'Mia', birth_date: '2025-01-01', gender: 'girl' });
        });

        expect(result.current.selectedBaby).toEqual(
            expect.objectContaining({ id: 3, name: 'Mia' })
        );
    });
});
