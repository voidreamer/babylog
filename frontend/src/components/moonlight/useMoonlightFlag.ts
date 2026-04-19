import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ui.moonlight';
const CHANGE_EVENT = 'moonlight-flag-change';

function readFlag(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'on';
}

/**
 * Subscribes to the Moonlight UI flag.
 *
 * Source of truth: localStorage('ui.moonlight') === 'on'.
 * Cross-tab updates arrive via the native `storage` event.
 * Same-tab updates require dispatching a `moonlight-flag-change` CustomEvent
 * (see setMoonlightFlag below).
 */
export function useMoonlightFlag(): boolean {
  const [on, setOn] = useState(readFlag);
  useEffect(() => {
    const sync = () => setOn(readFlag());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);
  return on;
}

/** Set the flag and notify same-tab listeners. */
export function setMoonlightFlag(on: boolean) {
  if (on) {
    localStorage.setItem(STORAGE_KEY, 'on');
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
