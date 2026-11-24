import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Btn, T, colors, spacing } from './ui';

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

export default function ClinicMap({ name, latitude, longitude, onDirections, directionsBusy = false }) {
  const [failedUri, setFailedUri] = useState(null);
  const uri = validCoordinates(latitude, longitude) ? mapUrl(latitude, longitude) : null;
  return (
    <View style={{ gap: spacing.sm }}>
      {uri && failedUri !== uri && (
        <>
          <T type="small" color={colors.muted}>Mapa externo · OpenStreetMap recebe seu IP.</T>
          <View style={{ height: 180, width: '100%', borderRadius: 10, overflow: 'hidden',
            backgroundColor: colors.soft }}>
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
              onError={() => setFailedUri(uri)}
              onHttpError={({ nativeEvent }) => {
                if (nativeEvent.url === uri || nativeEvent.url?.startsWith(MAP_ORIGIN + '/export/embed.html?')) setFailedUri(uri);
              }}
            />
          </View>
        </>
      )}
      {uri && failedUri === uri && (
        <T type="small" color={colors.muted}>Mapa indisponível no momento.</T>
      )}
      <Btn kind="outline" icon="Navigation" disabled={directionsBusy} onPress={onDirections}>
        Como chegar
      </Btn>
    </View>
  );
}
