import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedingModal from '../components/FeedingModal';

vi.mock('../api/client', () => ({
    api: { createFeeding: vi.fn().mockResolvedValue({}), updateFeeding: vi.fn().mockResolvedValue({}) }
}));

vi.mock('../hooks/useUnits', () => ({
    useUnits: () => ({
        convertVolume: (ml: number) => ml,
        parseVolume: (val: number) => val,
        volumeUnit: 'ml',
        isImperial: false,
    })
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { api } from '../api/client';

describe('FeedingModal', () => {
    const defaultProps = {
        babyId: 1,
        onClose: vi.fn(),
        onSave: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders modal with title', () => {
        render(<FeedingModal {...defaultProps} />);
        const title = screen.getByRole('heading', { level: 2 });
        expect(title).toHaveTextContent('Log');
        expect(title).toHaveTextContent('Feeding');
    });

    it('shows feeding method buttons (Breast, Bottle)', () => {
        render(<FeedingModal {...defaultProps} />);
        expect(screen.getByText('Breast')).toBeInTheDocument();
        expect(screen.getByText('Bottle')).toBeInTheDocument();
    });

    it('shows bottle sub-type buttons when Bottle is selected', () => {
        render(<FeedingModal {...defaultProps} />);
        fireEvent.click(screen.getByText('Bottle'));
        expect(screen.getByText('Breast Milk')).toBeInTheDocument();
        expect(screen.getByText('Formula')).toBeInTheDocument();
    });

    it('shows Quick Log and Timer mode buttons', () => {
        render(<FeedingModal {...defaultProps} />);
        expect(screen.getByText('Quick Log')).toBeInTheDocument();
        expect(screen.getByText('Timer')).toBeInTheDocument();
    });

    it('calls onSave after successful submission', async () => {
        const onSave = vi.fn();
        render(<FeedingModal {...defaultProps} onSave={onSave} />);

        // Submit the quick-log form via the save button
        const saveBtn = screen.getByText('Save Feeding');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(api.createFeeding).toHaveBeenCalledTimes(1);
        });
        await waitFor(() => {
            expect(onSave).toHaveBeenCalledTimes(1);
        });
    });

    it('calls onClose when close button clicked', () => {
        const onClose = vi.fn();
        render(<FeedingModal {...defaultProps} onClose={onClose} />);

        const closeBtn = screen.getByText('×');
        fireEvent.click(closeBtn);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Cancel button clicked', () => {
        const onClose = vi.fn();
        render(<FeedingModal {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('pre-fills form when editEvent provided', () => {
        const editEvent = {
            id: 42,
            time: '2025-01-15T10:30:00',
            details: {
                type: 'formula',
                duration_minutes: 15,
                amount_ml: 120,
                notes: 'Test note',
            },
        };

        render(<FeedingModal {...defaultProps} editEvent={editEvent} />);

        // In edit mode, the title should say "Edit" instead of "Log"
        const title = screen.getByRole('heading', { level: 2 });
        expect(title).toHaveTextContent('Edit');

        // Notes input should be pre-filled
        const notesInput = screen.getByPlaceholderText('Optional notes...');
        expect(notesInput).toHaveValue('Test note');

        // Duration and amount inputs should be pre-filled (both have placeholder "Optional")
        const optionalInputs = screen.getAllByPlaceholderText('Optional');
        // First is duration, second is amount (when bottle/formula is selected)
        expect(optionalInputs[0]).toHaveValue(15);
        expect(optionalInputs[1]).toHaveValue(120);
    });

    it('calls updateFeeding when editing an existing event', async () => {
        const onSave = vi.fn();
        const editEvent = {
            id: 42,
            time: '2025-01-15T10:30:00',
            details: {
                type: 'breast',
                duration_minutes: 10,
            },
        };

        render(<FeedingModal {...defaultProps} onSave={onSave} editEvent={editEvent} />);

        const saveBtn = screen.getByText('Save Feeding');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(api.updateFeeding).toHaveBeenCalledTimes(1);
            expect(api.updateFeeding).toHaveBeenCalledWith(42, expect.objectContaining({
                baby_id: 1,
                type: 'breast',
            }));
        });
        await waitFor(() => {
            expect(onSave).toHaveBeenCalledTimes(1);
        });
    });
});
