import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DiaperWidget from '../components/DiaperWidget';
import { mockDiaper } from '../test/mocks';

const mockApi = { createDiaper: vi.fn().mockResolvedValue({ id: 1 }) };
vi.mock('../api/client', () => ({ api: mockApi }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('DiaperWidget', () => {
  const baseProps = {
    babyId: 1,
    lastDiaper: mockDiaper,
    onDiaperChange: vi.fn(),
    onOpenModal: vi.fn(),
    quickActionsEnabled: true,
  };

  it('renders diaper widget', () => {
    render(<DiaperWidget {...baseProps} />);
    expect(screen.getByText('Diaper')).toBeInTheDocument();
  });

  it('shows time ago', () => {
    render(<DiaperWidget {...baseProps} />);
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });

  it('shows last diaper type', () => {
    render(<DiaperWidget {...baseProps} />);
    expect(screen.getByText('Pee')).toBeInTheDocument();
  });

  it('shows quick action buttons when enabled', () => {
    render(<DiaperWidget {...baseProps} />);
    expect(screen.getByText('Poo')).toBeInTheDocument();
    expect(screen.getByText('Both')).toBeInTheDocument();
  });

  it('hides quick actions when disabled', () => {
    render(<DiaperWidget {...baseProps} quickActionsEnabled={false} />);
    expect(screen.queryByText('Poo')).not.toBeInTheDocument();
  });

  it('logs quick diaper on button click', async () => {
    render(<DiaperWidget {...baseProps} />);
    // Find the Poo button (it's a quick action button, not the detail text)
    const pooButtons = screen.getAllByText('Poo');
    fireEvent.click(pooButtons[pooButtons.length - 1]); // Click the quick action button
    await waitFor(() => {
      expect(mockApi.createDiaper).toHaveBeenCalledWith(expect.objectContaining({ type: 'poo' }));
    });
  });

  it('calls onOpenModal on widget click', () => {
    const onOpenModal = vi.fn();
    render(<DiaperWidget {...baseProps} onOpenModal={onOpenModal} />);
    fireEvent.click(screen.getByText('Diaper').closest('.widget')!);
    expect(onOpenModal).toHaveBeenCalled();
  });
});
