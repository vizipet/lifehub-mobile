import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useSession, useData } from './api';
import { Page, Card, T, Btn, Status, Icon, colors, s, spacing } from './ui';
import { todayKey, firstName } from './format';
import { ProviderCard } from './Search';
import { AppointmentCard } from './Agenda';
import { PatientAvatar } from './PatientPhoto';
const shortcuts = [
  ['Clock', 'Consulta hoje', 'Horários livres ainda hoje', 'Buscar'],
  ['Search', 'Buscar médico', 'Por especialidade ou nome', 'Buscar'],
  ['CalendarDays', 'Minha agenda', 'Consultas e histórico', 'Agenda'],
  ['Users', 'Dependentes', 'Cuide da sua família', 'Dependentes'],
  ['Megaphone', 'Campanhas', 'Vacinação e prevenção', 'Campanhas'],
];
export default function Home({ navigation }) {
  const { width, fontScale } = useWindowDimensions();
  const { user, large } = useSession(),
    patients = useData('/patients'),
    next = useData('/appointments?view=upcoming'),
    soon = useData('/search/providers?date=' + todayKey() + '&limit=3');
  const singleColumn = width < 340 || fontScale * (large ? 1.16 : 1) > 1.35;
  const go = (screen, today = false) =>
    navigation.navigate(screen, screen === 'Buscar' ? { today, stamp: Date.now() } : undefined);
  return (
    <Page>
      <View style={s.hero}>
        <View style={s.row}>
          <PatientAvatar patient={patients.data?.find(p => p.isHolder)} name={user.name} size={48} />
          <T color="white" style={{ flex: 1 }}>Olá, {firstName(user.name)}!</T>
        </View>
        <T type="title" color="white">
          Precisa de uma consulta?
        </T>
        <T color="white">
          Mostramos primeiro quem atende mais cedo. Agende para você ou para um dependente.
        </T>
        <Btn
          kind="outline"
          icon="Search"
          style={{ alignSelf: 'flex-start' }}
          onPress={() => go('Buscar')}
        >
          Encontrar horário
        </Btn>
      </View>
      <View style={[s.row, { padding: 10, backgroundColor: '#f8e9dd', borderRadius: 10 }]}>
        <Icon name="CircleAlert" color="#9b3e29" />
        <T type="small" style={{ flex: 1 }}>
          Em emergência, ligue 192 (SAMU) ou procure uma UPA.
        </T>
      </View>
      <T type="heading">O que você precisa?</T>
      <View style={s.wrap}>
        {shortcuts.map(([icon, title, desc, screen]) => (
          <Pressable
            accessibilityRole="button"
            key={title}
            style={({ pressed }) => [s.card, screen === 'Campanhas' || singleColumn
              ? { width: '100%', minHeight: 76, flexDirection: 'row', alignItems: 'center' }
              : { flexBasis: '47%', flexGrow: 1, minHeight: 104 },
              { opacity: pressed ? 0.76 : 1 }]}
            onPress={() => go(screen, title === 'Consulta hoje')}
          >
            <Icon name={icon} />
            <View style={{ flex: screen === 'Campanhas' || singleColumn ? 1 : undefined, minWidth: 0, gap: spacing.xs }}>
              <T type="bold">{title}</T>
              <T type="small" color={colors.muted}>{desc}</T>
            </View>
          </Pressable>
        ))}
      </View>
      <T type="heading">Próxima consulta</T>
      <Status result={next} />
      {next.data &&
        (next.data[0] ? (
          <AppointmentCard item={next.data[0]} patient={patients.data?.find(p => p.id === next.data[0].patientId || p.id === next.data[0].patient?.id)} />
        ) : (
          <Card>
            <T>Nenhuma consulta marcada.</T>
          </Card>
        ))}
      <Btn kind="link" onPress={() => go('Agenda')}>
        Ver agenda
      </Btn>
      <T type="heading">Ainda hoje</T>
      <Status result={soon} />
      {soon.data?.map((i) => (
        <ProviderCard
          key={i.professional.id + i.clinic.id}
          compact
          item={i}
          navigation={navigation}
        />
      ))}
      {soon.data?.length === 0 && (
        <Card>
          <T>Não há mais horários livres hoje. Veja os próximos dias na busca.</T>
        </Card>
      )}
    </Page>
  );
}
