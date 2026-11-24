import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { snapshot, restoreSnapshot } from './navigationSnapshot';

const KEY = 'lifehub.dev.navigation.v1';
let queue = Promise.resolve();
function serial(task) {
  const next = queue.then(task);
  queue = next.catch(() => {});
  return next;
}

export function useDevNavigation(userId, restoring) {
  const [loaded, setLoaded] = useState(null);
  useEffect(() => {
    if (!__DEV__ || restoring) return;
    if (!userId) {
      setLoaded(null);
      serial(() => SecureStore.deleteItemAsync(KEY)).catch(() => {});
      return;
    }
    let active = true;
    serial(async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        return raw ? restoreSnapshot(JSON.parse(raw), userId) : undefined;
      } catch {
        return undefined;
      }
    }).then(initialState => {
      if (active) setLoaded({ userId, initialState });
    });
    return () => { active = false; };
  }, [userId, restoring]);

  const save = useCallback(state => {
    if (!__DEV__ || !userId) return;
    const value = snapshot(state, userId);
    if (value) serial(() => SecureStore.setItemAsync(KEY, JSON.stringify(value), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    })).catch(() => {});
  }, [userId]);

  return {
    ready: !__DEV__ || !userId || loaded?.userId === userId,
    initialState: __DEV__ && loaded?.userId === userId ? loaded?.initialState : undefined,
    onStateChange: __DEV__ && userId ? save : undefined,
  };
}
