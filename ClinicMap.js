import React, { useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Btn, T, colors, spacing } from './ui';

const MAP_ORIGIN = 'https://www.openstreetmap.org';
// Compacta apenas o rodapé do mapa externo, mantendo crédito e links originais.
const compactAttribution = `
(function () {
  if (location.origin !== 'https://www.openstreetmap.org' || location.pathname !== '/export/embed.html') return;
  if (window.__lifehubAttribution) return;
  window.__lifehubAttribution = true;

  function compact() {
    document.querySelectorAll('.maplibregl-ctrl-attrib-inner, .leaflet-control-attribution').forEach(function (footer) {
      if (footer.querySelector('[data-lifehub-credit]')) return;
      var links = Array.from(footer.querySelectorAll('a'));
      var credit = links.find(function (link) {
        return link.origin === location.origin && link.pathname === '/copyright';
      });
      if (!credit) return;
      // Não compactar créditos de outros fornecedores ou camadas desconhecidas.
      if (links.some(function (link) {
        return link !== credit &&
          !link.classList.contains('donate-attr') &&
          !link.classList.contains('maplibregl-ctrl-attrib-report-link') &&
          !link.pathname.startsWith('/fixthemap') &&
          !link.pathname.endsWith('/Terms_of_Use') &&
          link.hostname !== 'donate.openstreetmap.org';
      })) return;

      var original = Array.from(footer.childNodes);
      var label = credit.cloneNode(true);
      label.textContent = '© OpenStreetMap';
      label.setAttribute('data-lifehub-credit', '1');
      label.setAttribute('aria-label', 'Créditos e licença do OpenStreetMap');
      var details = document.createElement('details');
      details.style.cssText = 'display:inline-block;position:relative;margin-left:6px;vertical-align:baseline;';
      var summary = document.createElement('summary');
      summary.textContent = 'ⓘ';
      summary.setAttribute('aria-label', 'Informações e links do mapa');
      summary.style.cssText = 'display:inline;cursor:pointer;list-style:none;font-size:14px;';
      var panel = document.createElement('div');
      panel.style.cssText = 'position:absolute;bottom:100%;right:0;width:210px;max-width:75vw;white-space:normal;background:white;color:#25332e;padding:8px;border:1px solid #cdd6cc;border-radius:6px;z-index:10;line-height:1.5;';
      original.forEach(function (node) { panel.appendChild(node); });
      details.appendChild(summary);
      details.appendChild(panel);
      footer.appendChild(label);
      footer.appendChild(details);
      footer.style.fontSize = '12px';
      footer.style.lineHeight = '18px';
    });
  }
  compact();
  new MutationObserver(compact).observe(document.body, { childList: true, subtree: true });
})();
true;
`;

function mapUrl(latitude, longitude) {
  const bbox = [longitude - 0.003, latitude - 0.002, longitude + 0.003, latitude + 0.002]
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
              injectedJavaScript={compactAttribution}
              onShouldStartLoadWithRequest={(request) => {
                if (request.url === 'about:blank' || request.url.startsWith(MAP_ORIGIN + '/export/embed.html?')) return true;
                if (request.url === MAP_ORIGIN + '/copyright' ||
                    request.url.startsWith(MAP_ORIGIN + '/fixthemap') ||
                    request.url.startsWith('https://donate.openstreetmap.org/') ||
                    request.url === 'https://wiki.osmfoundation.org/wiki/Terms_of_Use') {
                  Linking.openURL(request.url).catch(() => {});
                }
                return false;
              }}
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
