import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useData, useSession, useAction } from './api';
import { Avatar, Btn, Check, Icon, Notice, T, colors, spacing } from './ui';

export function PatientAvatar({ patient, name, size = 48 }) {
  const result = useData(patient?.id && patient.photoVersion
    ? '/patients/' + encodeURIComponent(patient.id) + '/photo?v=' + encodeURIComponent(patient.photoVersion)
    : null);
  const [failed, setFailed] = useState(null);
  const key = patient?.id + ':' + patient?.photoVersion;
  const base64 = result.data?.base64;
  if (typeof base64 !== 'string' || !base64 || failed === key) {
    return <Avatar name={patient?.name || name || ''} size={size} round />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5,
      borderColor: colors.brand, padding: 2, backgroundColor: colors.card, flexShrink: 0 }}>
      <Image source={{ uri: 'data:image/jpeg;base64,' + base64 }}
        style={{ width: size - 7, height: size - 7, borderRadius: (size - 7) / 2, backgroundColor: colors.soft }}
        resizeMode="cover" accessible={false} onError={() => setFailed(key)} />
    </View>
  );
}

async function pickPhoto(camera) {
  if (camera) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw Error('Autorize a câmera nas configurações do celular.');
  }
  const options = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85, exif: false };
  const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;
  const image = result.assets[0];
  // Crop the center if the platform's editor returns a non-square image.
  const side = Math.min(image.width, image.height);
  if (!Number.isFinite(side) || side <= 0) throw Error('Não foi possível ler a imagem.');
  const actions = [];
  if (image.width !== image.height) actions.push({ crop: { originX: Math.floor((image.width - side) / 2),
    originY: Math.floor((image.height - side) / 2), width: side, height: side } });
  // Use a bounded JSON payload instead of relying on native multipart/file URI handling.
  const maxBase64Length = 87384;
  for (const [width, compress] of [[512, 0.75], [512, 0.55], [384, 0.55], [256, 0.45]]) {
    const processed = await ImageManipulator.manipulateAsync(
      image.uri, [...actions, { resize: { width: Math.min(width, side) } }],
      { compress, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    // Base64 length rounds up to groups of four; account for final padding.
    if (processed.base64) {
      const padding = processed.base64.endsWith('==') ? 2 : processed.base64.endsWith('=') ? 1 : 0;
      const byteLength = processed.base64.length * 3 / 4 - padding;
      if (processed.base64.length <= maxBase64Length && byteLength <= 65536) return processed;
    }
  }
  throw Error('Não foi possível compactar a foto. Escolha outra imagem.');
}

export function PatientPhotoEditor({ patient, onClose, onChanged }) {
  const { call } = useSession();
  const action = useAction();
  const [draft, setDraft] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [removing, setRemoving] = useState(false);
  const allowed = patient?.isHolder || authorized;
  function choose(camera) {
    action.run(async () => {
      const picked = await pickPhoto(camera);
      if (picked) { setDraft(picked); setRemoving(false); }
    });
  }
  function save() {
    if (!draft || !allowed || !patient?.id) return;
    action.run(async () => {
      if (!draft.base64) throw Error('Escolha novamente a foto antes de salvar.');
      await call('/patients/' + patient.id + '/photo', {
        method: 'PUT', body: { authorized: true, base64: draft.base64 },
      });
      onChanged();
      onClose();
    });
  }
  function remove() {
    action.run(async () => {
      await call('/patients/' + patient.id + '/photo', { method: 'DELETE' });
      onChanged();
      onClose();
    });
  }
  const { height } = useWindowDimensions();
  const close = () => { if (!action.busy) onClose(); };
  const title = removing ? 'Remover foto?' : patient.isHolder ? 'Minha foto de perfil' : 'Foto do dependente';
  const previewSize = 132;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: '#10232099', justifyContent: 'flex-end', padding: spacing.md }}>
        <View style={{ width: '100%', maxWidth: 520, maxHeight: height * 0.9, alignSelf: 'center',
          backgroundColor: colors.card, borderRadius: 24, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm,
            borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <T type="heading" style={{ flex: 1 }}>{title}</T>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar" disabled={action.busy}
                onPress={close} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22,
                  alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft,
                  opacity: action.busy ? 0.45 : pressed ? 0.7 : 1 })}>
                <Icon name="X" size={20} />
              </Pressable>
            </View>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}
            contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
            <View style={{ alignItems: 'center', gap: spacing.md }}>
              {draft && !removing ? (
                <View style={{ width: previewSize, height: previewSize, borderRadius: previewSize / 2,
                  borderWidth: 1.5, borderColor: colors.brand, padding: 2, backgroundColor: colors.card }}>
                  <Image source={{ uri: draft.uri }} style={{ width: previewSize - 7, height: previewSize - 7,
                    borderRadius: (previewSize - 7) / 2 }} resizeMode="cover" />
                </View>
              ) : <PatientAvatar patient={patient} size={previewSize} />}
              <View style={{ alignItems: 'center', gap: spacing.xs }}>
                <T type="heading" style={{ textAlign: 'center' }}>{patient.name}</T>
                <T type="small" color={colors.muted} style={{ textAlign: 'center' }}>
                  {removing ? 'As iniciais voltarão a ser exibidas.' : draft ? 'Prévia da nova foto' : patient.photoVersion ? 'Foto de perfil atual' : 'Adicione uma foto de perfil'}
                </T>
              </View>
            </View>
            {!removing && (
              <>
                <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, overflow: 'hidden' }}>
                  {[
                    { camera: false, title: 'Escolher da galeria', detail: 'Use uma foto do seu celular' },
                    { camera: true, title: 'Tirar foto', detail: 'Capture uma nova imagem' },
                  ].map((option, index) => (
                    <Pressable key={String(option.camera)} accessibilityRole="button" disabled={action.busy}
                      onPress={() => choose(option.camera)}
                      style={({ pressed }) => ({ minHeight: 64, paddingHorizontal: spacing.md,
                        paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                        borderTopWidth: index ? 1 : 0, borderTopColor: colors.line,
                        backgroundColor: pressed ? colors.soft : colors.card,
                        opacity: action.busy ? 0.55 : 1 })}>
                      <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
                        <T type="bold" color={colors.brand}>{option.title}</T>
                        <T type="small" color={colors.muted}>{option.detail}</T>
                      </View>
                      <Icon name="ChevronRight" size={18} />
                    </Pressable>
                  ))}
                </View>
                {!!draft && !patient.isHolder && (
                  <Check value={authorized} onChange={setAuthorized}>
                    Confirmo que sou responsável legal ou tenho autorização do dependente para cadastrar esta foto.
                  </Check>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                  <Icon name="ShieldCheck" size={18} color={colors.muted} />
                  <T type="small" color={colors.muted} style={{ flex: 1 }}>
                    Foto privada e opcional. O médico só poderá vê-la se você autorizar nesta consulta.
                  </T>
                </View>
                {!!patient.photoVersion && (
                  <Pressable accessibilityRole="button" disabled={action.busy}
                    onPress={() => { action.clear(); setRemoving(true); }}
                    style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'center', gap: spacing.sm, opacity: action.busy ? 0.5 : pressed ? 0.7 : 1 })}>
                    <Icon name="Trash2" size={17} color={colors.danger} />
                    <T type="bold" color={colors.danger}>Remover foto</T>
                  </Pressable>
                )}
              </>
            )}
            {removing && (
              <T style={{ textAlign: 'center' }}>Deseja remover esta foto de perfil da sua conta?</T>
            )}
            <Notice error>{action.error}</Notice>
          </ScrollView>
          {(removing || !!draft) && (
            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
              borderTopWidth: 1, borderTopColor: colors.line, gap: spacing.sm }}>
              {removing ? (
                <>
                  <Btn kind="destructive" disabled={action.busy} onPress={remove} style={{ minHeight: 48 }}>
                    {action.busy ? 'Removendo…' : 'Confirmar remoção'}
                  </Btn>
                  <Btn kind="link" disabled={action.busy} onPress={() => { action.clear(); setRemoving(false); }}>Manter foto</Btn>
                </>
              ) : (
                <Btn disabled={!allowed || action.busy} onPress={save} icon="Check" style={{ minHeight: 48 }}>
                  {action.busy ? 'Salvando…' : 'Salvar foto'}
                </Btn>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
