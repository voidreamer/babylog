import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SleepModal from '../components/SleepModal';

vi.mock('../api/client', () => ({
    api: { createSleep: vi.fn().mockResolvedValue({}), updateSleep: vi.fn().mockResolvedValue({}) }
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { api } from '../api/client';

describe('SleepModal', () => {
    const defaultProps = {
        babyId: 1,
        onClose: vi.fn(),
        onSave: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders modal with title', () => {
        render(<SleepModal {...defaultProps} />);
        const title = screen.getByRole('heading', { level: 2 });
        expect(title).toHaveTextContent('Log');
        expect(title).toHaveTextContent('Sleep');
    });

    it('has start time and end time labels', () => {
        render(<SleepModal {...defaultProps} />);
        expect(screen.getByText('Start Time')).toBeInTheDocument();
        expect(screen.getByText('End Time')).toBeInTheDocument();
    });

    it('has a notes input field', () => {
        render(<SleepModal {...defaultProps} />);
        expect(screen.getByPlaceholderText('Optional notes...')).toBeInTheDocument();
    });

    it('calls onSave after successful submission', async () => {
        const onSave = vi.fn();
        render(<SleepModal {...defaultProps} onSave={onSave} />);

        const saveBtn = screen.getByRole('button', { name: 'Log Sleep' });
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(api.createSleep).toHaveBeenCalledTimes(1);
            expect(api.createSleep).toHaveBeenCalledWith(expect.objectContaining({
                baby_id: 1,
            }));
        });
        await waitFor(() => {
            expect(onSave).toHaveBeenCalledTimes(1);
        });
    });

    it('calls onClose when close button clicked', () => {
        const onClose = vi.fn();
        render(<SleepModal {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByText('×'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Cancel button clicked', () => {
        const onClose = vi.fn();
        render(<SleepModal {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows edit mode when editEvent provided', () => {
        const editEvent = {
            id: 77,
            time: '2025-01-15T22:00:00',
            details: {
                end_time: '2025-01-16T06:30:00',
                notes: 'Slept well',
            },
        };

        render(<SleepModal {...defaultProps} editEvent={editEvent} />);

        // Title should show "Edit" instead of "Log"
        expect(screen.getByText(/Edit/)).toBeInTheDocument();

        // Save button should say "Save Changes" in edit mode
        expect(screen.getByText('Save Changes')).toBeInTheDocument();

        // Notes should be pre-filled
        const notesInput = screen.getByPlaceholderText('Optional notes...');
        expect(notesInput).toHaveValue('Slept well');
    });

    it('calls updateSleep when editing an existing event', async () => {
        const onSave = vi.fn();
        const editEvent = {
            id: 77,
            time: '2025-01-15T22:00:00',
            details: {
                end_time: '2025-01-16T06:30:00',
                notes: 'Good night',
            },
        };

        render(<SleepModal {...defaultProps} onSave={onSave} editEvent={editEvent} />);

        const saveBtn = screen.getByText('Save Changes');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(api.updateSleep).toHaveBeenCalledTimes(1);
            expect(api.updateSleep).toHaveBeenCalledWith(77, expect.objectContaining({
                baby_id: 1,
            }));
        });
        await waitFor(() => {
            expect(onSave).toHaveBeenCalledTimes(1);
        });
    });
});
