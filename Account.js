import React from 'react';
import { Linking, View, useWindowDimensions } from 'react-native';
import { useSession, useData, useAction } from './api';
import { T, Page, Card, Btn, Notice, Status, Avatar, Check, LabelRow, s, colors, spacing } from './ui';
import { dateTime, dateShort, formatNotificationMessage } from './format';
export function Profile({ navigation }) {
  const { width, fontScale } = useWindowDimensions();
  const { user, end, large, toggleSize, call } = useSession(),
    prefs = useData('/privacy/notification-preferences'),
    action = useAction();
  const stacked = width < 360 || fontScale * (large ? 1.16 : 1) > 1.3;
  return (
    <Page>
      <T type="title">Meu perfil</T>
      <Card>
        <View style={[s.row, stacked && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Avatar name={user.name} size={48} round />
          <View style={{ flex: stacked ? undefined : 1, minWidth: 0, alignSelf: 'stretch', justifyContent: 'center' }}>
            <T type="heading">{user.name}</T>
          </View>
        </View>
        <View style={{ paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line }}>
          <T type="small" color={colors.muted} selectable>{user.email}</T>
        </View>
      </Card>
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
      <Btn kind="outline" icon="LogOut" onPress={end}>
        Sair da conta
      </Btn>
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
