// Tokens stay in memory, except the refresh token saved through SecureStore.
export function createSessionController({ storage, request, publish }) {
  let auth = null;
  let revision = 0;
  let queue = Promise.resolve();
  let refreshTask = null;
  let restoreTask = null;
  let logoutTask = null;
  let logoutRequired = false;
  const closed = { user: null, restoring: false, restoreError: '' };
  const loading = { user: null, restoring: true, restoreError: '' };
  const invalid = (error) => error?.status === 401 || error?.status === 403;
  const expired = () => Object.assign(new Error('Sua sessão foi encerrada. Entre novamente.'), { status: 401 });
  function serial(task) {
    const next = queue.then(task);
    queue = next.catch(() => {});
    return next;
  }
  function check(epoch) {
    if (epoch !== revision) throw expired();
  }
  function validateTokens(data) {
    if (typeof data?.accessToken !== 'string' || !data.accessToken ||
        typeof data?.refreshToken !== 'string' || !data.refreshToken) {
      throw new Error('Resposta de autenticação inválida.');
    }
  }
  async function revoke(token) {
    if (token) await request('/auth/logout', { method: 'POST', body: { refreshToken: token } }).catch(() => {});
  }
  async function clearLocal() {
    logoutRequired = true;
    await storage.remove();
    logoutRequired = false;
  }
  async function rotate(token, epoch) {
    const { data } = await request('/auth/refresh', { method: 'POST', body: { refreshToken: token } });
    validateTokens(data);
    if (epoch !== revision) {
      await revoke(data.refreshToken);
      throw expired();
    }
    auth = { ...auth, ...data };
    // The server invalidates the old refresh token on every renewal.
    await storage.save(data.refreshToken);
    check(epoch);
    return auth;
  }
  function restore() {
    if (logoutRequired) return end();
    if (restoreTask) return restoreTask;
    if (auth?.user) return Promise.resolve();
    const epoch = revision;
    publish(loading);
    const task = serial(async () => {
      try {
        check(epoch);
        const token = auth?.refreshToken || await storage.read();
        check(epoch);
        if (!token) { publish(closed); return; }
        await rotate(token, epoch);
        const { data: user } = await request('/users/me', { token: auth.accessToken });
        check(epoch);
        if (!user?.id || user.role !== 'PATIENT') {
          const tokenToRevoke = auth.refreshToken;
          auth = null;
          await clearLocal();
          await revoke(tokenToRevoke);
          check(epoch);
          publish(closed);
          return;
        }
        auth = { ...auth, user };
        publish({ ...closed, user });
      } catch (error) {
        if (epoch !== revision) return;
        if (invalid(error)) {
          auth = null;
          try {
            await clearLocal();
            if (epoch === revision) publish(closed);
          } catch {
            if (epoch === revision) publish({ ...loading, restoreError: 'Não foi possível limpar a sessão salva. Tente novamente.' });
          }
        } else {
          // Keep the saved token (or the newly rotated token in memory).
          // A network outage is not a reason to sign the user out.
          publish({ ...loading, restoreError: 'Não foi possível restaurar sua sessão. Confira a conexão e tente novamente.' });
        }
      }
    });
    restoreTask = task.finally(() => { restoreTask = null; });
    return restoreTask;
  }
  function start(data) {
    validateTokens(data);
    if (!data.user?.id || data.user.role !== 'PATIENT') throw new Error('Entre com uma conta de paciente.');
    const epoch = ++revision;
    return serial(async () => {
      check(epoch);
      try {
        await storage.save(data.refreshToken);
      } catch {
        await revoke(data.refreshToken);
        throw new Error('Não foi possível salvar sua sessão com segurança. Tente novamente.');
      }
      if (epoch !== revision) {
        await revoke(data.refreshToken);
        throw expired();
      }
      auth = { ...data };
      publish({ ...closed, user: data.user });
    });
  }
  function end() {
    if (logoutTask) return logoutTask;
    ++revision;
    const old = auth;
    auth = null;
    logoutRequired = true;
    publish(loading);
    const task = serial(async () => {
      try {
        const token = old?.refreshToken || await storage.read().catch(() => null);
        await clearLocal();
        publish(closed);
        await revoke(token);
      } catch {
        publish({ ...loading, restoreError: 'Não foi possível apagar a sessão salva. Tente novamente.' });
      }
    });
    logoutTask = task.finally(() => { logoutTask = null; });
    return logoutTask;
  }
  function renew(original, epoch) {
    check(epoch);
    if (auth !== original) return Promise.resolve(auth);
    if (refreshTask?.epoch === epoch) return refreshTask.promise;
    const task = serial(async () => {
      check(epoch);
      if (auth !== original) return auth;
      try {
        return await rotate(original.refreshToken, epoch);
      } catch (error) {
        if (epoch === revision && invalid(error)) {
          ++revision;
          auth = null;
          publish(loading);
          try {
            await clearLocal();
            publish(closed);
          } catch {
            publish({ ...loading, restoreError: 'Não foi possível limpar a sessão salva. Tente novamente.' });
          }
        }
        throw error;
      }
    });
    const pending = { epoch, promise: task.finally(() => {
      if (refreshTask === pending) refreshTask = null;
    }) };
    refreshTask = pending;
    return pending.promise;
  }
  async function call(path, options = {}) {
    const original = auth;
    const epoch = revision;
    if (!original?.user) throw expired();
    try {
      const result = await request(path, { ...options, token: original.accessToken });
      check(epoch);
      return result;
    } catch (error) {
      check(epoch);
      if (error.status !== 401 || options.signal?.aborted) throw error;
      await renew(original, epoch);
      check(epoch);
      if (!auth || auth.user?.id !== original.user.id) throw expired();
      if (options.signal?.aborted) throw error;
      const result = await request(path, { ...options, token: auth.accessToken });
      check(epoch);
      return result;
    }
  }
  return { start, end, restore, call };
}
