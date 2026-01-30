import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DailySummary from '../components/DailySummary';
import { mockDailySummary, mockUseBaby } from '../test/mocks';
import { useTranslation } from 'react-i18next';

vi.mock('../hooks/useBaby', () => ({
  useBaby: () => mockUseBaby,
}));

vi.mock('../api/client', () => ({
  api: { getDashboard: vi.fn().mockResolvedValue({ daily_summary: null }) },
}));

vi.mock('date-fns', () => ({
  format: () => '2024-06-15',
  subDays: (d: Date) => new Date(d.getTime() - 86400000),
}));

describe('DailySummary', () => {
    const { t } = useTranslation('dashboard');
  it('returns null when no summary', () => {
    const { container } = render(<DailySummary summary={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders daily summary header', () => {
    render(<DailySummary summary={mockDailySummary} />);
    expect(screen.getByText('Daily Summary')).toBeInTheDocument();
  });

  it('shows today and yesterday tabs', () => {
    render(<DailySummary summary={mockDailySummary} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
  });

  it('displays feeding count', () => {
    render(<DailySummary summary={mockDailySummary} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('feedings')).toBeInTheDocument();
  });

  it('displays diaper count', () => {
    render(<DailySummary summary={mockDailySummary} />);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('diapers')).toBeInTheDocument();
  });

  it('formats sleep time correctly', () => {
    render(<DailySummary summary={mockDailySummary} />);
    expect(screen.getByText('3h 0m')).toBeInTheDocument(); // 180 minutes
    expect(screen.getByText('sleep')).toBeInTheDocument();
  });

  it('only shows visible widgets', () => {
    render(<DailySummary summary={mockDailySummary} visibleWidgets={['feeding']} />);
    expect(screen.getByText('feedings')).toBeInTheDocument();
    expect(screen.queryByText('diapers')).not.toBeInTheDocument();
  });
});
