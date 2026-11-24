import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Linking, Pressable, ScrollView, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useSession, useAction, useData } from './api';
import {
  T,
  Page,
  Card,
  Btn,
  Chip,
  Check,
  Notice,
  Status,
  Avatar,
  Icon,
  LabelRow,
  s,
  colors,
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
    [chosenDay, setDay] = useState(null);
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
            <View style={s.row}>
              <Avatar url={doc.photoUrl} name={doc.name} size={70} />
              <View style={{ flex: 1 }}>
                <T type="title">{doc.name}</T>
                <T>{doc.specialty?.name}</T>
              </View>
            </View>
            {doc.crm && (
              <View style={s.soft}>
                <LabelRow icon="ShieldCheck">
                  CRM {doc.crm}/{doc.crmState} · registro conferido
                </LabelRow>
              </View>
            )}
            {doc.bio && <T>{doc.bio}</T>}
          </Card>
          <T type="heading">Locais de atendimento</T>
          {doc.clinics.map((c) => (
            <Card key={c.id}>
              <LabelRow icon="MapPin">{c.name}</LabelRow>
              <T>{[c.address, c.neighborhood, c.city].filter(Boolean).join(' · ')}</T>
              <Btn kind="link" icon="Navigation" onPress={() => openMap(c)}>
                Como chegar
              </Btn>
            </Card>
          ))}
          <Notice error>{maps.error}</Notice>
          <T type="heading">Escolha o atendimento</T>
          {services.length === 0 && <Notice>Nenhum atendimento disponível.</Notice>}
          {services.map((v) => (
            <Pressable
              key={v.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: service.id === v.id }}
              style={[
                s.card,
                service.id === v.id && { borderColor: colors.brand, backgroundColor: colors.soft },
              ]}
              onPress={() => {
                setSelected(v.id);
                setDay(null);
              }}
            >
              <View style={s.row}>
                <Icon name={v.modality === 'REMOTE' ? 'Video' : 'Stethoscope'} />
                <T type="bold" style={{ flex: 1 }}>
                  {v.name}
                </T>
                {service.id === v.id && <Icon name="Check" />}
              </View>
              <T type="small">
                {[
                  modalityLabel[v.modality],
                  v.durationMinutes + ' min',
                  money(v.priceCents),
                  doc.clinics.find((c) => c.id === v.clinicId)?.name,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </T>
            </Pressable>
          ))}
          {service && (
            <Card>
              <T type="heading">Horários disponíveis</T>
              <Status result={slots} />
              {days.length > 0 && (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {days.map((d) => {
                      const iso = byDay[d][0].startsAt;
                      const day =
                        d === todayKey()
                          ? 'Hoje'
                          : d === tomorrowKey()
                            ? 'Amanhã'
                            : new Date(iso).toLocaleDateString('pt-BR', {
                                timeZone: 'America/Recife',
                                weekday: 'short',
                                day: '2-digit',
                                month: '2-digit',
                              });
                      return (
                        <Chip key={d} active={d === active} onPress={() => setDay(d)}>
                          {day + ' · ' + byDay[d].length}
                        </Chip>
                      );
                    })}
                  </ScrollView>
                  <T>{dateLong(byDay[active][0].startsAt)}</T>
                  <View style={s.wrap}>
                    {byDay[active].map((slot) => (
                      <Chip key={slot.id} onPress={() => review(slot)}>
                        {time(slot.startsAt)}
                      </Chip>
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
