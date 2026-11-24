import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
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

export default function ClinicMap({ name, latitude, longitude, onDirections, directionsBusy = false }) {
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const available = validCoordinates(latitude, longitude);
  const expanded = available && show && !error;
  const uri = available ? mapUrl(latitude, longitude) : null;

  function toggleMap() {
    if (expanded) {
      setShow(false);
    } else {
      setError(false);
      setShow(true);
    }
  }

  if (!available) {
    return (
      <Btn kind="outline" icon="Navigation" disabled={directionsBusy} onPress={onDirections}>
        Como chegar
      </Btn>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {expanded && (
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
              onError={() => setError(true)}
              onHttpError={({ nativeEvent }) => {
                if (nativeEvent.url === uri || nativeEvent.url?.startsWith(MAP_ORIGIN + '/export/embed.html?')) setError(true);
              }}
            />
        </View>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
        alignItems: 'center', columnGap: spacing.md, rowGap: spacing.xs }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={toggleMap}
          style={({ pressed }) => ({ minHeight: 44, maxWidth: '100%', flexDirection: 'row',
            alignItems: 'center', gap: spacing.xs, opacity: pressed ? 0.65 : 1 })}
        >
          <Icon name="MapPin" size={17} />
          <T type="bold" color={colors.brand} style={{ flexShrink: 1 }}>
            {expanded ? 'Ocultar mapa' : error ? 'Tentar novamente' : 'Mostrar mapa'}
          </T>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: directionsBusy }}
          disabled={directionsBusy}
          onPress={onDirections}
          style={({ pressed }) => ({ minHeight: 44, maxWidth: '100%', flexDirection: 'row',
            alignItems: 'center', gap: spacing.xs, opacity: directionsBusy ? 0.5 : pressed ? 0.65 : 1 })}
        >
          <Icon name="Navigation" size={17} />
          <T type="bold" color={colors.brand} style={{ flexShrink: 1 }}>Como chegar</T>
        </Pressable>
      </View>
      {!expanded && (
        <T type="small" color={error ? colors.danger : colors.muted}>
          {error ? 'Mapa indisponível. Tente novamente.' : 'Ao abrir, o OpenStreetMap recebe seu IP.'}
        </T>
      )}
    </View>
  );
}
