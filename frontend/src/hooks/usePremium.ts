import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

interface PremiumState {
  isPremium: boolean;
  plan: string | null;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

let cachedResult: { isPremium: boolean; plan: string | null; expiresAt: string | null; cancelAtPeriodEnd: boolean } | null = null;

export function usePremium(): PremiumState {
  const [isPremium, setIsPremium] = useState(cachedResult?.isPremium ?? localStorage.getItem('isPremium') === 'true');
  const [plan, setPlan] = useState<string | null>(cachedResult?.plan ?? null);
  const [expiresAt, setExpiresAt] = useState<string | null>(cachedResult?.expiresAt ?? null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(cachedResult?.cancelAtPeriodEnd ?? false);
  const [isLoading, setIsLoading] = useState(!cachedResult);

  const refresh = useCallback(async () => {
    try {
      const res = await api.getBillingSubscription();
      cachedResult = {
        isPremium: res.is_premium,
        plan: res.plan,
        expiresAt: res.expires_at,
        cancelAtPeriodEnd: res.cancel_at_period_end,
      };
      setIsPremium(res.is_premium);
      setPlan(res.plan);
      setExpiresAt(res.expires_at);
      setCancelAtPeriodEnd(res.cancel_at_period_end);
      localStorage.setItem('isPremium', String(res.is_premium));
    } catch {
      // keep cached/localStorage value
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cachedResult) refresh();
  }, [refresh]);

  return { isPremium, plan, expiresAt, cancelAtPeriodEnd, isLoading, refresh };
}
