import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WidgetSettings from '../components/WidgetSettings';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
    div: ({ children, className, onClick, ...props }: any) => (
      <div className={className} onClick={onClick}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('WidgetSettings', () => {
  const defaultProps = {
    visibleWidgets: ['feeding', 'diaper', 'sleep'],
    onToggle: vi.fn(),
    quickActionsEnabled: true,
    onToggleQuickActions: vi.fn(),
  };

  it('renders the settings button', () => {
    render(<WidgetSettings {...defaultProps} />);
    expect(screen.getByText('Edit Activities')).toBeInTheDocument();
  });

  it('shows hidden count', () => {
    render(<WidgetSettings {...defaultProps} />);
    // 8 total widgets - 3 visible = 5 hidden
    expect(screen.getByText('5 hidden')).toBeInTheDocument();
  });

  it('shows "All visible" when all widgets enabled', () => {
    render(<WidgetSettings {...defaultProps} visibleWidgets={['feeding', 'diaper', 'sleep', 'pumping', 'potty', 'tummy', 'bath', 'supplement']} />);
    expect(screen.getByText('All visible')).toBeInTheDocument();
  });

  it('opens modal on click', () => {
    render(<WidgetSettings {...defaultProps} />);
    fireEvent.click(screen.getByText('Edit Activities'));
    expect(screen.getByText('Dashboard Activities')).toBeInTheDocument();
  });

  it('shows all widget options in modal', () => {
    render(<WidgetSettings {...defaultProps} />);
    fireEvent.click(screen.getByText('Edit Activities'));
    expect(screen.getByText('Feeding')).toBeInTheDocument();
    expect(screen.getByText('Diaper')).toBeInTheDocument();
    expect(screen.getByText('Sleep')).toBeInTheDocument();
    expect(screen.getByText('Pumping')).toBeInTheDocument();
    expect(screen.getByText('Potty')).toBeInTheDocument();
    expect(screen.getByText('Bath')).toBeInTheDocument();
  });

  it('calls onToggle when widget is clicked', () => {
    const onToggle = vi.fn();
    render(<WidgetSettings {...defaultProps} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Edit Activities'));
    fireEvent.click(screen.getByText('Pumping'));
    expect(onToggle).toHaveBeenCalledWith('pumping');
  });

  it('shows quick actions toggle', () => {
    render(<WidgetSettings {...defaultProps} />);
    fireEvent.click(screen.getByText('Edit Activities'));
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });
});
