import { useEffect, useState } from 'react';

/**
 * Reactive navigator.onLine. The single home for connectivity tracking —
 * useOfflineSync layers sync side-effects on top; UI (Bubsense composer,
 * offline hints) reads it directly.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
