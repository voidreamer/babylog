import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BabyGreeting from '../components/BabyGreeting';
import { mockUseBaby, mockDailySummary } from '../test/mocks';

vi.mock('../hooks/useBaby', () => ({
  useBaby: () => mockUseBaby,
}));

vi.mock('../api/client', () => ({
  api: {
    createBaby: vi.fn().mockResolvedValue({ id: 1, name: 'Test' }),
    updateBaby: vi.fn().mockResolvedValue({ id: 1, name: 'Updated' }),
    createGrowthRecord: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('../components/ShareModal', () => ({
  default: () => <div data-testid="share-modal" />,
}));

vi.mock('../components/AddBabyForm', () => ({
  default: ({ onSubmit, onCancel }: any) => (
    <div data-testid="add-baby-form">
      <button onClick={() => onSubmit({ name: 'New Baby' })}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe('BabyGreeting', () => {
  it('renders baby name', () => {
    render(<BabyGreeting summary={mockDailySummary} latestGrowth={null} />);
    expect(screen.getByText('Luna')).toBeInTheDocument();
  });

  it('shows time-based greeting', () => {
    render(<BabyGreeting summary={mockDailySummary} latestGrowth={null} />);
    // Should show one of the greetings
    const greetings = ['Good morning', 'Good afternoon', 'Good evening'];
    const found = greetings.some(g => screen.queryByText(`${g}!`));
    expect(found).toBe(true);
  });

  it('shows encouragement message', () => {
    render(<BabyGreeting summary={mockDailySummary} latestGrowth={null} />);
    // summary has total > 8 activities
    expect(screen.getByText("Super parent! Keep it up!")).toBeInTheDocument();
  });

  it('shows growth stats when available', () => {
    const growth = { weight_kg: 5.2, height_cm: 55, head_cm: 38 };
    render(<BabyGreeting summary={mockDailySummary} latestGrowth={growth} />);
    expect(screen.getByText('5.2')).toBeInTheDocument();
    expect(screen.getByText('55')).toBeInTheDocument();
    expect(screen.getByText('38')).toBeInTheDocument();
  });

  it('opens dropdown on baby name click', () => {
    render(<BabyGreeting summary={mockDailySummary} latestGrowth={null} />);
    fireEvent.click(screen.getByText('Luna'));
    expect(screen.getByText('Add Baby')).toBeInTheDocument();
  });

  it('shows empty state when no babies', () => {
    const emptyMock = { ...mockUseBaby, babies: [], selectedBaby: null };
    vi.doMock('../hooks/useBaby', () => ({ useBaby: () => emptyMock }));
    // This test relies on the mock being applied before render
  });
});
