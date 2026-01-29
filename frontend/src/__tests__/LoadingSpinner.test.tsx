import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders full page spinner by default', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.loading')).toBeInTheDocument();
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });

  it('renders loading text when provided', () => {
    render(<LoadingSpinner text="Loading babies..." />);
    expect(screen.getByText('Loading babies...')).toBeInTheDocument();
  });

  it('renders inline spinner when fullPage is false', () => {
    const { container } = render(<LoadingSpinner fullPage={false} />);
    expect(container.querySelector('.loading')).not.toBeInTheDocument();
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });

  it('does not render text when not provided', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  it('renders with different sizes', () => {
    const { rerender, container } = render(<LoadingSpinner size="sm" text="Small" />);
    expect(screen.getByText('Small')).toBeInTheDocument();
    rerender(<LoadingSpinner size="lg" text="Large" />);
    expect(screen.getByText('Large')).toBeInTheDocument();
  });
});
