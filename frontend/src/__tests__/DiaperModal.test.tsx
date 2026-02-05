import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DiaperModal from '../components/DiaperModal';

vi.mock('../api/client', () => ({
    api: { createDiaper: vi.fn().mockResolvedValue({}), updateDiaper: vi.fn().mockResolvedValue({}) }
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { api } from '../api/client';

describe('DiaperModal', () => {
    const defaultProps = {
        babyId: 1,
        onClose: vi.fn(),
        onSave: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders modal with title', () => {
        render(<DiaperModal {...defaultProps} />);
        const title = screen.getByRole('heading', { level: 2 });
        expect(title).toHaveTextContent('Log');
        expect(title).toHaveTextContent('Diaper Change');
    });

    it('shows diaper type buttons (Pee, Poo, Both)', () => {
        render(<DiaperModal {...defaultProps} />);
        expect(screen.getByText('Pee')).toBeInTheDocument();
        expect(screen.getByText('Poo')).toBeInTheDocument();
        expect(screen.getByText('Both')).toBeInTheDocument();
    });

    it('shows poo detail options when Poo type is selected', () => {
        render(<DiaperModal {...defaultProps} />);
        fireEvent.click(screen.getByText('Poo'));

        // Color options should appear
        expect(screen.getByText('Color')).toBeInTheDocument();
        expect(screen.getByText('Yellow')).toBeInTheDocument();
        expect(screen.getByText('Brown')).toBeInTheDocument();
        expect(screen.getByText('Green')).toBeInTheDocument();

        // Consistency options should appear
        expect(screen.getByText('Consistency')).toBeInTheDocument();
        expect(screen.getByText('Soft')).toBeInTheDocument();
        expect(screen.getByText('Formed')).toBeInTheDocument();

        // Amount options should appear
        expect(screen.getByText('Amount')).toBeInTheDocument();
    });

    it('shows poo detail options when Both type is selected', () => {
        render(<DiaperModal {...defaultProps} />);
        fireEvent.click(screen.getByText('Both'));

        expect(screen.getByText('Color')).toBeInTheDocument();
        expect(screen.getByText('Consistency')).toBeInTheDocument();
        expect(screen.getByText('Amount')).toBeInTheDocument();
    });

    it('does not show poo details when Pee is selected (default)', () => {
        render(<DiaperModal {...defaultProps} />);

        // With default "pee" selection, poo details should not be visible
        expect(screen.queryByText('Color')).not.toBeInTheDocument();
        expect(screen.queryByText('Consistency')).not.toBeInTheDocument();
    });

    it('calls onSave after successful submission', async () => {
        const onSave = vi.fn();
        render(<DiaperModal {...defaultProps} onSave={onSave} />);

        const saveBtn = screen.getByText('Save Diaper Change');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(api.createDiaper).toHaveBeenCalledTimes(1);
            expect(api.createDiaper).toHaveBeenCalledWith(expect.objectContaining({
                baby_id: 1,
                type: 'pee',
            }));
        });
        await waitFor(() => {
            expect(onSave).toHaveBeenCalledTimes(1);
        });
    });

    it('calls onClose when close button clicked', () => {
        const onClose = vi.fn();
        render(<DiaperModal {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByText('×'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Cancel button clicked', () => {
        const onClose = vi.fn();
        render(<DiaperModal {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows edit mode when editEvent provided', () => {
        const editEvent = {
            id: 99,
            time: '2025-01-15T14:00:00',
            details: {
                type: 'poo',
                poo_color: 'brown',
                poo_consistency: 'soft',
                poo_amount: 'medium',
                notes: 'After lunch',
            },
        };

        render(<DiaperModal {...defaultProps} editEvent={editEvent} />);

        // Title should show "Edit" instead of "Log"
        expect(screen.getByText(/Edit/)).toBeInTheDocument();

        // Notes should be pre-filled
        const notesInput = screen.getByPlaceholderText('Optional notes...');
        expect(notesInput).toHaveValue('After lunch');
    });

    it('calls updateDiaper when editing an existing event', async () => {
        const onSave = vi.fn();
        const editEvent = {
            id: 99,
            time: '2025-01-15T14:00:00',
            details: {
                type: 'mixed',
                notes: 'Edit test',
            },
        };

        render(<DiaperModal {...defaultProps} onSave={onSave} editEvent={editEvent} />);

        const saveBtn = screen.getByText('Save Diaper Change');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(api.updateDiaper).toHaveBeenCalledTimes(1);
            expect(api.updateDiaper).toHaveBeenCalledWith(99, expect.objectContaining({
                baby_id: 1,
                type: 'mixed',
            }));
        });
        await waitFor(() => {
            expect(onSave).toHaveBeenCalledTimes(1);
        });
    });
});
