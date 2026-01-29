import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeedingWidget from '../components/FeedingWidget';
import { mockFeeding } from '../test/mocks';

vi.mock('../api/client', () => ({
  api: {
    createFeeding: vi.fn().mockResolvedValue({ id: 1 }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('FeedingWidget', () => {
  const defaultProps = {
    babyId: 1,
    lastFeeding: mockFeeding,
    onFeedingChange: vi.fn(),
    onOpenModal: vi.fn(),
    quickActionsEnabled: true,
  };

  it('renders feeding widget', () => {
    render(<FeedingWidget {...defaultProps} />);
    expect(screen.getByText('Feeding')).toBeInTheDocument();
  });

  it('shows time ago for last feeding', () => {
    render(<FeedingWidget {...defaultProps} />);
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });

  it('shows feeding type detail', () => {
    render(<FeedingWidget {...defaultProps} />);
    expect(screen.getByText(/Breast.*15min/)).toBeInTheDocument();
  });

  it('shows no feedings message when no last feeding', () => {
    render(<FeedingWidget {...defaultProps} lastFeeding={null} />);
    expect(screen.getByText('No feedings yet')).toBeInTheDocument();
  });

  it('calls onOpenModal when widget is clicked', () => {
    const onOpenModal = vi.fn();
    render(<FeedingWidget {...defaultProps} onOpenModal={onOpenModal} />);
    fireEvent.click(screen.getByText('Feeding').closest('.widget')!);
    expect(onOpenModal).toHaveBeenCalled();
  });
});
