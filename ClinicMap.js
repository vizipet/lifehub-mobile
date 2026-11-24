import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Btn, Icon, T, colors, spacing } from './ui';

const MAP_ORIGIN = 'https://www.openstreetmap.org';
function mapUrl(latitude, longitude) {
  const bbox = [longitude - 0.006, latitude - 0.004, longitude + 0.006, latitude + 0.004]
    .map((n) => n.toFixed(5)).join(',');
  return MAP_ORIGIN + '/export/embed.html?bbox=' + bbox + '&layer=mapnik&marker='
    + latitude.toFixed(5) + ',' + longitude.toFixed(5);
}
function validCoordinates(latitude, longitude) {
  return typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

export default function ClinicMap({ name, latitude, longitude }) {
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  if (!validCoordinates(latitude, longitude)) return null;
  const uri = mapUrl(latitude, longitude);
  function open() {
    setError(false);
    setShow(true);
  }
  return (
    <View style={{ gap: spacing.xs }}>
      {show && !error ? (
        <>
          <View style={{ height: 176, width: '100%', borderRadius: 12, overflow: 'hidden',
            borderWidth: 1, borderColor: colors.line, backgroundColor: colors.soft }}>
            <WebView
              key={uri}
              source={{ uri }}
              style={{ flex: 1, backgroundColor: colors.soft }}
              accessibilityLabel={'Mapa de ' + name}
              originWhitelist={['https://*', 'about:blank']}
              onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'
                || request.url.startsWith(MAP_ORIGIN + '/export/embed.html?')}
              startInLoadingState
              renderLoading={() => (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft }}>
                  <ActivityIndicator color={colors.brand} accessibilityLabel="Carregando mapa" />
                </View>
              )}
              geolocationEnabled={false}
              thirdPartyCookiesEnabled={false}
              sharedCookiesEnabled={false}
              incognito
              allowFileAccess={false}
              mixedContentMode="never"
              setSupportMultipleWindows={false}
              onError={() => setError(true)}
              onHttpError={({ nativeEvent }) => {
                if (nativeEvent.url === uri || nativeEvent.url?.startsWith(MAP_ORIGIN + '/export/embed.html?')) setError(true);
              }}
            />
          </View>
          <Btn kind="link" onPress={() => setShow(false)}>Ocultar mapa</Btn>
        </>
      ) : (
        <View style={{ backgroundColor: colors.soft, borderRadius: 12, padding: spacing.md,
          alignItems: 'center', gap: spacing.sm }}>
          <Icon name="MapPin" size={26} />
          <T type="small" color={colors.muted} style={{ textAlign: 'center' }}>
            {error ? 'Não foi possível carregar o mapa. Você também pode usar Como chegar.'
              : 'O mapa é carregado do OpenStreetMap, que recebe o IP da conexão.'}
          </T>
          <Btn kind="outline" onPress={open}>{error ? 'Tentar novamente' : 'Mostrar mapa'}</Btn>
        </View>
      )}
    </View>
  );
}
