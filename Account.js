import React, { useState } from 'react';
import legal from './legal.json';
import { PatientAvatar, PatientPhotoEditor } from './PatientPhoto';
import { Linking, Pressable, View, useWindowDimensions } from 'react-native';
import { useSession, useData, useAction } from './api';
import { T, Page, Card, Btn, Notice, Status, Avatar, Check, LabelRow, Sheet, Field, Icon, s, colors, spacing } from './ui';
import { dateTime, dateShort, formatNotificationMessage } from './format';
export function Profile({ navigation }) {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const nameAction = useAction();
  const { width, fontScale } = useWindowDimensions();
  const { user, end, large, toggleSize, call, updateName } = useSession(),
    patients = useData('/patients'),
    prefs = useData('/privacy/notification-preferences'),
    action = useAction();
  const holder = patients.data?.find(p => p.isHolder);
  const stacked = width < 360 || fontScale * (large ? 1.16 : 1) > 1.3;
  function openName() {
    nameAction.clear();
    setNameDraft(user.name);
    setNameOpen(true);
  }
  function saveName() {
    nameAction.run(async () => {
      const name = nameDraft.trim();
      if (name.length < 3 || name.length > 120) throw Error('Informe um nome entre 3 e 120 caracteres.');
      await updateName(name);
      patients.reload();
      setNameOpen(false);
    });
  }
  return (
    <Page>
      <T type="title">Meu perfil</T>
      <Card>
        <View style={[s.row, stacked && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={holder?.photoVersion ? 'Alterar foto de perfil' : 'Adicionar foto de perfil'}
            accessibilityState={{ disabled: !holder }} disabled={!holder}
            onPress={() => setPhotoOpen(true)}
            style={({ pressed }) => ({ width: 72, height: 72, opacity: !holder ? 0.6 : pressed ? 0.8 : 1 })}>
            <PatientAvatar patient={holder} name={user.name} size={72} />
            <View pointerEvents="none" style={{ position: 'absolute', right: -2, bottom: -2,
              width: 25, height: 25, borderRadius: 12.5, backgroundColor: colors.brand,
              borderColor: colors.card, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="Pencil" color="white" size={12} />
            </View>
          </Pressable>
          <View style={{ flex: stacked ? undefined : 1, minWidth: 0, alignSelf: 'stretch', justifyContent: 'center' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Editar nome completo" onPress={openName}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: spacing.sm, opacity: pressed ? 0.75 : 1 })}>
              <T type="heading" style={{ flex: 1 }}>{user.name}</T>
              <Icon name="Pencil" size={17} />
            </Pressable>
          </View>
        </View>
        <View style={{ paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line }}>
          <T type="small" color={colors.muted} selectable>{user.email}</T>
        </View>
        {!!patients.error && <Notice error>{patients.error}</Notice>}
        {!!patients.error && <Btn kind="link" onPress={patients.reload}>Tentar novamente</Btn>}
      </Card>
      {photoOpen && !!holder && <PatientPhotoEditor patient={holder} onClose={() => setPhotoOpen(false)} onChanged={patients.reload} />}
      <Sheet visible={nameOpen} title="Editar nome completo" onClose={() => { if (!nameAction.busy) setNameOpen(false); }}>
        <T type="small" color={colors.muted}>Informe seu nome completo conforme o documento de identificação.</T>
        <Field label="Nome completo" value={nameDraft} onChangeText={setNameDraft}
          autoCapitalize="words" maxLength={120} editable={!nameAction.busy} />
        <Notice error>{nameAction.error}</Notice>
        <Btn disabled={nameAction.busy || nameDraft.trim().length < 3 || nameDraft.trim() === user.name} onPress={saveName}>
          {nameAction.busy ? 'Salvando…' : 'Salvar nome'}
        </Btn>
        <Btn kind="link" disabled={nameAction.busy} onPress={() => setNameOpen(false)}>Cancelar</Btn>
      </Sheet>
      <Btn kind="outline" icon="Users" onPress={() => navigation.navigate('Dependentes')}>
        Você e seus dependentes
      </Btn>
      <Btn kind="outline" icon="Bell" onPress={() => navigation.navigate('Notificações')}>
        Notificações
      </Btn>
      <Card>
        <T type="heading">Preferências</T>
        <Check value={large} onChange={toggleSize}>
          Texto ampliado
        </Check>
        <Status result={prefs} />
        {prefs.data &&
          Object.entries({
            emailEnabled: 'Receber e-mails',
            appointmentReminders: 'Lembretes de consulta',
            campaignUpdates: 'Novidades sobre campanhas',
          }).map(([k, label]) => (
            <Check
              key={k}
              value={prefs.data[k]}
              onChange={(v) =>
                action.run(async () => {
                  await call('/privacy/notification-preferences', {
                    method: 'PATCH',
                    body: { [k]: v },
                  });
                  prefs.reload();
                })
              }
            >
              {label}
            </Check>
          ))}
        <Notice error>{action.error}</Notice>
      </Card>
      <Btn kind="outline" icon="ShieldCheck" onPress={() => setPrivacyOpen(true)}>
        Política de Privacidade
      </Btn>
      <Btn kind="outline" icon="LogOut" onPress={end}>
        Sair da conta
      </Btn>
      <Sheet title="Política de Privacidade" visible={privacyOpen} onClose={() => setPrivacyOpen(false)}>
        {legal['Política de Privacidade'].map((line, i) => (
          <T key={i} type={line.heading ? 'bold' : 'body'}>{line.text}</T>
        ))}
        <Btn onPress={() => setPrivacyOpen(false)}>Fechar</Btn>
      </Sheet>
    </Page>
  );
}
export function Campaigns() {
  const list = useData('/campaigns'),
    action = useAction();
  return (
    <Page>
      <T type="title">Campanhas de saúde</T>
      <T color={colors.muted}>Ações de vacinação e prevenção com fonte oficial conferida.</T>
      <Status result={list} />
      <Notice error>{action.error}</Notice>
      {list.data?.map((c) => (
        <Card key={c.id} style={{ padding: 0, overflow: 'hidden' }}>
          <View style={[s.hero, { borderRadius: 0 }]}>
            <T type="small" color="white">
              {c.type === 'VACINACAO' ? 'Vacinação' : 'Prevenção'}
            </T>
            <T type="heading" color="white">
              {c.title}
            </T>
            <T color="white">{c.agency}</T>
          </View>
          <View style={{ padding: 15, gap: 8 }}>
            <LabelRow icon="CalendarDays">
              {dateShort(c.startsAt)} a {dateShort(c.endsAt)}
            </LabelRow>
            <LabelRow icon="Users">{c.targetAudience}</LabelRow>
            <LabelRow icon="MapPin">{c.location}</LabelRow>
            <T>O que levar: {c.requirements}</T>
            {/^https?:\/\//i.test(c.sourceUrl) && (
              <Btn kind="outline" onPress={() => action.run(() => Linking.openURL(c.sourceUrl))}>
                Fonte oficial
              </Btn>
            )}
          </View>
        </Card>
      ))}
      {list.data?.length === 0 && <Notice>Nenhuma campanha ativa na sua região.</Notice>}
    </Page>
  );
}
export function Notifications() {
  const list = useData('/notifications?limit=50'),
    action = useAction(),
    { call } = useSession();
  const mark = (path) =>
    action.run(async () => {
      await call(path, { method: 'PATCH' });
      list.reload();
    });
  return (
    <Page>
      <T type="title">Notificações</T>
      <Status result={list} />
      <Notice error>{action.error}</Notice>
      {list.data?.some((n) => !n.readAt) && (
        <Btn
          icon="CheckCheck"
          disabled={action.busy}
          kind="outline"
          onPress={() => mark('/notifications/read-all')}
        >
          Marcar todas como lidas
        </Btn>
      )}
      {list.data?.map((n) => (
        <Card key={n.id} style={!n.readAt && { borderLeftWidth: 4, borderLeftColor: colors.brand }}>
          <T type="heading">{n.title}</T>
          <T>{formatNotificationMessage(n.message)}</T>
          <T type="small">{dateTime(n.createdAt)}</T>
          {!n.readAt && (
            <Btn
              kind="link"
              disabled={action.busy}
              onPress={() => mark('/notifications/' + n.id + '/read')}
            >
              Marcar como lida
            </Btn>
          )}
        </Card>
      ))}
      {list.data?.length === 0 && <Notice>Nenhuma notificação.</Notice>}
    </Page>
  );
}
