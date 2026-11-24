const TZ = 'America/Recife';
export const dateTime = (iso) =>
  new Date(iso).toLocaleString('pt-BR', {
    timeZone: TZ,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
const capitalizeFirst = (text) => text.charAt(0).toUpperCase() + text.slice(1);
/** "Segunda-feira, 23 de novembro" (só a primeira letra maiúscula). */
export const dateLong = (iso) =>
  capitalizeFirst(
    new Date(iso).toLocaleDateString('pt-BR', {
      timeZone: TZ,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  );
export const dateShort = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
export const time = (iso) =>
  new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
/** Chave AAAA-MM-DD do dia em Recife, para agrupar horários. */
export const dayKey = (iso) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
export const todayKey = () => dayKey(new Date().toISOString());
export const tomorrowKey = () => dayKey(new Date(Date.now() + 86_400_000).toISOString());
/** "Hoje, 14:30", "Amanhã, 09:00" ou "qui., 27 nov., 10:00". */
export function whenLabel(iso) {
  const key = dayKey(iso);
  if (key === todayKey()) return `Hoje, ${time(iso)}`;
  if (key === tomorrowKey()) return `Amanhã, ${time(iso)}`;
  return dateTime(iso);
}
/** Datas de lembretes persistidos no backend, convertidas para Recife. */
export function notificationDate(iso) {
  const date = new Date(iso);
  if (!Number.isFinite(+date)) return null;
  const weekday = capitalizeFirst(date.toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'long' }));
  const dayMonth = date.toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' });
  return `${weekday}, ${dayMonth}, às ${time(iso)}`;
}
export function formatNotificationMessage(message) {
  if (typeof message !== 'string') return '';
  return message
    .replace(/\bSua consulta de Consulta\b/gi, 'Consulta')
    .replace(/\bconsulta de Consulta\b/g, 'consulta')
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z(?:\s*\(UTC\))?/g,
      (raw) => notificationDate(raw.replace(/\s*\(UTC\)$/, '')) || raw);
}
export const money = (cents) =>
  cents === null || cents === undefined
    ? 'Valor a combinar'
    : (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const modalityLabel = {
  IN_PERSON: 'Presencial',
  REMOTE: 'Teleconsulta',
};
export const relationshipLabel = {
  SELF: 'Titular',
  CHILD: 'Filho(a)',
  SPOUSE: 'Cônjuge',
  PARENT: 'Pai/Mãe',
  SIBLING: 'Irmão(ã)',
  GRANDPARENT: 'Avô/Avó',
  OTHER: 'Outro',
};
export const sexLabel = {
  FEMALE: 'Feminino',
  MALE: 'Masculino',
  OTHER: 'Outro',
  NOT_INFORMED: 'Prefiro não informar',
};
export const appointmentStatusLabel = {
  CONFIRMED: 'Confirmada',
  CANCELLED_BY_PATIENT: 'Cancelada pelo paciente',
  CANCELLED_BY_PROVIDER: 'Cancelada pelo médico',
  COMPLETED: 'Concluída',
};
export const onlyDigits = (value) => value.replace(/\D/g, '');
export function maskCpf(value) {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
export function maskPhone(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
/** Mesma regra do backend: tamanho, repetição e dígitos verificadores. */
export function isValidCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}
export function firstName(name) {
  return name
    .replace(/^(Dra?\.)\s+/i, '$1 ')
    .split(' ')
    .slice(0, /^Dra?\./i.test(name) ? 2 : 1)
    .join(' ');
}
export function initials(name) {
  return name
    .replace(/^Dra?\.\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
