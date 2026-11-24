import React, { useState } from 'react';
import { View } from 'react-native';
import { useSession, useData, useAction } from './api';
import { PatientAvatar, PatientPhotoEditor } from './PatientPhoto';
import {
  Page,
  T,
  Card,
  Btn,
  Field,
  Sheet,
  Chip,
  Notice,
  Check,
  Status,
  Avatar,
  colors,
  s,
} from './ui';
import { maskCpf, isValidCpf, onlyDigits, relationshipLabel, sexLabel } from './format';
import { birthISO, BirthField } from './Auth';
const empty = {
  name: '',
  birth: '',
  cpf: '',
  relationship: 'CHILD',
  sex: 'NOT_INFORMED',
  consent: false,
};
export default function Family() {
  const { call } = useSession(),
    list = useData('/patients'),
    action = useAction();
  const [edit, setEdit] = useState(null),
    [remove, setRemove] = useState(null),
    [form, setForm] = useState(empty),
    [message, setMessage] = useState(''),
    [photoPatient, setPhotoPatient] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  function open(item) {
    action.clear();
    setMessage('');
    setEdit(item);
    setForm(
      item === 'new'
        ? empty
        : {
            ...empty,
            name: item.name,
            birth: item.birthDate.slice(0, 10).split('-').reverse().join('/'),
            sex: item.sex,
            relationship: item.relationship,
          },
    );
  }
  function close() {
    if (!action.busy) {
      setEdit(null);
      setRemove(null);
    }
  }
  const save = () =>
    action.run(async () => {
      const body = { sex: form.sex };
      if (!edit.isHolder) {
        if (form.name.trim().length < 3) throw Error('Informe o nome completo.');
        Object.assign(body, {
          name: form.name.trim(),
          relationship: form.relationship,
          birthDate: birthISO(form.birth),
        });
      }
      if (edit === 'new') {
        if (!form.consent) throw Error('Confirme a declaração de responsabilidade.');
        if (form.cpf && !isValidCpf(form.cpf)) throw Error('Confira o CPF.');
        await call('/patients', {
          method: 'POST',
          body: {
            ...body,
            ...(form.cpf ? { cpf: onlyDigits(form.cpf) } : {}),
            guardianConsent: true,
          },
        });
      } else await call('/patients/' + edit.id, { method: 'PATCH', body });
      setEdit(null);
      setMessage('Dados do paciente salvos.');
      list.reload();
    });
  const destroy = () =>
    action.run(async () => {
      await call('/patients/' + remove.id, { method: 'DELETE' });
      setRemove(null);
      setMessage('Dependente removido.');
      list.reload();
    });
  return (
    <Page>
      <T type="title">Você e seus dependentes</T>
      <T color={colors.muted}>Agende consultas para qualquer pessoa da lista.</T>
      <Btn icon="Plus" onPress={() => open('new')}>
        Adicionar dependente
      </Btn>
      <Status result={list} />
      {list.data?.length === 0 && <Notice>Nenhum titular ou dependente encontrado.</Notice>}
      <Notice>{message}</Notice>
      {list.data?.map((p) => (
        <Card key={p.id}>
          <View style={s.row}>
            <PatientAvatar patient={p} size={64} />
            <View style={{ flex: 1 }}>
              <T type="heading">{p.name}</T>
              <T>
                {relationshipLabel[p.relationship]} · {p.age} anos
              </T>
            </View>
          </View>
          <T type="small">
            Nascimento {p.birthDate.slice(0, 10).split('-').reverse().join('/')} · {sexLabel[p.sex]}
          </T>
          <T type="small">CPF: {p.cpfMasked || 'não informado'}</T>
          <View style={s.wrap}>
            <Btn kind="outline" icon="Pencil" onPress={() => setPhotoPatient(p)}>
              {p.photoVersion ? 'Alterar foto' : 'Adicionar foto'}
            </Btn>
            <Btn kind="outline" icon="Pencil" onPress={() => open(p)}>
              Editar
            </Btn>
            {!p.isHolder && (
              <Btn
                kind="danger"
                onPress={() => {
                  action.clear();
                  setRemove(p);
                }}
              >
                Remover
              </Btn>
            )}
          </View>
        </Card>
      ))}
      {!!photoPatient && <PatientPhotoEditor patient={photoPatient} onClose={() => setPhotoPatient(null)} onChanged={list.reload} />}
      <Sheet
        visible={edit !== null}
        title={edit === 'new' ? 'Adicionar dependente' : 'Editar paciente'}
        onClose={close}
      >
        {edit?.isHolder ? (
          <T type="bold">{form.name}</T>
        ) : (
          <>
            <Field label="Nome completo" value={form.name} onChangeText={(v) => set('name', v)} />
            <BirthField value={form.birth} onChange={(v) => set('birth', v)} />
            <T type="bold">Parentesco</T>
            <View style={s.wrap}>
              {Object.entries(relationshipLabel)
                .filter(([v]) => v !== 'SELF')
                .map(([v, t]) => (
                  <Chip
                    key={v}
                    active={v === form.relationship}
                    onPress={() => set('relationship', v)}
                  >
                    {t}
                  </Chip>
                ))}
            </View>
          </>
        )}
        <T type="bold">Sexo</T>
        <View style={s.wrap}>
          {Object.entries(sexLabel).map(([v, t]) => (
            <Chip key={v} active={form.sex === v} onPress={() => set('sex', v)}>
              {t}
            </Chip>
          ))}
        </View>
        {edit === 'new' && (
          <>
            <Field
              label="CPF do dependente (opcional)"
              keyboardType="number-pad"
              value={form.cpf}
              onChangeText={(v) => set('cpf', maskCpf(v))}
            />
            <Check value={form.consent} onChange={(v) => set('consent', v)}>
              Declaro, sob as penas da lei, que sou responsável legal por esta pessoa ou que tenho a
              autorização dela para cadastrar seus dados e agendar consultas. Sei que declarar
              parentesco falso é crime de falsidade ideológica (art. 299 do Código Penal) e que esta
              declaração fica registrada com data e hora.
            </Check>
          </>
        )}
        <Notice error>{action.error}</Notice>
        <Btn disabled={action.busy || (edit === 'new' && !form.consent)} onPress={save}>
          Salvar
        </Btn>
        <Btn disabled={action.busy} kind="link" onPress={close}>
          Voltar
        </Btn>
      </Sheet>
      <Sheet visible={!!remove} title="Remover dependente?" onClose={close}>
        <T>
          {remove?.name} deixará de aparecer na sua conta. O histórico de consultas passadas é
          mantido.
        </T>
        <Notice error>{action.error}</Notice>
        <Btn disabled={action.busy} kind="danger" onPress={destroy}>
          Confirmar remoção
        </Btn>
        <Btn disabled={action.busy} kind="outline" onPress={close}>
          Manter dependente
        </Btn>
      </Sheet>
    </Page>
  );
}
