import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, View, useWindowDimensions } from 'react-native';
import { request, useSession, useAction } from './api';
import { T, Page, Card, Btn, Field, Check, Notice, Sheet, s, colors, spacing } from './ui';
import { onlyDigits, isValidCpf, maskCpf, maskPhone, todayKey } from './format';
import legal from './legal.json';
const post = (path, body) => request(path, { method: 'POST', body });

export function BirthField({ value, onChange }) {
  return (
    <Field
      label="Nascimento (DD/MM/AAAA)"
      placeholder="DD/MM/AAAA"
      keyboardType="number-pad"
      value={value}
      onChangeText={(v) =>
        onChange(
          onlyDigits(v)
            .slice(0, 8)
            .replace(/^(\d{2})(\d)/, '$1/$2')
            .replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2'),
        )
      }
    />
  );
}
export function birthISO(value) {
  const [d, m, y] = value.split('/');
  const iso = [y, m, d].join('-');
  const date = new Date(iso + 'T12:00:00Z');
  if (
    !/^\d{4}-\d\d-\d\d$/.test(iso) ||
    !Number.isFinite(+date) ||
    date.toISOString().slice(0, 10) !== iso ||
    iso < '1900-01-01' ||
    iso > todayKey()
  )
    throw Error('Confira o dia, o mês e o ano do nascimento.');
  return iso;
}
function validPassword(value, confirm) {
  if (value.length < 8 || !/[A-Za-z]/.test(value) || !/[0-9]/.test(value))
    throw Error('Use uma senha com pelo menos oito caracteres, letras e números.');
  if (value !== confirm) throw Error('As senhas precisam ser iguais.');
}

export function Welcome({ navigation }) {
  const { width } = useWindowDimensions();
  // Page is capped at 480 dp and has horizontal padding on both sides.
  // Explicit height avoids intrinsic image sizing inside a scroll container.
  const bannerWidth = Math.max(1, Math.min(width, 480) - spacing.lg * 2 - 2);
  const bannerHeight = Math.min(230, Math.round(bannerWidth / 1.65));
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let mounted = true;
    let animation;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (mounted && !reduced) {
          opacity.setValue(0.6);
          animation = Animated.timing(opacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          });
          animation.start();
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
      animation?.stop();
    };
  }, [opacity]);
  return (
    <Page contentStyle={{ maxWidth: 480 }}>
      <Animated.View style={{ opacity, width: '100%' }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ width: '100%', height: bannerHeight, overflow: 'hidden', flexShrink: 0, backgroundColor: colors.soft }}>
            <Image
              accessible
              accessibilityLabel="Médico conversando com uma paciente"
              source={require('./assets/conversa-hero.jpg')}
              style={{ width: '100%', height: bannerHeight, flexShrink: 0 }}
              resizeMode="cover"
            />
          </View>
          <View style={{ padding: spacing.xl, gap: spacing.md }}>
            <T type="title">Sua consulta, sem demora.</T>
            <T color={colors.muted}>
              Encontre médicos em Recife, veja o próximo horário livre e agende em poucos toques.
              Para você e para quem você cuida.
            </T>
            <Btn style={{ marginTop: spacing.xs }} onPress={() => navigation.navigate('Cadastro')}>Criar minha conta</Btn>
            <Btn kind="outline" onPress={() => navigation.navigate('Entrar')}>
              Já tenho conta
            </Btn>
          </View>
        </Card>
      </Animated.View>
    </Page>
  );
}
export function Login({ navigation, route }) {
  const { start } = useSession(),
    action = useAction();
  const [login, setLogin] = useState(route.params?.email || ''),
    [password, setPassword] = useState('');
  const offset = useRef(new Animated.Value(0)).current;
  function submit() {
    action.run(async () => {
      try {
        if (!login.trim() || !password) throw Error('Informe seu e-mail ou CPF e sua senha.');
        const { data } = await post('/auth/login', { login: login.trim(), password });
        if (data.user.role !== 'PATIENT') throw Error('Entre com uma conta de paciente.');
        await start(data);
      } catch (e) {
        if (!(await AccessibilityInfo.isReduceMotionEnabled().catch(() => true)))
          Animated.sequence(
            [-5, 5, -3, 0].map((toValue) =>
              Animated.timing(offset, { toValue, duration: 55, useNativeDriver: true }),
            ),
          ).start();
        throw e;
      }
    });
  }
  return (
    <Page>
      <Card>
        <T type="title">Bem-vindo de volta</T>
        <T color={colors.muted}>Entre com seu e-mail ou CPF.</T>
        <Notice>{route.params?.message}</Notice>
        <Animated.View style={{ gap: 12, transform: [{ translateX: offset }] }}>
          <Field
            label="E-mail ou CPF"
            autoCapitalize="none"
            autoCorrect={false}
            value={/^[\d.\-\s]+$/.test(login) ? maskCpf(login) : login}
            onChangeText={setLogin}
          />
          <Field
            label="Senha"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
          />
        </Animated.View>
        <Notice error>{action.error}</Notice>
        <Btn disabled={action.busy} onPress={submit}>
          {action.busy ? 'Entrando…' : 'Entrar'}
        </Btn>
        <Btn kind="link" onPress={() => navigation.navigate('Recuperar acesso')}>
          Esqueci minha senha
        </Btn>
        <Btn kind="outline" onPress={() => navigation.navigate('Cadastro')}>
          Criar conta
        </Btn>
      </Card>
    </Page>
  );
}
export function Register({ navigation }) {
  const { start } = useSession(),
    action = useAction();
  const [form, setForm] = useState({}),
    [accept, setAccept] = useState({}),
    [doc, setDoc] = useState('');
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const field = (key, label, props = {}, mask = (v) => v) => (
    <Field
      key={key}
      label={label}
      value={form[key] || ''}
      onChangeText={(v) => set(key, mask(v))}
      {...props}
    />
  );
  const docs = Object.keys(legal);
  function submit() {
    action.run(async () => {
      const {
        name = '',
        email = '',
        phone = '',
        cpf = '',
        birth = '',
        pwd = '',
        confirm = '',
      } = form;
      if (name.trim().length < 3 || !email.includes('@') || onlyDigits(phone).length < 10)
        throw Error('Confira o nome, o e-mail e o telefone.');
      if (!isValidCpf(cpf)) throw Error('Confira o CPF informado.');
      const birthDate = birthISO(birth);
      validPassword(pwd, confirm);
      if (!docs.every((k) => accept[k])) throw Error('Leia e confirme os três consentimentos.');
      await post('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        phone: onlyDigits(phone),
        cpf: onlyDigits(cpf),
        birthDate,
        password: pwd,
        acceptTerms: true,
        acceptPrivacyPolicy: true,
        acceptHealthData: true,
      });
      try {
        const { data } = await post('/auth/login', { login: email.trim(), password: pwd });
        await start(data);
      } catch {
        navigation.replace('Entrar', {
          email: email.trim(),
          message: 'Conta criada. Entre com seu e-mail e senha.',
        });
      }
    });
  }
  return (
    <Page>
      <T type="title">Crie sua conta</T>
      <Card>
        {field('name', 'Nome completo')}
        {field('email', 'E-mail', { autoCapitalize: 'none', keyboardType: 'email-address' })}
        {field('phone', 'Telefone', { keyboardType: 'phone-pad' }, maskPhone)}
        {field('cpf', 'CPF', { keyboardType: 'number-pad' }, maskCpf)}
        <BirthField value={form.birth || ''} onChange={(v) => set('birth', v)} />
        {field('pwd', 'Senha', { secureTextEntry: true })}
        <T type="small">Use ao menos oito caracteres, com letras e números.</T>
        {field('confirm', 'Confirmar senha', { secureTextEntry: true })}
      </Card>
      <Card>
        <T type="heading">Consentimentos</T>
        {docs.map((k) => (
          <View key={k}>
            <Btn kind="link" onPress={() => setDoc(k)}>
              {k}
            </Btn>
            <Check value={!!accept[k]} onChange={(v) => setAccept((a) => ({ ...a, [k]: v }))}>
              {'Li e aceito: ' + k}
            </Check>
          </View>
        ))}
      </Card>
      <Notice error>{action.error}</Notice>
      <Btn disabled={action.busy} onPress={submit}>
        {action.busy ? 'Criando conta…' : 'Criar conta'}
      </Btn>
      <Sheet visible={!!doc} title={doc} onClose={() => setDoc('')}>
        {legal[doc]?.map((line, i) => (
          <T key={i} type={line.heading ? 'bold' : 'body'}>
            {line.text}
          </T>
        ))}
        <Btn onPress={() => setDoc('')}>Voltar ao cadastro</Btn>
      </Sheet>
    </Page>
  );
}
export function Recovery({ navigation }) {
  const action = useAction();
  const [email, setEmail] = useState(''),
    [reset, setReset] = useState(false),
    [link, setLink] = useState(''),
    [pwd, setPwd] = useState(''),
    [confirm, setConfirm] = useState(''),
    [message, setMessage] = useState('');
  function submit() {
    action.run(async () => {
      if (!reset) {
        if (!email.trim().includes('@')) throw Error('Informe seu e-mail.');
        await post('/auth/password-reset/request', { email: email.trim() });
        setMessage('Se a conta existir, ela receberá um link de recuperação.');
        setReset(true);
        return;
      }
      validPassword(pwd, confirm);
      const token = link.trim().match(/[#?&]token=([^&\s]+)/)?.[1] || link.trim();
      if (!token) throw Error('Cole o link ou o código de recuperação.');
      await post('/auth/password-reset/confirm', {
        token: decodeURIComponent(token),
        newPassword: pwd,
      });
      navigation.replace('Entrar', { message: 'Senha atualizada. Você já pode entrar.' });
    });
  }
  return (
    <Page>
      <Card>
        <T type="title">{reset ? 'Criar nova senha' : 'Recuperar acesso'}</T>
        <Notice>{message}</Notice>
        {reset ? (
          <>
            <Field
              label="Link ou código recebido"
              autoCapitalize="none"
              autoCorrect={false}
              value={link}
              onChangeText={setLink}
            />
            <Field label="Nova senha" secureTextEntry value={pwd} onChangeText={setPwd} />
            <Field
              label="Confirmar nova senha"
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
            />
          </>
        ) : (
          <Field
            label="E-mail"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        )}
        <Notice error>{action.error}</Notice>
        <Btn disabled={action.busy} onPress={submit}>
          {reset ? 'Salvar nova senha' : 'Solicitar link'}
        </Btn>
        {!reset && (
          <Btn
            kind="link"
            onPress={() => {
              setReset(true);
              action.clear();
            }}
          >
            Já tenho o link
          </Btn>
        )}
      </Card>
    </Page>
  );
}
