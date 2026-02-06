import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Timeline from '../components/Timeline';
import { mockTimelineEvents } from '../test/mocks';

// Mock Icon component
vi.mock('../components/Icon', () => ({
  default: ({ name, size }: { name: string; size: number }) => <span data-testid={`icon-${name}`} />,
}));

// Mock date-fns format to return predictable output
vi.mock('date-fns', () => ({
  format: (date: Date, fmt: string) => {
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  },
}));

describe('Timeline', () => {
  it('renders empty state when no events', () => {
    render(<Timeline events={[]} />);
    expect(screen.getByText('No events logged today')).toBeInTheDocument();
  });

  it('renders empty state when events is undefined', () => {
    render(<Timeline events={undefined as any} />);
    expect(screen.getByText('No events logged today')).toBeInTheDocument();
  });

  it('renders timeline events', () => {
    render(<Timeline events={mockTimelineEvents} />);
    expect(screen.getByText(/Feeding - Breast/)).toBeInTheDocument();
    expect(screen.getByText(/Diaper - Pee/)).toBeInTheDocument();
  });

  it('shows sleep duration', () => {
    render(<Timeline events={mockTimelineEvents} />);
    expect(screen.getByText(/Sleep - 60min/)).toBeInTheDocument();
  });

  it('renders event icons', () => {
    const { container } = render(<Timeline events={mockTimelineEvents} />);
    expect(container.querySelectorAll('[data-testid^="icon-"]').length).toBeGreaterThanOrEqual(3);
  });

  it('shows feeding details as subtitle', () => {
    const events = [{
      id: 1, event_type: 'feeding',
      time: new Date().toISOString(),
      details: { type: 'bottle', duration_minutes: 10, amount_ml: 120, notes: 'good feed' },
    }];
    render(<Timeline events={events} />);
    expect(screen.getByText(/10min/)).toBeInTheDocument();
  });
});
