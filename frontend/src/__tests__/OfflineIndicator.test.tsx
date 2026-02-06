import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OfflineIndicator } from '../components/OfflineIndicator';

describe('OfflineIndicator', () => {
  const defaultProps = {
    online: true,
    syncing: false,
    pendingCount: 0,
    onSync: vi.fn(),
  };

  it('returns null when online, no pending, not syncing', () => {
    const { container } = render(<OfflineIndicator {...defaultProps} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows offline message when online=false', () => {
    render(<OfflineIndicator {...defaultProps} online={false} />);
    expect(screen.getByText("You're offline")).toBeInTheDocument();
  });

  it('shows pending count when offline with pendingCount > 0', () => {
    render(
      <OfflineIndicator {...defaultProps} online={false} pendingCount={3} />
    );
    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.getByText(/3 change/)).toBeInTheDocument();
  });

  it('shows syncing message when syncing=true', () => {
    render(
      <OfflineIndicator {...defaultProps} syncing={true} />
    );
    expect(screen.getByText('Syncing changes...')).toBeInTheDocument();
  });

  it('shows sync button when online with pending changes', () => {
    render(
      <OfflineIndicator {...defaultProps} pendingCount={2} />
    );
    expect(screen.getByText(/2 change/)).toBeInTheDocument();
    expect(screen.getByText('Sync now')).toBeInTheDocument();
  });

  it('calls onSync when sync button clicked', () => {
    const onSync = vi.fn();
    render(
      <OfflineIndicator {...defaultProps} pendingCount={1} onSync={onSync} />
    );
    fireEvent.click(screen.getByText('Sync now'));
    expect(onSync).toHaveBeenCalledTimes(1);
  });
});
