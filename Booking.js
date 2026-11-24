import React, { useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Linking, Pressable, View, useWindowDimensions } from 'react-native';
import { randomUUID } from 'expo-crypto';
import ClinicMap from './ClinicMap';
import { useSession, useAction, useData } from './api';
import {
  T,
  Page,
  Card,
  Btn,
  Check,
  Notice,
  Status,
  Avatar,
  Icon,
  LabelRow,
  FontScale,
  s,
  colors,
  spacing,
} from './ui';
import {
  dateLong,
  dateShort,
  time,
  money,
  modalityLabel,
  relationshipLabel,
  dayKey,
  todayKey,
  tomorrowKey,
} from './format';
// Equal-width columns with a stable last row; adapt to available space and accessibility text size.
function BookingGrid({ children, minCellWidth }) {
  const [width, setWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const appScale = useContext(FontScale);
  const scale = Math.max(1, fontScale * appScale);
  const min = minCellWidth * scale;
  const columns = width > 0
    ? Math.max(1, Math.min(3, Math.floor((width + spacing.sm) / (min + spacing.sm))))
    : 1;
  const items = React.Children.toArray(children);
  const rows = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={{ gap: spacing.sm }}
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
      {rows.map((row) => (
        <View key={row[0].key} style={{ flexDirection: 'row', gap: spacing.sm }}>
          {row.map((item) => (
            <View key={item.key} style={{ flex: 1, minWidth: 0 }}>{item}</View>
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={'empty-' + i} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}
// Group and sort the server-provided availability in Recife local time.
function periodsForDay(slots) {
  const groups = [
    { name: 'Manhã', slots: [] },
    { name: 'Tarde', slots: [] },
    { name: 'Noite', slots: [] },
  ];
  for (const slot of [...slots].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))) {
    const hour = Number(time(slot.startsAt).split(':')[0]);
    groups[hour < 12 ? 0 : hour < 18 ? 1 : 2].slots.push(slot);
  }
  return groups.filter((group) => group.slots.length);
}
function resolveSelectedSlot(selection, professionalId, serviceId, activeDay, slots, now = Date.now()) {
  if (!selection || selection.professionalId !== professionalId ||
      selection.serviceId !== serviceId || selection.day !== activeDay) return null;
  return slots.find((slot) => slot.id === selection.id && Date.parse(slot.startsAt) > now) || null;
}
export default function Doctor({ route, navigation }) {
  const { id, clinic, serviceId, preferredDay } = route.params;
  const profile = useData('/public/professionals/' + id),
    doc = profile.data;
  const [selected, setSelected] = useState(''),
    [chosenDay, setDay] = useState(null),
    [showAllDays, setShowAllDays] = useState(false),
    [slotChoice, setSlotChoice] = useState(null);
  const { width, fontScale } = useWindowDimensions();
  const appScale = useContext(FontScale);
  const stacked = width < 350 || fontScale * appScale > 1.3;
  const maps = useAction();
  const services = (doc?.services || []).filter((v) => v.isActive !== false);
  const service =
    services.find((v) => v.id === selected) ||
    services.find((v) => v.id === serviceId) ||
    services.find((v) => v.clinicId === clinic) ||
    services[0];
  const slots = useData(
    service
      ? '/public/clinics/' +
          service.clinicId +
          '/availability?professionalId=' +
          id +
          '&serviceId=' +
          service.id +
          '&limit=50'
      : null,
  );
  const byDay = {};
  for (const slot of slots.data || []) {
    const key = dayKey(slot.startsAt);
    (byDay[key] ||= []).push(slot);
  }
  const days = Object.keys(byDay).sort();
  const preferred = preferredDay && dayKey(preferredDay);
  const active = days.includes(chosenDay)
    ? chosenDay
    : days.includes(preferred)
      ? preferred
      : days[0];
  const visibleDays = showAllDays || days.length <= 6
    ? days
    : days.slice(0, 6).includes(active) ? days.slice(0, 6) : [...days.slice(0, 5), active];
  const location = doc?.clinics.find((c) => c.id === service?.clinicId);
  const daySlots = byDay[active] || [];
  const selectedSlot = resolveSelectedSlot(slotChoice, id, service?.id, active, daySlots);
  const periods = periodsForDay(daySlots);
  function openMap(c) {
    maps.run(() => {
      const q =
        c.latitude != null && c.longitude != null
          ? [c.latitude, c.longitude].join(',')
          : [c.address, c.neighborhood, c.city].filter(Boolean).join(', ');
      return Linking.openURL(
        'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q),
      );
    });
  }
  function review(slot) {
    if (!slot || !doc || !service || slots.error ||
        !resolveSelectedSlot(slotChoice, id, service.id, active, daySlots)) return;
    navigation.navigate('Revisar', {
      professional: { id, name: doc.name },
      service,
      location,
      slot,
    });
  }
  return (
    <View style={s.page}>
    <Page>
      <Status result={profile} />
      {doc && (
        <>
          <Card style={{ gap: spacing.lg }}>
            <View style={[s.row, { gap: spacing.md }, stacked && { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <Avatar url={doc.photoUrl} name={doc.name} size={88} round />
              <View style={{ flex: stacked ? undefined : 1, minWidth: 0, alignSelf: 'stretch', justifyContent: 'center', gap: spacing.xs }}>
                <T type="heading" style={{ fontSize: 23 * appScale }}>{doc.name}</T>
                {!!doc.specialty?.name && <T type="bold" color={colors.brand}>{doc.specialty.name}</T>}
              </View>
            </View>
            {!!doc.crm && (
              <View style={{ alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row',
                alignItems: 'center', gap: spacing.xs, backgroundColor: colors.soft,
                paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: 8 }}>
                <Icon name="ShieldCheck" size={17} />
                <T type="small" color={colors.brand} style={{ flexShrink: 1 }}>
                  CRM {doc.crm}/{doc.crmState} · registro conferido
                </T>
              </View>
            )}
            {!!doc.bio?.trim() && (
              <View style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: spacing.md, gap: spacing.sm }}>
                <T type="heading">Sobre o profissional</T>
                <T style={{ lineHeight: 24 * appScale }}>{doc.bio}</T>
              </View>
            )}
          </Card>
          <T type="heading">Locais de atendimento</T>
          {doc.clinics.map((c) => (
            <Card key={c.id}>
              <View style={[s.row, { alignItems: 'flex-start', gap: spacing.sm }]}>
                <Icon name="MapPin" size={22} />
                <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
                  <T type="bold">{c.name}</T>
                  {!!c.address && <T color={colors.ink}>{c.address}</T>}
                  {!!(c.neighborhood || c.city) && (
                    <T type="small" color={colors.muted}>{[c.neighborhood, c.city].filter(Boolean).join(' · ')}</T>
                  )}
                </View>
              </View>
              <ClinicMap
                name={c.name}
                latitude={c.latitude}
                longitude={c.longitude}
                onDirections={() => openMap(c)}
                directionsBusy={maps.busy}
              />
            </Card>
          ))}
          <Notice error>{maps.error}</Notice>
          <T type="heading">1. Escolha o atendimento</T>
          {services.length === 0 && <Notice>Nenhum atendimento disponível.</Notice>}
          {services.map((v) => (
            <Pressable
              key={v.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: service.id === v.id }}
              style={({ pressed }) => [
                s.card,
                { padding: spacing.md, gap: spacing.sm },
                service.id === v.id && { borderColor: colors.brand, backgroundColor: colors.soft },
                { opacity: pressed ? 0.76 : 1 },
              ]}
              onPress={() => {
                if (service.id === v.id) return;
                setSelected(v.id);
                setDay(null);
                setSlotChoice(null);
                setShowAllDays(false);
              }}
            >
              <View style={s.row}>
                <Icon name={v.modality === 'REMOTE' ? 'Video' : 'Stethoscope'} />
                <T type="bold" style={{ flex: 1 }}>
                  {v.name}
                </T>
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1,
                  borderColor: service.id === v.id ? colors.brand : colors.muted,
                  backgroundColor: service.id === v.id ? colors.brand : colors.card,
                  alignItems: 'center', justifyContent: 'center' }}>
                  {service.id === v.id && <Icon name="Check" size={17} color="white" />}
                </View>
              </View>
              <View style={{ flexDirection: stacked ? 'column' : 'row', flexWrap: 'wrap',
                justifyContent: 'space-between', alignItems: stacked ? 'flex-start' : 'center', gap: spacing.sm }}>
                <View style={{ flexShrink: 1, gap: spacing.xs }}>
                  <T type="small" color={colors.muted}>{modalityLabel[v.modality]}</T>
                  <View style={[s.row, { gap: spacing.xs }]}>
                    <Icon name="Clock" size={15} color={colors.muted} />
                    <T type="small" color={colors.muted} style={{ flexShrink: 1 }}>{v.durationMinutes} minutos</T>
                  </View>
                </View>
                <T type="heading" color={colors.brand} style={{ flexShrink: 1, fontVariant: ['tabular-nums'] }}>{money(v.priceCents)}</T>
              </View>
              {!!doc.clinics.find((c) => c.id === v.clinicId)?.name && (
                <View style={[s.row, { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm, gap: spacing.xs }]}>
                  <Icon name="MapPin" size={16} color={colors.muted} />
                  <T type="small" color={colors.muted} style={{ flex: 1 }}>{doc.clinics.find((c) => c.id === v.clinicId)?.name}</T>
                </View>
              )}
            </Pressable>
          ))}
          {service && (
            <Card>
              <T type="heading">2. Escolha o horário</T>
              <T type="small" color={colors.muted}>Horários de Recife.</T>
              <Status result={slots} />
              {days.length > 0 && (
                <>
                  <T type="bold">Dias disponíveis</T>
                  <BookingGrid minCellWidth={82}>
                    {visibleDays.map((d) => {
                      const iso = byDay[d][0].startsAt;
                      const day = d === todayKey() ? 'Hoje' : d === tomorrowKey() ? 'Amanhã'
                        : new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Recife', weekday: 'short' }).replace('.', '');
                      const count = byDay[d].length;
                      const selectedDay = d === active;
                      const color = selectedDay ? 'white' : colors.ink;
                      return (
                        <Pressable key={d} accessibilityRole="radio"
                          accessibilityState={{ checked: selectedDay }}
                          accessibilityLabel={dateLong(iso) + ', ' + count + (count === 1 ? ' horário disponível' : ' horários disponíveis')}
                          onPress={() => {
                            if (d !== active) setSlotChoice(null);
                            setDay(d);
                          }}
                          style={({ pressed }) => ({
                            minHeight: 80, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm, gap: spacing.xs,
                            alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12,
                            borderColor: selectedDay ? colors.brand : colors.line,
                            backgroundColor: selectedDay ? colors.brand : colors.card,
                            opacity: pressed ? 0.76 : 1,
                          })}
                        >
                          <T type="small" color={selectedDay ? 'white' : colors.muted} style={{ textAlign: 'center' }}>{day}</T>
                          <T type="heading" color={color} style={{ fontVariant: ['tabular-nums'] }}>{d.slice(8)}/{d.slice(5, 7)}</T>
                          <T type="small" color={selectedDay ? 'white' : colors.muted} style={{ textAlign: 'center' }}>{count} {count === 1 ? 'vaga' : 'vagas'}</T>
                        </Pressable>
                      );
                    })}
                  </BookingGrid>
                  {days.length > 6 && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: showAllDays }}
                      onPress={() => setShowAllDays((value) => !value)}
                      style={({ pressed }) => ({
                        minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        gap: spacing.sm, borderRadius: 9, borderWidth: 1,
                        borderColor: colors.brand, backgroundColor: pressed ? colors.soft : colors.card,
                      })}
                    >
                      <Icon name="CalendarDays" size={19} />
                      <T type="bold" color={colors.brand} style={{ flexShrink: 1, textAlign: 'center' }}>
                        {showAllDays ? 'Mostrar menos datas' : 'Ver todas as datas (' + days.length + ')'}
                      </T>
                      <View style={{ transform: [{ rotate: showAllDays ? '-90deg' : '90deg' }] }}>
                        <Icon name="ChevronRight" size={18} />
                      </View>
                    </Pressable>
                  )}
                  <View style={{ height: 1, backgroundColor: colors.line, marginVertical: spacing.xs }} />
                  <T type="bold">{dateLong(byDay[active][0].startsAt)}</T>
                  <T type="small" color={colors.muted}>Selecione um horário e toque em Continuar.</T>
                  {periods.map((period, index) => (
                    <View key={period.name} style={{ gap: spacing.sm,
                      ...(index > 0 ? { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.md, marginTop: spacing.xs } : {}) }}>
                      <View style={[s.row, { flexWrap: 'wrap', gap: spacing.xs }]}>
                        <Icon name="Clock" size={17} />
                        <T type="bold" style={{ flex: 1 }}>{period.name}</T>
                        <T type="small" color={colors.muted}>{period.slots.length} {period.slots.length === 1 ? 'horário' : 'horários'}</T>
                      </View>
                      <BookingGrid minCellWidth={76}>
                        {period.slots.map((slot) => {
                          const isSelected = selectedSlot?.id === slot.id;
                          const unavailable = Date.parse(slot.startsAt) <= Date.now();
                          return (
                            <Pressable key={slot.id} accessibilityRole="radio"
                              accessibilityState={{ checked: isSelected, disabled: unavailable }}
                              accessibilityLabel={'Horário das ' + time(slot.startsAt)}
                              disabled={unavailable}
                              onPress={() => setSlotChoice({ id: slot.id, professionalId: id, serviceId: service.id, day: active })}
                              style={({ pressed }) => ({
                                minHeight: 48, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm,
                                borderWidth: 1, borderColor: unavailable ? colors.line : colors.brand, borderRadius: 9,
                                backgroundColor: isSelected ? colors.brand : pressed ? colors.soft : colors.card,
                                opacity: unavailable ? 0.5 : 1,
                                alignItems: 'center', justifyContent: 'center',
                              })}
                            >
                              <T type="bold" color={isSelected ? 'white' : colors.brand} style={{ fontVariant: ['tabular-nums'] }}>{time(slot.startsAt)}</T>
                            </Pressable>
                          );
                        })}
                      </BookingGrid>
                    </View>
                  ))}
                </>
              )}
              {slots.data?.length === 0 && (
                <Notice>Não há horários livres para este atendimento.</Notice>
              )}
            </Card>
          )}
        </>
      )}
    </Page>
    {!!service && (
      <View style={{ backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line }}>
        <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md, gap: spacing.sm, flexDirection: stacked ? 'column' : 'row',
          alignItems: stacked ? 'stretch' : 'center' }}>
          <View style={{ flex: stacked ? undefined : 1, minWidth: 0, gap: spacing.xs }}>
            <T type="small" color={colors.muted} accessibilityLiveRegion="polite">
              {selectedSlot ? dateShort(selectedSlot.startsAt).slice(0, 5) + ' às ' + time(selectedSlot.startsAt) : 'Selecione um horário'}
            </T>
            <T type="heading" style={{ fontVariant: ['tabular-nums'] }}>{money(service.priceCents)}</T>
          </View>
          <Btn disabled={!selectedSlot || !!slots.error} onPress={() => review(selectedSlot)}
            style={{ minHeight: 48, ...(stacked ? {} : { flexShrink: 1, minWidth: 116 }) }}>
            Continuar
          </Btn>
        </View>
      </View>
    )}
    </View>
  );
}
export function Review({ navigation, route }) {
  const { professional, slot, service, location } = route.params,
    patients = useData('/patients'),
    { call } = useSession(),
    action = useAction();
  const [chosen, setChosen] = useState(null),
    [agreement, setAgreement] = useState(false);
  const keys = useRef(new Map());
  const person =
    patients.data?.find((p) => p.id === chosen) ||
    patients.data?.find((p) => p.isHolder) ||
    patients.data?.[0];
  function confirm() {
    if (!person || !agreement) return;
    action.run(async () => {
      if (!keys.current.has(person.id)) keys.current.set(person.id, randomUUID());
      await call('/appointments', {
        method: 'POST',
        key: keys.current.get(person.id),
        body: {
          patientId: person.id,
          professionalId: professional.id,
          clinicId: service.clinicId,
          serviceId: service.id,
          slotId: slot.id,
        },
      });
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Principal' },
          {
            name: 'Agendado',
            params: { doctor: professional.name, name: person.name, start: slot.startsAt },
          },
        ],
      });
    });
  }
  return (
    <Page>
      <T type="title">Revise o agendamento</T>
      <Card>
        <T type="heading">Quem será atendido?</T>
        <Status result={patients} />
        {patients.data?.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: p.id === person?.id }}
            onPress={() => {
              setChosen(p.id);
              setAgreement(false);
            }}
            style={[
              s.row,
              {
                padding: 9,
                borderWidth: 1,
                borderColor: p.id === person?.id ? colors.brand : colors.line,
                borderRadius: 8,
              },
            ]}
          >
            <Icon name={p.id === person?.id ? 'Check' : 'User'} />
            <View style={{ flex: 1 }}>
              <T type="bold">{p.name}</T>
              <T type="small">
                {relationshipLabel[p.relationship]} · {p.age} anos
              </T>
            </View>
          </Pressable>
        ))}
        <Btn kind="link" onPress={() => navigation.navigate('Dependentes')}>
          Adicionar dependente
        </Btn>
      </Card>
      <Card>
        <T type="heading">Resumo da consulta</T>
        <LabelRow icon="Stethoscope">{professional.name}</LabelRow>
        <LabelRow icon="Clock">
          {dateLong(slot.startsAt)} · {time(slot.startsAt)}
        </LabelRow>
        <LabelRow icon="CalendarCheck">
          {service.name} · {modalityLabel[service.modality]} · {service.durationMinutes} min ·{' '}
          {money(service.priceCents)}
        </LabelRow>
        <LabelRow icon="MapPin">
          {[location?.name, location?.address].filter(Boolean).join(' · ')}
        </LabelRow>
      </Card>
      <Notice>O médico receberá o nome e a idade do paciente para o atendimento.</Notice>
      <Check value={agreement} onChange={setAgreement}>
        Confirmo os dados acima e autorizo o compartilhamento do nome e da idade do paciente com o
        médico escolhido.
      </Check>
      <Notice error>{action.error}</Notice>
      <Btn disabled={!agreement || !person || action.busy} onPress={confirm} icon="CalendarCheck">
        {action.busy ? 'Confirmando…' : 'Confirmar agendamento'}
      </Btn>
      <Btn disabled={action.busy} kind="link" onPress={() => navigation.goBack()}>
        Escolher outro horário
      </Btn>
    </Page>
  );
}
export function Success({ route, navigation }) {
  const { name, doctor, start } = route.params,
    scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let mounted = true,
      animation;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (mounted && !reduced) {
          scale.setValue(0.75);
          animation = Animated.spring(scale, { toValue: 1, useNativeDriver: true });
          animation.start();
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
      animation?.stop();
    };
  }, [scale]);
  const home = (screen) =>
    navigation.reset({ index: 0, routes: [{ name: 'Principal', params: { screen } }] });
  return (
    <Page>
      <Card style={{ alignItems: 'center', padding: 24 }}>
        <Animated.View
          style={{
            padding: 16,
            borderRadius: 40,
            backgroundColor: colors.soft,
            transform: [{ scale }],
          }}
        >
          <Icon name="Check" size={36} />
        </Animated.View>
        <T type="title">Consulta agendada!</T>
        <T style={{ textAlign: 'center' }}>
          {name} com {doctor}, em {dateLong(start)}, às {time(start)}.
        </T>
      </Card>
      <Btn icon="CalendarDays" onPress={() => home('Agenda')}>
        Ver na minha agenda
      </Btn>
      <Btn kind="outline" onPress={() => home('Início')}>
        Voltar ao início
      </Btn>
    </Page>
  );
}
