// Only persist whitelisted routes, not form inputs or booking payloads.
const tabs = ['Início', 'Buscar', 'Agenda', 'Campanhas', 'Perfil'];
const simple = ['Dependentes', 'Notificações'];

function doctorParams(params) {
  if (typeof params?.id !== 'string' || !params.id || params.id.length > 128) return null;
  const result = { id: params.id };
  for (const key of ['clinic', 'serviceId', 'preferredDay']) {
    if (typeof params[key] === 'string' && params[key].length <= 128) result[key] = params[key];
  }
  return result;
}

export function snapshot(state, userId) {
  if (!userId || !Array.isArray(state?.routes)) return null;
  const routes = state.routes.slice(0, (state.index ?? state.routes.length - 1) + 1);
  const main = routes.find((route) => route.name === 'Principal');
  const tab = main?.state?.routes?.[main.state.index ?? 0]?.name;
  const screens = [];
  for (const route of routes) {
    if (route.name === 'Médico') {
      const params = doctorParams(route.params);
      if (params) screens.push({ name: route.name, params });
    } else if (simple.includes(route.name)) {
      screens.push({ name: route.name });
    } else if (route.name === 'Revisar' || route.name === 'Agendado') {
      // Never restore an old review/confirmation or its slot/patient data.
      break;
    }
  }
  return { version: 1, userId, tab: tabs.includes(tab) ? tab : 'Início', screens: screens.slice(-4) };
}

export function restoreSnapshot(saved, userId) {
  if (saved?.version !== 1 || saved.userId !== userId || !tabs.includes(saved.tab) ||
      !Array.isArray(saved.screens) || saved.screens.length > 4) return undefined;
  const routes = [{ name: 'Principal', state: { index: tabs.indexOf(saved.tab), routes: tabs.map(name => ({ name })) } }];
  for (const screen of saved.screens) {
    if (screen?.name === 'Médico') {
      const params = doctorParams(screen.params);
      if (!params) return undefined;
      routes.push({ name: 'Médico', params });
    } else if (simple.includes(screen?.name)) routes.push({ name: screen.name });
    else return undefined;
  }
  return { index: routes.length - 1, routes };
}
