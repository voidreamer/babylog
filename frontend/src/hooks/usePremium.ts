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
// Shared across hook instances so several premium gates mounting at once trigger one request
let inflightRefresh: Promise<void> | null = null;

export function usePremium(): PremiumState {
  const [isPremium, setIsPremium] = useState(cachedResult?.isPremium ?? localStorage.getItem('isPremium') === 'true');
  const [plan, setPlan] = useState<string | null>(cachedResult?.plan ?? null);
  const [expiresAt, setExpiresAt] = useState<string | null>(cachedResult?.expiresAt ?? null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(cachedResult?.cancelAtPeriodEnd ?? false);
  const [isLoading, setIsLoading] = useState(!cachedResult);

  const refresh = useCallback(async () => {
    if (!inflightRefresh) {
      inflightRefresh = api.getBillingSubscription()
        .then((res) => {
          cachedResult = {
            isPremium: res.is_premium,
            plan: res.plan,
            expiresAt: res.expires_at,
            cancelAtPeriodEnd: res.cancel_at_period_end,
          };
          try { localStorage.setItem('isPremium', String(res.is_premium)); } catch { /* quota */ }
        })
        .catch(() => { /* keep cached/localStorage value */ })
        .finally(() => { inflightRefresh = null; });
    }
    await inflightRefresh;
    if (cachedResult) {
      setIsPremium(cachedResult.isPremium);
      setPlan(cachedResult.plan);
      setExpiresAt(cachedResult.expiresAt);
      setCancelAtPeriodEnd(cachedResult.cancelAtPeriodEnd);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!cachedResult) refresh();
  }, [refresh]);

  return { isPremium, plan, expiresAt, cancelAtPeriodEnd, isLoading, refresh };
}
