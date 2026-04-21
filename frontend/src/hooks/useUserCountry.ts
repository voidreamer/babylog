import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  type CountryCode,
  DEFAULT_COUNTRY,
  countryFromLanguage,
  resolveCountry,
} from '../data/vaccineSchedules';

const STORAGE_KEY = 'country';
const EVENT_NAME = 'babylog:country-changed';

type CountryChangedEvent = CustomEvent<CountryCode>;

function readCached(): CountryCode {
  try {
    return resolveCountry(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_COUNTRY;
  }
}

function writeCache(country: CountryCode) {
  try {
    localStorage.setItem(STORAGE_KEY, country);
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

function emit(country: CountryCode) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: country }));
}

/**
 * Returns the user's country and a setter that persists to backend + localStorage.
 *
 * On first mount, fetches `/users/me` and reconciles:
 *   - if server has a country → cache + use it
 *   - if not → seed from current language (fr-CA → 'ca', else 'us') and PATCH
 *
 * Offline / API error → keeps the cached value. All components sharing the hook
 * stay in sync via a window event.
 */
export function useUserCountry(): {
  country: CountryCode;
  setCountry: (c: CountryCode) => Promise<void>;
} {
  const [country, setCountryState] = useState<CountryCode>(readCached);

  useEffect(() => {
    let cancelled = false;

    const listener = (e: Event) => {
      const next = (e as CountryChangedEvent).detail;
      setCountryState(resolveCountry(next));
    };
    window.addEventListener(EVENT_NAME, listener);

    (async () => {
      try {
        const info = await api.getUserInfo();
        if (cancelled) return;
        const serverCountry = info?.country as string | null | undefined;
        if (serverCountry) {
          const resolved = resolveCountry(serverCountry);
          writeCache(resolved);
          setCountryState(resolved);
          return;
        }
        const seed = countryFromLanguage(localStorage.getItem('language'));
        writeCache(seed);
        setCountryState(seed);
        try {
          await api.updateUserCountry(seed);
        } catch {
          // best-effort; hook will retry next load
        }
      } catch {
        // offline or unauthenticated — keep cached value
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener(EVENT_NAME, listener);
    };
  }, []);

  const setCountry = useCallback(async (next: CountryCode) => {
    const resolved = resolveCountry(next);
    writeCache(resolved);
    setCountryState(resolved);
    emit(resolved);
    try {
      await api.updateUserCountry(resolved);
    } catch {
      // leave cache in place; next successful fetch will reconcile
    }
  }, []);

  return { country, setCountry };
}
