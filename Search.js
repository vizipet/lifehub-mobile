import React, { useState, useEffect, useRef, useContext } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { useData } from './api';
import { T, Field, Card, Btn, Chip, Sheet, Status, Avatar, LabelRow, Icon, FontScale, colors, s, spacing } from './ui';
import { whenLabel, todayKey, tomorrowKey, money, modalityLabel } from './format';
export function ProviderCard({ item, navigation, compact = false }) {
  const { professional: p, clinic: c, nextService: service, nextAvailableAt: next } = item;
  return (
    <Card style={{ padding: spacing.md, gap: spacing.md }}>
      <View style={[s.row, { gap: spacing.md }]}>
        <Avatar name={p.name} url={p.photoUrl} size={48} round />
        <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
          <T type="bold">{p.name}</T>
          <T type="small" color={colors.muted}>
            {[p.specialty, p.crm && 'CRM ' + p.crm + (p.crmState ? '/' + p.crmState : '')].filter(Boolean).join(' · ')}
          </T>
        </View>
      </View>
      {!compact && (
        <LabelRow icon="MapPin">{[c.name, c.neighborhood].filter(Boolean).join(' · ')}</LabelRow>
      )}
      <View style={[s.soft, { gap: spacing.sm }]}>
        <T type="small" color={colors.muted}>Próximo horário</T>
        <View style={[s.row, { alignItems: 'flex-start' }]}>
          <Icon name="CalendarDays" size={18} />
          <T type="bold" color={colors.brand} style={{ flex: 1, fontVariant: ['tabular-nums'] }}>
            {whenLabel(next)}
          </T>
        </View>
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
          <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 120, gap: spacing.xs }}>
            <T type="small">{service.name}</T>
            <T type="small" color={colors.muted}>{modalityLabel[service.modality]}</T>
          </View>
          <T type="bold" style={{ flexShrink: 1, fontVariant: ['tabular-nums'] }}>{money(service.priceCents)}</T>
        </View>
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
    [open, setOpen] = useState(false),
    [filtersOpen, setFiltersOpen] = useState(false);
  const list = useRef(null);
  const { width, fontScale } = useWindowDimensions();
  const appScale = useContext(FontScale);
  const stackSearch = width < 360 || fontScale * appScale > 1.25;
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
    setSuggest('');
    setFiltersOpen(false);
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
  const specialtyName = options.find((o) => o.id === specialty)?.name;
  const advancedCount = Number(!!mode) + Number(!!specialty);
  const hasFilters = !!(query || day || mode || specialty || text);
  function clearFilters() {
    setText(''); setQuery(''); setSuggest(''); setDay(''); setMode(''); setSpecialty(''); setPage(1);
  }
  function changePage(value) {
    list.current?.scrollToOffset({ offset: 0, animated: false });
    setPage(value);
  }
  const head = (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <T type="title">Buscar médicos</T>
        <T type="small" color={colors.muted}>Ordenado pelo horário livre mais próximo.</T>
      </View>
      <Card style={{ padding: spacing.md, gap: spacing.md }}>
        <View style={{ flexDirection: stackSearch ? 'column' : 'row', alignItems: stackSearch ? 'stretch' : 'flex-end', gap: spacing.sm }}>
          <View style={{ flex: stackSearch ? undefined : 1, minWidth: 0 }}>
            <Field
              label="Nome ou especialidade"
              placeholder="Ex.: cardiologia"
              value={text}
              onChangeText={setText}
              returnKeyType="search"
              onSubmitEditing={() => search()}
            />
          </View>
          <Btn icon="Search" style={{ minHeight: 46 }} onPress={() => search()}>
            Buscar
          </Btn>
        </View>
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
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: filtersOpen }}
          onPress={() => setFiltersOpen((value) => !value)}
          style={({ pressed }) => [s.row, { minHeight: 44, borderTopWidth: 1, borderColor: colors.line, paddingTop: spacing.sm, opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name="SlidersHorizontal" size={20} />
          <T type="bold" color={colors.brand} style={{ flex: 1 }}>
            {filtersOpen ? 'Ocultar filtros' : 'Mais filtros'}{advancedCount ? ' (' + advancedCount + ')' : ''}
          </T>
          <View style={{ transform: [{ rotate: filtersOpen ? '-90deg' : '90deg' }] }}>
            <Icon name="ChevronRight" size={18} />
          </View>
        </Pressable>
        {!filtersOpen && advancedCount > 0 && (
          <T type="small" color={colors.muted}>{[modalityLabel[mode], specialtyName || (specialty ? 'Especialidade selecionada' : '')].filter(Boolean).join(' · ')}</T>
        )}
        {filtersOpen && (
          <View style={{ gap: spacing.sm }}>
            <T type="bold">Modalidade</T>
            <View style={s.wrap}>
              {[['', 'Todas'], ...Object.entries(modalityLabel)].map(([v, label]) => (
                <Chip key={label} active={mode === v} onPress={() => select(setMode, v)}>
                  {label}
                </Chip>
              ))}
            </View>
            <T type="bold">Especialidade</T>
            <Btn kind="outline" icon="SlidersHorizontal" onPress={() => setOpen(true)}>
              {specialtyName || 'Todas as especialidades'}
            </Btn>
          </View>
        )}
        {hasFilters && <Btn kind="link" onPress={clearFilters}>Limpar filtros</Btn>}
      </Card>
      <Status result={result} />
      {result.meta && (
        <T type="small" color={colors.muted}>
          {result.meta.total === 1 ? '1 resultado com horário disponível' : result.meta.total + ' resultados com horário disponível'}
        </T>
      )}
    </View>
  );
  return (
    <View style={s.page}>
      <FlatList
        ref={list}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
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
                <Btn kind="outline" disabled={page <= 1} onPress={() => changePage(page - 1)}>
                  Anterior
                </Btn>
                <Btn kind="outline" disabled={page >= total} onPress={() => changePage(page + 1)}>
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
