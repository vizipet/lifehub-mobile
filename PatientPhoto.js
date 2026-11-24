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
    <Image source={{ uri: 'data:image/jpeg;base64,' + base64 }}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.soft, flexShrink: 0 }}
      resizeMode="cover" accessible={false} onError={() => setFailed(key)} />
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
  actions.push({ resize: { width: Math.min(512, side) } });
  return ImageManipulator.manipulateAsync(image.uri, actions, {
    compress: 0.72, format: ImageManipulator.SaveFormat.JPEG,
  });
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
      const form = new FormData();
      form.append('authorized', 'true');
      form.append('file', { uri: draft.uri, type: 'image/jpeg', name: 'avatar.jpg' });
      await call('/patients/' + patient.id + '/photo', { method: 'POST', body: form, multipart: true });
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
        {draft ? <Image source={{ uri: draft.uri }} style={{ width: 112, height: 112, borderRadius: 56 }} resizeMode="cover" />
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
