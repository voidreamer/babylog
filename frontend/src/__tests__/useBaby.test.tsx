import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BabyProvider, useBaby } from '../hooks/useBaby';
import { mockBaby } from '../test/mocks';

const mockApi = {
  getBabies: vi.fn().mockResolvedValue([mockBaby]),
  createBaby: vi.fn().mockResolvedValue({ id: 3, name: 'New Baby', birth_date: null, gender: null }),
  deleteBaby: vi.fn().mockResolvedValue(null),
};

vi.mock('../api/client', () => ({ api: mockApi }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function TestConsumer() {
  const { babies, selectedBaby, loading, error, selectBaby, addBaby, removeBaby } = useBaby();
  return (
    <div>
      <span data-testid="loading">{loading.toString()}</span>
      <span data-testid="error">{error || 'none'}</span>
      <span data-testid="count">{babies.length}</span>
      <span data-testid="selected">{selectedBaby?.name || 'none'}</span>
      <button onClick={() => addBaby({ name: 'New' })}>Add</button>
      <button onClick={() => selectedBaby && removeBaby(selectedBaby.id)}>Remove</button>
    </div>
  );
}

describe('useBaby', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getBabies.mockResolvedValue([mockBaby]);
  });

  it('throws when used outside BabyProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useBaby must be used within a BabyProvider');
    spy.mockRestore();
  });

  it('loads babies on mount', async () => {
    render(
      <BabyProvider>
        <TestConsumer />
      </BabyProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });
  });

  it('selects first baby by default', async () => {
    render(
      <BabyProvider>
        <TestConsumer />
      </BabyProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('selected').textContent).toBe('Luna');
    });
  });

  it('handles API error', async () => {
    mockApi.getBabies.mockRejectedValueOnce(new Error('Network error'));
    render(
      <BabyProvider>
        <TestConsumer />
      </BabyProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).not.toBe('none');
    });
  });

  it('sets loading false after load', async () => {
    render(
      <BabyProvider>
        <TestConsumer />
      </BabyProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });
});
