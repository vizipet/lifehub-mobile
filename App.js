import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, View, useWindowDimensions } from 'react-native';
import {
  NavigationContainer,
  TabRouter,
  createNavigatorFactory,
  useNavigationBuilder,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccount, useSession, Session } from './api';
import { T, Logo, Icon, Btn, FontScale, colors, s, spacing } from './ui';
import { Welcome, Login, Register, Recovery } from './Auth';
import Home from './Home';
import Search from './Search';
import Agenda from './Agenda';
import Doctor, { Review, Success } from './Booking';
import { Profile, Notifications, Campaigns } from './Account';
import Family from './Family';
const Stack = createNativeStackNavigator();
const tabIcons = {
  Início: 'House',
  Buscar: 'Search',
  Agenda: 'CalendarDays',
  Campanhas: 'Megaphone',
  Perfil: 'User',
};
function PatientTabNavigator({ children, initialRouteName }) {
  const { width, fontScale } = useWindowDimensions();
  const { left, right } = useSafeAreaInsets();
  const compact = (width - left - right) / 5 < 74 || fontScale > 1.2;
  const { state, navigation, descriptors, NavigationContent } = useNavigationBuilder(TabRouter, {
    children,
    initialRouteName,
    backBehavior: 'history',
  });
  return (
    <NavigationContent>
      <View style={s.page}>
        {state.routes.map((route, index) => (
          <View
            key={route.key}
            style={{ flex: 1, display: index === state.index ? 'flex' : 'none' }}
          >
            {descriptors[route.key].render()}
          </View>
        ))}
      </View>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          backgroundColor: colors.card,
          borderTopColor: colors.line,
          borderTopWidth: 1,
        }}
      >
        {state.routes.map((route, i) => {
          const active = i === state.index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={route.name}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!active && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{
                flex: 1,
                minHeight: 56,
                minWidth: 0,
                paddingHorizontal: 1,
                paddingVertical: spacing.sm,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                backgroundColor: active ? colors.soft : colors.card,
                borderTopWidth: 2,
                borderTopColor: active ? colors.brand : 'transparent',
              }}
            >
              <Icon
                name={tabIcons[route.name]}
                color={active ? colors.brand : colors.muted}
                size={21}
              />
              <T
                type={compact ? "tabCompact" : "tab"}
                style={{ textAlign: 'center', flexShrink: 1 }}
                color={active ? colors.brand : colors.muted}
              >
                {route.name}
              </T>
            </Pressable>
          );
        })}
      </View>
    </NavigationContent>
  );
}
const Tabs = createNavigatorFactory(PatientTabNavigator)();
function Main() {
  return (
    <Tabs.Navigator initialRouteName="Início">
      <Tabs.Screen name="Início" component={Home} />
      <Tabs.Screen name="Buscar" component={Search} />
      <Tabs.Screen name="Agenda" component={Agenda} />
      <Tabs.Screen name="Campanhas" component={Campaigns} />
      <Tabs.Screen name="Perfil" component={Profile} />
    </Tabs.Navigator>
  );
}
function Tool({ label, icon, text, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: 44, minHeight: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}
    >
      {icon ? (
        <Icon name={icon} />
      ) : (
        <T type="bold" color={colors.brand}>
          {text}
        </T>
      )}
    </Pressable>
  );
}
function Header({ navigation, back, route }) {
  const { user, large, toggleSize, end } = useSession();
  const { width } = useWindowDimensions();
  const { left, right } = useSafeAreaInsets();
  const available = width - left - right - 2 * spacing.md - (user ? 132 : 44) - (back ? 44 : 0) - spacing.sm;
  const logoWidth = Math.max(0, Math.min(144, available));
  return (
    <View
      style={{
        paddingHorizontal: spacing.md,
        minHeight: 56,
        paddingVertical: 3,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        backgroundColor: colors.card,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
      }}
    >
      <View style={[s.row, { gap: 0, flex: 1, minWidth: 0 }]}>
        {back && <Tool label="Voltar" icon="ArrowLeft" onPress={() => navigation.goBack()} />}
        {logoWidth > 0 && <Logo width={logoWidth} />}
      </View>
      <View style={[s.row, { gap: 0 }]}>
        <Tool
          label={large ? 'Usar tamanho de texto padrão' : 'Ampliar texto'}
          text={large ? 'A−' : 'A+'}
          onPress={toggleSize}
        />
        {user && (
          <>
            <Tool
              label="Abrir notificações"
              icon="Bell"
              onPress={() => {
                if (route.name !== 'Notificações') navigation.navigate('Notificações');
              }}
            />
            <Tool label="Sair da conta" icon="LogOut" onPress={end} />
          </>
        )}
      </View>
    </View>
  );
}
export default function App() {
  const account = useAccount(),
    [large, setLarge] = useState(false);
  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[s.page, { backgroundColor: colors.card }]}
        edges={['top', 'left', 'right', 'bottom']}
      >
        <StatusBar barStyle="dark-content" />
        <Session.Provider value={{ ...account, large, toggleSize: () => setLarge((x) => !x) }}>
          <FontScale.Provider value={large ? 1.16 : 1}>
            {account.restoring ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
                <Logo width={180} />
                {account.restoreError ? (
                  <>
                    <T color={colors.muted} style={{ textAlign: 'center' }}>{account.restoreError}</T>
                    <Btn onPress={account.restore}>Tentar novamente</Btn>
                    <Btn kind="link" onPress={account.end}>Sair da conta</Btn>
                  </>
                ) : (
                  <>
                    <ActivityIndicator color={colors.brand} accessibilityLabel="Restaurando sessão" />
                    <T color={colors.muted}>Restaurando sua sessão…</T>
                  </>
                )}
              </View>
            ) : (
            <NavigationContainer>
              <Stack.Navigator
                screenOptions={{
                  header: (props) => <Header {...props} />,
                  contentStyle: { backgroundColor: colors.bg },
                }}
              >
                {account.user ? (
                  <Stack.Group navigationKey="patient">
                    <Stack.Screen name="Principal" component={Main} />
                    <Stack.Screen name="Médico" component={Doctor} />
                    <Stack.Screen name="Revisar" component={Review} />
                    <Stack.Screen name="Agendado" component={Success} />
                    <Stack.Screen name="Dependentes" component={Family} />
                    <Stack.Screen name="Notificações" component={Notifications} />
                  </Stack.Group>
                ) : (
                  <Stack.Group navigationKey="public">
                    <Stack.Screen name="LifeHub" component={Welcome} />
                    <Stack.Screen name="Entrar" component={Login} />
                    <Stack.Screen name="Cadastro" component={Register} />
                    <Stack.Screen name="Recuperar acesso" component={Recovery} />
                  </Stack.Group>
                )}
              </Stack.Navigator>
            </NavigationContainer>
            )}
          </FontScale.Provider>
        </Session.Provider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
