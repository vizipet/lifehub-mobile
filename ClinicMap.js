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

  const actionStyle = { flexGrow: 1, flexShrink: 1, flexBasis: 120 };
  return (
    <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 12,
      backgroundColor: colors.card, overflow: 'hidden' }}>
      {expanded ? (
        <View style={{ height: 180, width: '100%', backgroundColor: colors.soft }}>
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
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
          backgroundColor: colors.soft, padding: spacing.md }}>
          <View style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10,
            backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={error ? 'CircleAlert' : 'MapPin'} size={22} color={error ? colors.danger : colors.brand} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
            <T type="bold">{error ? 'Mapa indisponível' : 'Mapa da clínica'}</T>
            <T type="small" color={colors.muted}>
              {error ? 'Tente novamente ou use as rotas.' : 'OpenStreetMap externo · recebe seu IP.'}
            </T>
          </View>
        </View>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
        padding: spacing.sm, borderTopWidth: 1, borderColor: colors.line }}>
        <Btn kind="outline" style={actionStyle} onPress={toggleMap}>
          {expanded ? 'Ocultar mapa' : error ? 'Tentar novamente' : 'Mostrar mapa'}
        </Btn>
        <Btn icon="Navigation" style={actionStyle} disabled={directionsBusy} onPress={onDirections}>
          Como chegar
        </Btn>
      </View>
    </View>
  );
}
