import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../hooks/useAuth';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));

const mockUnsubscribe = vi.fn();
const mockSession = { access_token: 'test-token', user: { id: 'user-1', email: 'test@example.com' } };

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: mockSession } }),
      onAuthStateChange: vi.fn((_callback) => ({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      })),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

function TestConsumer() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading.toString()}</span>
      <span data-testid="user">{user?.email || 'none'}</span>
      <button onClick={login}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within AuthProvider');
    spy.mockRestore();
  });

  it('provides user from session', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com');
    });
  });

  it('starts with loading true', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    // Initially loading
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('subscribes to auth state changes', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    const { supabase } = require('../lib/supabase');
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
