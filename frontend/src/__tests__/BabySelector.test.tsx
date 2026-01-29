import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BabySelector from '../components/BabySelector';
import { mockUseBaby, mockBaby, mockBaby2 } from '../test/mocks';

vi.mock('../hooks/useBaby', () => ({
  useBaby: () => mockUseBaby,
}));

vi.mock('../api/client', () => ({
  api: {
    createBaby: vi.fn().mockResolvedValue({ id: 3, name: 'New' }),
    createGrowthRecord: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock ShareModal and AddBabyForm
vi.mock('../components/ShareModal', () => ({
  default: ({ onClose }: any) => <div data-testid="share-modal"><button onClick={onClose}>Close Share</button></div>,
}));

vi.mock('../components/AddBabyForm', () => ({
  default: ({ onSubmit, onCancel }: any) => (
    <div data-testid="add-baby-form">
      <button onClick={() => onSubmit({ name: 'Test' })}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe('BabySelector', () => {
  it('renders selected baby name', () => {
    render(<BabySelector />);
    expect(screen.getByText('Luna')).toBeInTheDocument();
  });

  it('shows dropdown on click', () => {
    render(<BabySelector />);
    fireEvent.click(screen.getByText('Luna'));
    expect(screen.getByText('Max')).toBeInTheDocument();
  });

  it('shows baby initial in avatar', () => {
    render(<BabySelector />);
    expect(screen.getByText('L')).toBeInTheDocument(); // Luna's initial
  });

  it('allows selecting another baby', () => {
    render(<BabySelector />);
    fireEvent.click(screen.getByText('Luna'));
    fireEvent.click(screen.getByText('Max'));
    expect(mockUseBaby.selectBaby).toHaveBeenCalledWith(mockBaby2);
  });

  it('shows add another baby option in dropdown', () => {
    render(<BabySelector />);
    fireEvent.click(screen.getByText('Luna'));
    expect(screen.getByText('+ Add Another Baby')).toBeInTheDocument();
  });

  it('shows add baby button when no babies', () => {
    const emptyMock = { ...mockUseBaby, babies: [], selectedBaby: null };
    vi.mocked(require('../hooks/useBaby').useBaby).mockReturnValueOnce(emptyMock);
    // Re-mock for empty state
    vi.doMock('../hooks/useBaby', () => ({ useBaby: () => emptyMock }));
  });
});
