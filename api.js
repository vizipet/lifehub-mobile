import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { createSessionController } from './session';

const SESSION_KEY = 'lifehub.refreshToken.v1';
const secureStorage = {
  read: () => SecureStore.getItemAsync(SESSION_KEY),
  save: (token) => SecureStore.setItemAsync(SESSION_KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  remove: () => SecureStore.deleteItemAsync(SESSION_KEY),
};

export const Session = React.createContext(null);
export const useSession = () => useContext(Session);
export function apiBase() {
  // Android via USB: adb reverse tcp:3000 tcp:3000.
  return 'http://127.0.0.1:3000/api/v1';
}
export async function request(path, { method = 'GET', token, body, key, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (key) headers['Idempotency-Key'] = key;
  let response;
  try {
    response = await fetch(apiBase() + path, {
      headers,
      method,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    const error = new Error('Sem conexão com o LifeHub. Confira a rede e tente novamente.');
    error.code = 'NETWORK_ERROR';
    throw error;
  }
  // Não confundir a resposta HTML de outro servidor com dados válidos da API.
  let data;
  if (response.status === 204) return {};
  try {
    data = await response.json();
  } catch (err) {
    if (signal?.aborted) throw err;
    const error = new Error('Resposta inválida do LifeHub. Confira se o backend está na porta 3000.');
    error.status = response.status;
    throw error;
  }
  if (!response.ok) {
    const e = new Error([data?.message || 'Falha ao consultar o LifeHub.'].flat().join(' '));
    e.status = response.status;
    throw e;
  }
  return data;
}
export function useAccount() {
  const [state, setState] = useState({ user: null, restoring: true, restoreError: '' });
  const controller = useRef(null);
  if (!controller.current) {
    controller.current = createSessionController({ storage: secureStorage, request, publish: setState });
  }
  const session = controller.current;
  useEffect(() => { session.restore(); }, [session]);
  return { ...state, ...session };
}
export function useData(path) {
  const { call } = useSession();
  const [revision, setRevision] = useState(0),
    [state, setState] = useState({});
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  useFocusEffect(
    useCallback(() => {
      if (!path) return;
      const ctrl = new AbortController();
      let active = true;
      setState((previous) => previous.path === path && previous.revision === revision && previous.error
        ? {} : previous);
      // A leitura pode sofrer uma falha transitória ao trocar de tela.
      // Repetir somente GET e apenas uma vez; nunca repetir mutações.
      async function load() {
        try {
          let res;
          try {
            res = await call(path, { signal: ctrl.signal });
          } catch (err) {
            if (!active || ctrl.signal.aborted) return;
            if (err.code !== 'NETWORK_ERROR' && err.name !== 'AbortError') throw err;
            await new Promise((resolve) => setTimeout(resolve, 350));
            if (!active || ctrl.signal.aborted) return;
            res = await call(path, { signal: ctrl.signal });
          }
          if (!active || ctrl.signal.aborted) return;
          if (!res || !Object.prototype.hasOwnProperty.call(res, 'data')) {
            throw new Error('O LifeHub retornou uma resposta inesperada. Tente novamente.');
          }
          setState({ path, revision, ...res });
        } catch (err) {
          if (active && !ctrl.signal.aborted) setState({ path, revision, error: err.message });
        }
      }
      load();
      return () => {
        active = false;
        ctrl.abort();
      };
    }, [path, revision, call]),
  );
  return { ...(state.path === path && state.revision === revision ? state : {}), reload };
}
export function useAction() {
  const lock = useRef(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function run(task) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { busy, error, run, clear: () => setError('') };
}
