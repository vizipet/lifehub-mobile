import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { icons } from './icons';
import { photos } from './photos';
import { apiBase } from './api';
import { appointmentStatusLabel } from './format';

export const colors = {
  bg: '#eef1ea',
  card: '#fbfcf8',
  ink: '#1e2b2a',
  muted: '#55635f',
  brand: '#176b68',
  line: '#cdd6cc',
  soft: '#e2ebe3',
  danger: '#a73728',
};
export const FontScale = React.createContext(1);
// Roboto no Android e fonte de sistema nas demais plataformas.
// Use the platform default so Android can resolve the requested Roboto weight.
const systemFont = undefined;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
const sizes = { body: 16, bold: 16, title: 26, heading: 20, small: 14, tab: 12, tabCompact: 11 };
const weights = { body: '400', bold: '600', title: '600', heading: '600', small: '400', tab: '500', tabCompact: '500' };
export function T({ children, type = 'body', color = colors.ink, style, ...props }) {
  const scale = useContext(FontScale);
  return (
    <Text
      {...props}
      style={[{ fontFamily: systemFont, fontWeight: weights[type], fontSize: (sizes[type] || sizes.body) * scale, color }, style]}
    >
      {children}
    </Text>
  );
}
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md, width: '100%', maxWidth: 720, alignSelf: 'center' },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  soft: { backgroundColor: colors.soft, padding: 12, borderRadius: 10, gap: 4 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#85958d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 46,
    color: colors.ink,
    fontFamily: systemFont,
    fontWeight: '400',
  },
  hero: { backgroundColor: colors.brand, borderRadius: 14, padding: 20, gap: 8 },
});
export function Icon({ name, size = 22, color = colors.brand }) {
  return (
    <Image
      accessible={false}
      source={icons[name]}
      resizeMode="contain"
      style={{ width: size, height: size, tintColor: color }}
    />
  );
}
export function Logo({ width = 141 }) {
  return (
    <Image
      accessibilityLabel="LifeHub, saúde conectada, cuidado próximo"
      accessible
      source={require('./assets/logo.png')}
      resizeMode="contain"
      style={{ width, height: (width * 202) / 720 }}
    />
  );
}
export function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Page({ children, contentStyle }) {
  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, contentStyle]}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function Btn({ children, onPress, kind = 'primary', icon, disabled, style }) {
  const primary = kind === 'primary',
    danger = kind === 'danger',
    destructive = kind === 'destructive';
  const color = primary || destructive ? 'white' : danger ? colors.danger : colors.brand;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 44,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 9,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          backgroundColor: primary ? colors.brand : destructive ? '#a73728' : kind === 'link' ? 'transparent' : colors.card,
          borderWidth: ['outline', 'danger'].includes(kind) ? 1 : 0,
          borderColor: color,
          opacity: disabled ? 0.5 : pressed ? 0.76 : 1,
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} color={color} size={19} />}
      <T type="bold" color={color} style={{ flexShrink: 1, textAlign: 'center' }}>
        {children}
      </T>
    </Pressable>
  );
}
export function Chip({ children, active, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={{
        minHeight: 42,
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderWidth: 1,
        borderRadius: 22,
        borderColor: active ? colors.brand : colors.line,
        backgroundColor: active ? colors.brand : colors.card,
      }}
    >
      <T type="small" color={active ? 'white' : colors.ink}>
        {children}
      </T>
    </Pressable>
  );
}
export function RadioOption({ children, selected, onPress, disabled }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.row, {
        minHeight: 48, padding: 12, borderRadius: 10, borderWidth: 1,
        borderColor: selected ? colors.brand : colors.line,
        backgroundColor: selected ? colors.soft : colors.card,
      }]}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2,
        borderColor: selected ? colors.brand : colors.muted,
        alignItems: 'center', justifyContent: 'center' }}>
        {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand }} />}
      </View>
      <T style={{ flex: 1 }} type={selected ? 'bold' : 'body'}>{children}</T>
    </Pressable>
  );
}
export function StatusPill({ status }) {
  const palette = {
    CONFIRMED: ['#dceee3', '#216849'],
    CANCELLED_BY_PATIENT: ['#fbe6df', '#9a3024'],
    CANCELLED_BY_PROVIDER: ['#fbe6df', '#9a3024'],
    CANCELLED_AUTOMATICALLY: ['#fbe6df', '#9a3024'],
    COMPLETED: ['#e0eafa', '#2b5797'],
  };
  const [backgroundColor, color] = palette[status] || [colors.soft, colors.muted];
  return (
    <View style={{ alignSelf: 'flex-start', maxWidth: '100%', backgroundColor, borderRadius: 20,
      paddingHorizontal: 10, paddingVertical: 4 }}>
      <T type="small" color={color} style={{ fontWeight: '600' }}>
        {appointmentStatusLabel[status] || 'Status não informado'}
      </T>
    </View>
  );
}
export function Field({ label, ...props }) {
  const scale = useContext(FontScale);
  return (
    <View style={{ gap: 4 }}>
      <T type="bold">{label}</T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[s.input, { fontSize: 16 * scale }]}
        {...props}
      />
    </View>
  );
}
export function Check({ value, onChange, children }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[s.row, { alignItems: 'center', minHeight: 44, paddingVertical: spacing.xs }]}
    >
      <View
        style={{
          marginTop: 2,
          width: 22,
          height: 22,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.brand,
          borderRadius: 4,
          backgroundColor: value ? colors.brand : colors.card,
        }}
      >
        {value && <Icon name="Check" size={17} color="white" />}
      </View>
      <T style={{ flex: 1 }}>{children}</T>
    </Pressable>
  );
}
export function Notice({ children, error = false }) {
  return children ? (
    <View style={[s.soft, error && { backgroundColor: '#fbe6df' }]}>
      <T accessibilityLiveRegion="polite" color={error ? colors.danger : colors.ink}>
        {children}
      </T>
    </View>
  ) : null;
}
export function Status({ result }) {
  if (result.error)
    return (
      <Card>
        <Notice error>{result.error}</Notice>
        <Btn kind="link" onPress={result.reload}>
          Tentar novamente
        </Btn>
      </Card>
    );
  return result.data == null ? (
    <ActivityIndicator color={colors.brand} accessibilityLabel="Carregando" />
  ) : null;
}
export function Sheet({ title, visible, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: '#10232099', justifyContent: 'center', padding: 20 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0, backgroundColor: colors.card, borderRadius: 16 }}
          contentContainerStyle={{ padding: 18, gap: 12 }}
        >
          <T type="heading">{title}</T>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
// Foco normalizado dos retratos locais: centro do rosto/ombros na foto original.
const portraitFocus = {
  '/assets/photos/medicos/andre.jpg': [0.44, 0.278],
  '/assets/photos/medicos/beatriz.jpg': [0.49, 0.365],
  '/assets/photos/medicos/bruno.jpg': [0.49, 0.335],
  '/assets/photos/medicos/camila.jpg': [0.58, 0.345],
  '/assets/photos/medicos/helena.jpg': [0.52, 0.278],
  '/assets/photos/medicos/laura.jpg': [0.40, 0.30],
  '/assets/photos/medicos/paulo.jpg': [0.48, 0.275],
  '/assets/photos/medicos/rafael.jpg': [0.57, 0.30],
};

// Enquadra uma região quadrada sem esticar a imagem nem deixar faixas vazias.
function portraitFrame(size, width, height, focus) {
  const zoom = size / (Math.min(width, height) * (focus ? 0.80 : 1));
  const w = width * zoom, h = height * zoom;
  const [x, y] = focus || [0.5, 0.5];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  return {
    position: 'absolute',
    width: w,
    height: h,
    left: clamp(size / 2 - w * x, size - w, 0),
    top: focus ? clamp(size / 2 - h * y, size - h, 0) : (size - h) * 0.15,
  };
}
export function Avatar({ name = '', url, size = 55, round = false }) {
  const [failed, setFailed] = useState(null);
  const [loaded, setLoaded] = useState(null);
  const local = photos[url];
  const src =
    local ||
    (url?.startsWith('/public/')
      ? { uri: apiBase() + url }
      : url?.startsWith('https://')
        ? { uri: url }
        : null);
  const dimensions = local ? Image.resolveAssetSource(local) : loaded?.url === url ? loaded : null;
  const imageStyle = dimensions?.width > 0 && dimensions?.height > 0
    ? portraitFrame(size, dimensions.width, dimensions.height, portraitFocus[url])
    : { width: size, height: size };
  const box = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: round ? size / 2 : 10,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };
  const words = name
    .replace(/^dra?\.\s*/i, '')
    .trim()
    .split(/\s+/);
  return (
    <View style={box}>
      {src && failed !== url ? (
        <Image
          key={url}
          source={src}
          resizeMode="cover"
          onLoad={({ nativeEvent }) => {
            if (local) return;
            const { width, height } = nativeEvent.source || {};
            if (width > 0 && height > 0) {
              setLoaded((previous) => previous?.url === url && previous.width === width && previous.height === height
                ? previous : { url, width, height });
            }
          }}
          onError={() => setFailed(url)}
          style={imageStyle}
        />
      ) : (
        <T type="heading" color={colors.brand}>
          {(words[0]?.[0] || '') + (words.length > 1 ? words.at(-1)[0] : '')}
        </T>
      )}
    </View>
  );
}
export function LabelRow({ icon, children }) {
  return (
    <View style={s.row}>
      <Icon name={icon} size={17} />
      <T type="small" color={colors.muted} style={{ flex: 1 }}>
        {children}
      </T>
    </View>
  );
}
