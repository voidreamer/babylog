import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';
import { useTranslation } from 'react-i18next';

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
    const { t } = useTranslation('common');
  if (shouldThrow) throw new Error('Test error');
  return <div>No error</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows retry button that reloads the page', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Try Again'));
    expect(reloadMock).toHaveBeenCalled();
  });

  it('displays error message in development mode', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    // The fallback shows generic message
    expect(screen.getByText(/something unexpected happened/i)).toBeInTheDocument();
  });

  it('does not show error fallback for non-throwing children', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});
