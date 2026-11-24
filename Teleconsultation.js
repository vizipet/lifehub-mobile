import React, { useEffect, useRef, useState } from 'react';
import { Linking, Modal, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from './api';
import { Btn, Notice, T, colors } from './ui';

export default function Teleconsultation({ appointment }) {
  const { call } = useSession();
  const [now, setNow] = useState(Date.now);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const start = Date.parse(appointment.slot.startsAt);
  const end = Date.parse(appointment.slot.endsAt);
  const available = appointment.status === 'CONFIRMED' && now >= start - 15 * 60000 && now < end;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); generation.current++; };
  }, []);
  useEffect(() => {
    if (!available) { generation.current++; setUrl(''); setBusy(false); }
  }, [available]);
  async function join(external = false) {
    if (!available || busy) return;
    const attempt = ++generation.current;
    setBusy(true); setError(''); setUrl('');
    try {
      const res = await call('/appointments/' + appointment.id + '/teleconsultation', { method: 'POST' });
      const link = res.data.url;
      if (!/^https:\/\/[a-z0-9-]+\.daily\.co\/lh-[a-f0-9]{40}\?t=/i.test(link)) throw Error('Sala de vídeo inválida.');
      if (attempt !== generation.current) return;
      if (external) await Linking.openURL(link);
      else setUrl(link);
    } catch (err) { if (attempt === generation.current) setError(err.message || 'Não foi possível entrar.'); }
    finally { if (attempt === generation.current) setBusy(false); }
  }
  if (now >= end) return null;
  const origin = url ? url.split('/').slice(0, 3).join('/') : '';
  return <View style={{ gap: 8 }}>
    <Btn icon="Video" disabled={!available || busy} onPress={() => join()}>{busy ? 'Preparando sala…' : 'Entrar na teleconsulta'}</Btn>
    {!available && <T type="small" color={colors.muted}>Sala disponível 15 minutos antes da consulta.</T>}
    {available && <Btn kind="link" disabled={busy} onPress={() => join(true)}>Abrir no navegador (alternativa)</Btn>}
    <Notice error>{error}</Notice>
    <Modal visible={!!url && available} animationType="slide" onRequestClose={() => setUrl('')}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ padding: 12, gap: 6 }}>
          <T type="heading">Teleconsulta</T>
          <T type="small">Demonstração acadêmica. Permita câmera e microfone. Não compartilhe o link.</T>
          <Btn kind="outline" onPress={() => setUrl('')}>Sair da sala</Btn>
          <Btn kind="link" disabled={busy} onPress={() => join(true)}>Abrir no navegador</Btn>
        </View>
        {!!url && <WebView source={{ uri: url }} style={{ flex: 1 }} originWhitelist={[origin]} onShouldStartLoadWithRequest={r => r.url === 'about:blank' || r.url.startsWith(origin + '/')} javaScriptEnabled domStorageEnabled allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} mediaCapturePermissionGrantType="grantIfSameHostElsePrompt" mixedContentMode="never" setSupportMultipleWindows={false} onError={() => { setUrl(''); setError('Não foi possível abrir a sala. Tente pelo navegador.'); }} />}
      </SafeAreaView>
    </Modal>
  </View>;
}
