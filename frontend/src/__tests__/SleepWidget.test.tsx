import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SleepWidget from '../components/SleepWidget';
import { mockSleep, mockCurrentSleep } from '../test/mocks';

const mockApi = {
  createSleep: vi.fn().mockResolvedValue({ id: 1 }),
  endSleep: vi.fn().mockResolvedValue({ id: 2 }),
};

vi.mock('../api/client', () => ({ api: mockApi }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('SleepWidget', () => {
  const baseProps = {
    babyId: 1,
    currentSleep: null as any,
    lastSleep: mockSleep,
    onSleepChange: vi.fn(),
    onOpenModal: vi.fn(),
  };

  it('renders sleep widget', () => {
    render(<SleepWidget {...baseProps} />);
    expect(screen.getByText('Sleep')).toBeInTheDocument();
  });

  it('shows Start Sleep button when not sleeping', () => {
    render(<SleepWidget {...baseProps} />);
    expect(screen.getByText('Start Sleep')).toBeInTheDocument();
  });

  it('shows Wake Up button when sleeping', () => {
    render(<SleepWidget {...baseProps} currentSleep={mockCurrentSleep} />);
    expect(screen.getByText('Wake Up')).toBeInTheDocument();
  });

  it('shows Sleeping label when sleeping', () => {
    render(<SleepWidget {...baseProps} currentSleep={mockCurrentSleep} />);
    expect(screen.getByText('Sleeping')).toBeInTheDocument();
  });

  it('calls createSleep when Start Sleep is clicked', async () => {
    render(<SleepWidget {...baseProps} />);
    fireEvent.click(screen.getByText('Start Sleep'));
    await waitFor(() => {
      expect(mockApi.createSleep).toHaveBeenCalled();
    });
  });

  it('calls endSleep when Wake Up is clicked', async () => {
    render(<SleepWidget {...baseProps} currentSleep={mockCurrentSleep} />);
    fireEvent.click(screen.getByText('Wake Up'));
    await waitFor(() => {
      expect(mockApi.endSleep).toHaveBeenCalledWith(mockCurrentSleep.id);
    });
  });

  it('calls onOpenModal on widget click', () => {
    const onOpenModal = vi.fn();
    render(<SleepWidget {...baseProps} onOpenModal={onOpenModal} />);
    fireEvent.click(screen.getByText('Sleep').closest('.widget')!);
    expect(onOpenModal).toHaveBeenCalled();
  });
});
