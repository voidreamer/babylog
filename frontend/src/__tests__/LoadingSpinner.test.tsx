import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders full page spinner by default', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.loading')).toBeInTheDocument();
    expect(container.querySelector('.loading-logo')).toBeInTheDocument();
  });

  it('renders provided text', () => {
    render(<LoadingSpinner text="Loading babies..." />);
    expect(screen.getByText('Loading babies...')).toBeInTheDocument();
  });

  it('renders inline spinner when fullPage is false', () => {
    const { container } = render(<LoadingSpinner fullPage={false} />);
    expect(container.querySelector('.loading')).not.toBeInTheDocument();
    expect(container.querySelector('.loading-inline')).toBeInTheDocument();
    expect(container.querySelector('.loading-logo')).toBeInTheDocument();
  });

  it('renders a random cute message when no text provided', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.loading-text')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { container, rerender } = render(<LoadingSpinner size="sm" text="Small" />);
    const img = container.querySelector('.loading-logo') as HTMLImageElement;
    expect(img.style.width).toBe('48px');
    expect(screen.getByText('Small')).toBeInTheDocument();
    rerender(<LoadingSpinner size="lg" text="Large" />);
    const imgLg = container.querySelector('.loading-logo') as HTMLImageElement;
    expect(imgLg.style.width).toBe('112px');
    expect(screen.getByText('Large')).toBeInTheDocument();
  });
});
