import React, { useState, useEffect } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useData } from './api';
import { T, Field, Card, Btn, Chip, Sheet, Status, Avatar, LabelRow, colors, s } from './ui';
import { whenLabel, todayKey, tomorrowKey, money, modalityLabel } from './format';
export function ProviderCard({ item, navigation, compact = false }) {
  const { professional: p, clinic: c, nextService: service, nextAvailableAt: next } = item;
  return (
    <Card>
      <View style={s.row}>
        <Avatar name={p.name} url={p.photoUrl} size={48} round />
        <View style={{ flex: 1 }}>
          <T type="heading">{p.name}</T>
          <T type="small" color={colors.muted}>
            {[p.specialty, p.crm && 'CRM ' + p.crm + '/' + p.crmState].filter(Boolean).join(' · ')}
          </T>
        </View>
      </View>
      {!compact && (
        <LabelRow icon="MapPin">{[c.name, c.neighborhood].filter(Boolean).join(' · ')}</LabelRow>
      )}
      <View style={s.soft}>
        <T type="small">Próximo horário</T>
        <T type="bold" color={colors.brand}>
          {whenLabel(next)}
        </T>
        <T type="small">
          {[service.name, modalityLabel[service.modality], money(service.priceCents)].join(' · ')}
        </T>
      </View>
      <Btn
        kind={compact ? 'link' : 'primary'}
        onPress={() =>
          navigation.navigate('Médico', {
            id: p.id,
            clinic: c.id,
            serviceId: service.id,
            preferredDay: next,
          })
        }
      >
        Ver perfil e horários
      </Btn>
    </Card>
  );
}
export default function Search({ navigation, route }) {
  const [text, setText] = useState(''),
    [query, setQuery] = useState(''),
    [suggest, setSuggest] = useState(''),
    [day, setDay] = useState(''),
    [mode, setMode] = useState(''),
    [specialty, setSpecialty] = useState(''),
    [page, setPage] = useState(1),
    [open, setOpen] = useState(false);
  const specialties = useData('/specialties'),
    options = specialties.data || [];
  useEffect(() => {
    if (!route.params?.stamp) return;
    setDay(route.params.today ? 'hoje' : '');
    setPage(1);
    setText('');
    setQuery('');
    setMode('');
    setSpecialty('');
  }, [route.params?.stamp]);
  useEffect(() => {
    const id = setTimeout(() => setSuggest(text.trim() === query ? '' : text.trim()), 250);
    return () => clearTimeout(id);
  }, [text, query]);
  const url =
    '/search/providers?limit=10&page=' +
    page +
    '&q=' +
    encodeURIComponent(query) +
    (specialty ? '&specialtyId=' + specialty : '') +
    (mode ? '&modality=' + mode : '') +
    (day ? '&date=' + (day === 'hoje' ? todayKey() : tomorrowKey()) : '');
  const result = useData(url),
    hints = useData(
      suggest.length >= 2 ? '/search/providers?limit=5&q=' + encodeURIComponent(suggest) : null,
    );
  function search(value = text) {
    setPage(1);
    setQuery(value.trim());
    setText(value);
    setSuggest('');
  }
  function select(set, value) {
    set(value);
    setPage(1);
  }
  const total = result.meta?.totalPages || 1;
  const head = (
    <View style={{ gap: 12 }}>
      <T type="title">Buscar médicos</T>
      <Card>
        <Field
          label="Nome ou especialidade"
          placeholder="Ex.: cardiologia"
          value={text}
          onChangeText={setText}
          returnKeyType="search"
          onSubmitEditing={() => search()}
        />
        {suggest.length >= 2 && text.trim() !== query && (
          <View>
            {[
              ...new Set([
                ...options
                  .filter((v) => v.name.toLocaleLowerCase().includes(suggest.toLocaleLowerCase()))
                  .map((v) => v.name),
                ...(hints.data || []).map((i) => i.professional.name),
              ]),
            ]
              .slice(0, 5)
              .map((name) => (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  style={{ minHeight: 42, justifyContent: 'center' }}
                  onPress={() => search(name)}
                >
                  <T color={colors.brand}>{name}</T>
                </Pressable>
              ))}
          </View>
        )}
        <Btn icon="Search" onPress={() => search()}>
          Pesquisar
        </Btn>
        <T type="bold">Quando?</T>
        <View style={s.wrap}>
          {[
            ['', 'Qualquer dia'],
            ['hoje', 'Hoje'],
            ['amanha', 'Amanhã'],
          ].map(([v, label]) => (
            <Chip key={label} active={day === v} onPress={() => select(setDay, v)}>
              {label}
            </Chip>
          ))}
        </View>
        <T type="bold">Modalidade</T>
        <View style={s.wrap}>
          {[['', 'Todas'], ...Object.entries(modalityLabel)].map(([v, label]) => (
            <Chip key={label} active={mode === v} onPress={() => select(setMode, v)}>
              {label}
            </Chip>
          ))}
        </View>
        <Btn kind="outline" icon="SlidersHorizontal" onPress={() => setOpen(true)}>
          {options.find((o) => o.id === specialty)?.name || 'Todas as especialidades'}
        </Btn>
      </Card>
      <Status result={result} />
      {result.meta && (
        <T type="small" color={colors.muted}>
          {result.meta.total} resultado(s) com horário disponível
        </T>
      )}
    </View>
  );
  return (
    <View style={s.page}>
      <FlatList
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
        data={result.data || []}
        keyExtractor={(i) => i.professional.id + i.clinic.id}
        ListHeaderComponent={head}
        renderItem={({ item }) => <ProviderCard item={item} navigation={navigation} />}
        ListEmptyComponent={
          result.data && (
            <Card>
              <T>Nenhum horário com esses filtros. Tente outro dia ou especialidade.</T>
            </Card>
          )
        }
        ListFooterComponent={
          total > 1 && (
            <Card>
              <T>
                Página {page} de {total}
              </T>
              <View style={s.row}>
                <Btn kind="outline" disabled={page <= 1} onPress={() => setPage(page - 1)}>
                  Anterior
                </Btn>
                <Btn kind="outline" disabled={page >= total} onPress={() => setPage(page + 1)}>
                  Próxima
                </Btn>
              </View>
            </Card>
          )
        }
      />
      <Sheet title="Especialidade" visible={open} onClose={() => setOpen(false)}>
        <Status result={specialties} />
        {[{ id: '', name: 'Todas as especialidades' }, ...options].map((o) => (
          <Chip
            key={o.id}
            active={o.id === specialty}
            onPress={() => {
              select(setSpecialty, o.id);
              setOpen(false);
            }}
          >
            {o.name}
          </Chip>
        ))}
        <Btn kind="link" onPress={() => setOpen(false)}>
          Fechar
        </Btn>
      </Sheet>
    </View>
  );
}
