import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSession, useData, useAction } from './api';
import { PatientAvatar } from './PatientPhoto';
import Teleconsultation from './Teleconsultation';
import { T, Card, Btn, Chip, Status, Sheet, Notice, LabelRow, RadioOption, StatusPill, colors, s } from './ui';
import {
  modalityLabel,
  relationshipLabel,
  dateLong,
  time,
  money,
} from './format';
const reasons = [
  'Não poderei comparecer',
  'Encontrei outro horário',
  'Já me sinto melhor',
  'Outro motivo',
];
export function AppointmentCard({ item: a, onCancel, onRevokePhoto, patient }) {
  const start = a.slot.startsAt,
    remote = a.serviceModalitySnapshot === 'REMOTE',
    confirmed = a.status === 'CONFIRMED';
  const stamp = new Date(start),
    local = { timeZone: 'America/Recife' };
  return (
    <Card>
      <View style={s.row}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.soft,
            borderRadius: 10,
            minWidth: 60,
            padding: 7,
          }}
        >
          <T type="heading" color={colors.brand}>
            {stamp.toLocaleDateString('pt-BR', { ...local, day: '2-digit' })}
          </T>
          <T type="small">{stamp.toLocaleDateString('pt-BR', { ...local, month: 'short' })}</T>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <StatusPill status={a.status} />
          <T type="heading">{a.professionalNameSnapshot}</T>
        </View>
      </View>
      <T type="bold">{a.serviceNameSnapshot}</T>
      <LabelRow icon="Clock">
        {dateLong(start)} · {time(start)}
      </LabelRow>
      <View style={s.row}>
        <PatientAvatar patient={patient} name={a.patient.name} size={32} />
        <T style={{ flex: 1 }}>{a.patient.name} · {relationshipLabel[a.patient.relationship]}</T>
      </View>
      <LabelRow icon={remote ? 'Video' : 'MapPin'}>
        {[
          modalityLabel[a.serviceModalitySnapshot],
          a.clinicNameSnapshot,
          !remote && a.clinicAddressSnapshot,
        ]
          .filter(Boolean)
          .join(' · ')}
      </LabelRow>
      <T type="small">{money(a.servicePriceCentsSnapshot)}</T>
      {a.cancellationReason && <T color={colors.danger}>Motivo: {a.cancellationReason}</T>}
      {remote && confirmed && <Teleconsultation appointment={a} />}
      {onRevokePhoto && a.photoShared && confirmed && Date.parse(a.slot.endsAt) > Date.now() && (
        <Btn kind="link" icon="ShieldCheck" onPress={() => onRevokePhoto(a)}>Parar de compartilhar foto</Btn>
      )}
      {onCancel && confirmed && +stamp > Date.now() && (
        <Btn kind="danger" onPress={() => onCancel(a)}>
          Cancelar consulta
        </Btn>
      )}
    </Card>
  );
}
export default function Agenda({ navigation }) {
  const [view, setView] = useState('upcoming'),
    [target, setTarget] = useState(null),
    [photoTarget, setPhotoTarget] = useState(null),
    [reason, setReason] = useState(''),
    [message, setMessage] = useState('');
  const patients = useData('/patients');
  const result = useData('/appointments?view=' + view),
    { call } = useSession(),
    action = useAction();
  function open(item) {
    action.clear();
    setReason('');
    setTarget(item);
  }
  function close() {
    if (!action.busy) setTarget(null);
  }
  function revokePhoto() {
    if (!photoTarget) return;
    action.run(async () => {
      await call('/appointments/' + photoTarget.id + '/patient-photo', { method: 'DELETE' });
      setPhotoTarget(null);
      setMessage('Compartilhamento da foto revogado. Sua consulta continua agendada.');
      result.reload();
    });
  }
  function cancel() {
    action.run(async () => {
      await call('/appointments/' + target.id + '/cancel', { method: 'PATCH', body: { reason } });
      setTarget(null);
      setMessage('Consulta cancelada. O horário foi liberado para outra pessoa.');
      result.reload();
    });
  }
  return (
    <View style={s.page}>
      <FlatList
        contentContainerStyle={s.content}
        data={result.data || []}
        keyExtractor={(i) => i.id}
        onRefresh={result.reload}
        refreshing={!result.data && !result.error}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <T type="title">Minha agenda</T>
            <Btn icon="Plus" onPress={() => navigation.navigate('Buscar', { stamp: Date.now() })}>
              Nova consulta
            </Btn>
            <View style={s.wrap}>
              {[
                ['upcoming', 'Próximas'],
                ['past', 'Histórico'],
                ['cancelled', 'Canceladas'],
              ].map(([v, label]) => (
                <Chip
                  key={v}
                  active={v === view}
                  onPress={() => {
                    setView(v);
                    setMessage('');
                  }}
                >
                  {label}
                </Chip>
              ))}
            </View>
            <Notice>{message}</Notice>
            <Status result={result} />
          </View>
        }
        renderItem={({ item }) => <AppointmentCard item={item} onCancel={open} onRevokePhoto={item => { action.clear(); setPhotoTarget(item); }} patient={patients.data?.find(p => p.id === item.patientId || p.id === item.patient?.id)} />}
        ListEmptyComponent={
          result.data && (
            <Card>
              <T>
                {view === 'upcoming'
                  ? 'Nenhuma consulta marcada.'
                  : view === 'past'
                    ? 'Você ainda não tem histórico de consultas.'
                    : 'Nenhuma consulta cancelada.'}
              </T>
            </Card>
          )
        }
      />
      <Sheet visible={!!photoTarget} title="Parar de compartilhar foto?" onClose={() => { if (!action.busy) setPhotoTarget(null); }}>
        <T>O médico não poderá mais consultar a foto do paciente nesta consulta. Seu agendamento continuará válido.</T>
        <Notice error>{action.error}</Notice>
        <Btn kind="destructive" disabled={action.busy} onPress={revokePhoto}>Revogar autorização</Btn>
        <Btn kind="outline" disabled={action.busy} onPress={() => setPhotoTarget(null)}>Voltar</Btn>
      </Sheet>
      <Sheet visible={!!target} title="Cancelar consulta?" onClose={close}>
        {target && (
          <T>
            O horário com {target.professionalNameSnapshot} em {dateLong(target.slot.startsAt)}, às{' '}
            {time(target.slot.startsAt)}, ficará disponível para outra pessoa.
          </T>
        )}
        <T type="bold">Motivo</T>
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          {reasons.map((r) => (
            <RadioOption key={r} selected={r === reason} disabled={action.busy} onPress={() => setReason(r)}>
              {r}
            </RadioOption>
          ))}
        </View>
        <Notice error>{action.error}</Notice>
        <Btn disabled={!reason || action.busy} kind="destructive" onPress={cancel}>
          {action.busy ? 'Cancelando…' : 'Confirmar cancelamento'}
        </Btn>
        <Btn disabled={action.busy} kind="outline" onPress={close}>
          Manter consulta
        </Btn>
      </Sheet>
    </View>
  );
}
