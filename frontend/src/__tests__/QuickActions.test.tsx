import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickActions from '../components/QuickActions';

describe('QuickActions', () => {
  const defaultProps = {
    onFeeding: vi.fn(),
    onDiaper: vi.fn(),
    onSleep: vi.fn(),
    onPumping: vi.fn(),
  };

  it('renders all 4 action buttons', () => {
    render(<QuickActions {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
  });

  it('buttons have correct text labels', () => {
    render(<QuickActions {...defaultProps} />);
    expect(screen.getByText('Feeding')).toBeInTheDocument();
    expect(screen.getByText('Diaper')).toBeInTheDocument();
    expect(screen.getByText('Sleep')).toBeInTheDocument();
    expect(screen.getByText('Pump')).toBeInTheDocument();
  });

  it('calls onFeeding when feeding button is clicked', () => {
    const onFeeding = vi.fn();
    render(<QuickActions {...defaultProps} onFeeding={onFeeding} />);
    fireEvent.click(screen.getByText('Feeding'));
    expect(onFeeding).toHaveBeenCalledTimes(1);
  });

  it('calls onDiaper when diaper button is clicked', () => {
    const onDiaper = vi.fn();
    render(<QuickActions {...defaultProps} onDiaper={onDiaper} />);
    fireEvent.click(screen.getByText('Diaper'));
    expect(onDiaper).toHaveBeenCalledTimes(1);
  });

  it('calls onSleep when sleep button is clicked', () => {
    const onSleep = vi.fn();
    render(<QuickActions {...defaultProps} onSleep={onSleep} />);
    fireEvent.click(screen.getByText('Sleep'));
    expect(onSleep).toHaveBeenCalledTimes(1);
  });

  it('calls onPumping when pump button is clicked', () => {
    const onPumping = vi.fn();
    render(<QuickActions {...defaultProps} onPumping={onPumping} />);
    fireEvent.click(screen.getByText('Pump'));
    expect(onPumping).toHaveBeenCalledTimes(1);
  });
});
