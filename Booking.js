import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Linking, Pressable, View } from 'react-native';
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
  s,
  colors,
  spacing,
} from './ui';
import {
  dateLong,
  time,
  money,
  modalityLabel,
  relationshipLabel,
  dayKey,
  todayKey,
  tomorrowKey,
} from './format';
export default function Doctor({ route, navigation }) {
  const { id, clinic, serviceId, preferredDay } = route.params;
  const profile = useData('/public/professionals/' + id),
    doc = profile.data;
  const [selected, setSelected] = useState(''),
    [chosenDay, setDay] = useState(null),
    [showAllDays, setShowAllDays] = useState(false);
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
    navigation.navigate('Revisar', {
      professional: { id, name: doc.name },
      service,
      location,
      slot,
    });
  }
  return (
    <Page>
      <Status result={profile} />
      {doc && (
        <>
          <Card>
            <View style={[s.row, { gap: spacing.md }]}>
              <Avatar url={doc.photoUrl} name={doc.name} size={72} round />
              <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
                <T type="heading">{doc.name}</T>
                <T color={colors.muted}>{doc.specialty?.name}</T>
              </View>
            </View>
            {doc.crm && (
              <View style={s.soft}>
                <LabelRow icon="ShieldCheck">
                  CRM {doc.crm}/{doc.crmState} · registro conferido
                </LabelRow>
              </View>
            )}
            {doc.bio && <T color={colors.muted}>{doc.bio}</T>}
          </Card>
          <T type="heading">Locais de atendimento</T>
          {doc.clinics.map((c) => (
            <Card key={c.id}>
              <View style={[s.row, { alignItems: 'flex-start' }]}>
                <Icon name="MapPin" size={20} />
                <T type="bold" style={{ flex: 1 }}>{c.name}</T>
              </View>
              <T type="small" color={colors.muted}>{[c.address, c.neighborhood, c.city].filter(Boolean).join(' · ')}</T>
              <ClinicMap name={c.name} latitude={c.latitude} longitude={c.longitude} />
              <Btn kind="link" icon="Navigation" onPress={() => openMap(c)}>
                Como chegar
              </Btn>
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
                setSelected(v.id);
                setDay(null);
                setShowAllDays(false);
              }}
            >
              <View style={s.row}>
                <Icon name={v.modality === 'REMOTE' ? 'Video' : 'Stethoscope'} />
                <T type="bold" style={{ flex: 1 }}>
                  {v.name}
                </T>
                {service.id === v.id && <Icon name="Check" />}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
                <T type="small" color={colors.muted} style={{ flexShrink: 1 }}>
                  {modalityLabel[v.modality]} · {v.durationMinutes} min
                </T>
                <T type="bold" style={{ flexShrink: 1, fontVariant: ['tabular-nums'] }}>{money(v.priceCents)}</T>
              </View>
              <T type="small" color={colors.muted}>{doc.clinics.find((c) => c.id === v.clinicId)?.name}</T>
            </Pressable>
          ))}
          {service && (
            <Card>
              <T type="heading">2. Escolha o horário</T>
              <T type="small" color={colors.muted}>Horário de Recife (UTC−3).</T>
              <Status result={slots} />
              {days.length > 0 && (
                <>
                  <T type="bold">Dias disponíveis</T>
                  <View style={s.wrap}>
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
                          onPress={() => setDay(d)}
                          style={({ pressed }) => ({
                            minWidth: 76, minHeight: 76, padding: spacing.sm, flexShrink: 1, gap: spacing.xs,
                            alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12,
                            borderColor: selectedDay ? colors.brand : colors.line,
                            backgroundColor: selectedDay ? colors.brand : colors.card,
                            opacity: pressed ? 0.76 : 1,
                          })}
                        >
                          <T type="small" color={selectedDay ? 'white' : colors.muted}>{day}</T>
                          <T type="heading" color={color} style={{ fontVariant: ['tabular-nums'] }}>{d.slice(8)}/{d.slice(5, 7)}</T>
                          <T type="small" color={selectedDay ? 'white' : colors.muted}>{count} {count === 1 ? 'vaga' : 'vagas'}</T>
                        </Pressable>
                      );
                    })}
                  </View>
                  {days.length > 6 && (
                    <Btn kind="link" onPress={() => setShowAllDays((value) => !value)}>
                      {showAllDays ? 'Mostrar menos datas' : 'Ver todas as datas (' + days.length + ')'}
                    </Btn>
                  )}
                  <View style={{ height: 1, backgroundColor: colors.line, marginVertical: spacing.xs }} />
                  <T type="bold">{dateLong(byDay[active][0].startsAt)}</T>
                  <T type="small" color={colors.muted}>Toque em um horário para revisar a consulta.</T>
                  <View style={s.wrap}>
                    {byDay[active].map((slot) => (
                      <Pressable key={slot.id} accessibilityRole="button"
                        accessibilityLabel={'Agendar às ' + time(slot.startsAt)}
                        onPress={() => review(slot)}
                        style={({ pressed }) => ({
                          minWidth: 72, minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                          borderWidth: 1, borderColor: colors.brand, borderRadius: 9, backgroundColor: pressed ? colors.soft : colors.card,
                          alignItems: 'center', justifyContent: 'center',
                        })}
                      >
                        <T type="bold" color={colors.brand} style={{ fontVariant: ['tabular-nums'] }}>{time(slot.startsAt)}</T>
                      </Pressable>
                    ))}
                  </View>
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
