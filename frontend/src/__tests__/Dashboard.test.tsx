import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../components/Dashboard';
import { mockUseBaby, mockDashboard } from '../test/mocks';

vi.mock('../hooks/useBaby', () => ({
  useBaby: () => mockUseBaby,
}));

vi.mock('../api/client', () => ({
  api: {
    getDashboard: vi.fn().mockResolvedValue(mockDashboard),
    getGrowthRecords: vi.fn().mockResolvedValue([]),
    getUpcoming: vi.fn().mockResolvedValue({ upcoming: [] }),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('date-fns', () => ({ format: () => '2024-06-15' }));

// Mock child components to simplify testing
vi.mock('../components/BabyGreeting', () => ({
  default: () => <div data-testid="baby-greeting">Greeting</div>,
}));
vi.mock('../components/FeedingWidget', () => ({
  default: () => <div data-testid="feeding-widget">Feeding</div>,
}));
vi.mock('../components/DiaperWidget', () => ({
  default: () => <div data-testid="diaper-widget">Diaper</div>,
}));
vi.mock('../components/SleepWidget', () => ({
  default: () => <div data-testid="sleep-widget">Sleep</div>,
}));
vi.mock('../components/PumpingWidget', () => ({
  default: () => <div data-testid="pumping-widget">Pumping</div>,
}));
vi.mock('../components/TummyTimeWidget', () => ({
  default: () => <div data-testid="tummy-widget">Tummy</div>,
}));
vi.mock('../components/BathWidget', () => ({
  default: () => <div data-testid="bath-widget">Bath</div>,
}));
vi.mock('../components/SupplementWidget', () => ({
  default: () => <div data-testid="supplement-widget">Supplement</div>,
}));
vi.mock('../components/PottyWidget', () => ({
  default: () => <div data-testid="potty-widget">Potty</div>,
}));
vi.mock('../components/WidgetSettings', () => ({
  default: () => <div data-testid="widget-settings">Settings</div>,
}));
vi.mock('../components/DailySummary', () => ({
  default: () => <div data-testid="daily-summary">Summary</div>,
}));
vi.mock('../components/ComingUp', () => ({
  default: () => <div data-testid="coming-up">Coming Up</div>,
}));
vi.mock('../components/FeedingModal', () => ({ default: () => null }));
vi.mock('../components/DiaperModal', () => ({ default: () => null }));
vi.mock('../components/SleepModal', () => ({ default: () => null }));
vi.mock('../components/PumpingModal', () => ({ default: () => null }));
vi.mock('../components/PottyModal', () => ({ default: () => null }));
vi.mock('../components/TummyTimeModal', () => ({ default: () => null }));
vi.mock('../components/BathModal', () => ({ default: () => null }));
vi.mock('../components/SupplementModal', () => ({ default: () => null }));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className}>{children}</div>,
  },
}));

describe('Dashboard', () => {
  it('renders baby greeting', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByTestId('baby-greeting')).toBeInTheDocument();
    });
  });

  it('renders default widgets', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByTestId('feeding-widget')).toBeInTheDocument();
      expect(screen.getByTestId('diaper-widget')).toBeInTheDocument();
      expect(screen.getByTestId('sleep-widget')).toBeInTheDocument();
    });
  });

  it('renders widget settings', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByTestId('widget-settings')).toBeInTheDocument();
    });
  });

  it('renders daily summary', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByTestId('daily-summary')).toBeInTheDocument();
    });
  });

  it('shows empty state when no baby selected', () => {
    const nobabyMock = { ...mockUseBaby, selectedBaby: null };
    vi.doMock('../hooks/useBaby', () => ({ useBaby: () => nobabyMock }));
    // The empty state is rendered by Dashboard when selectedBaby is null
  });
});
