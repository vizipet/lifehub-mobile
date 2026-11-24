import React, { useState } from 'react';
import { Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useData, useSession, useAction } from './api';
import { Avatar, Btn, Check, Notice, Sheet, T, colors, spacing } from './ui';

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
  return (
    <Sheet visible={true} title={patient.isHolder ? 'Minha foto de perfil' : 'Foto do dependente'}
      onClose={() => { if (!action.busy) onClose(); }}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        {draft ? <View style={{ width: 112, height: 112, borderRadius: 56, borderWidth: 1.5,
          borderColor: colors.brand, padding: 2, backgroundColor: colors.card }}>
          <Image source={{ uri: draft.uri }} style={{ width: 105, height: 105, borderRadius: 52.5 }} resizeMode="cover" />
        </View>
          : <PatientAvatar patient={patient} size={112} />}
        <T type="heading" style={{ textAlign: 'center' }}>{patient.name}</T>
        <T type="small" color={colors.muted} style={{ textAlign: 'center' }}>Foto opcional, visível somente na sua conta.</T>
      </View>
      {!removing && (
        <>
          <Btn kind="outline" disabled={action.busy} onPress={() => choose(false)}>Escolher da galeria</Btn>
          <Btn kind="outline" disabled={action.busy} onPress={() => choose(true)}>Tirar foto</Btn>
          {!!draft && !patient.isHolder && (
            <Check value={authorized} onChange={setAuthorized}>
              Confirmo que sou responsável legal ou tenho autorização do dependente para cadastrar esta foto.
            </Check>
          )}
          {!!draft && <Btn disabled={!allowed || action.busy} onPress={save}>{action.busy ? 'Salvando…' : 'Salvar foto'}</Btn>}
          {!!patient.photoVersion && <Btn kind="danger" disabled={action.busy} onPress={() => setRemoving(true)}>Remover foto</Btn>}
        </>
      )}
      {removing && (
        <>
          <T>Remover esta foto de perfil? As iniciais voltarão a ser exibidas.</T>
          <Btn kind="destructive" disabled={action.busy} onPress={remove}>Confirmar remoção</Btn>
          <Btn kind="outline" disabled={action.busy} onPress={() => setRemoving(false)}>Manter foto</Btn>
        </>
      )}
      <Notice error>{action.error}</Notice>
      <Btn kind="link" disabled={action.busy} onPress={onClose}>Voltar</Btn>
    </Sheet>
  );
}
