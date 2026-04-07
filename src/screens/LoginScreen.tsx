import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaView} from 'react-native-safe-area-context';
import {supabase} from '../services/supabase';
import {t} from '../i18n';

let GoogleSignin: any = null;
try {
  const googleSignIn = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignIn.GoogleSignin;
  GoogleSignin.configure({
    webClientId:
      '916951227577-tg9iq1q07e95d595pt07t3qje1jafbl6.apps.googleusercontent.com',
    offlineAccess: true,
  });
} catch {}

type Mode = 'login' | 'signup';

const GUEST_EMAIL_KEY = 'guestAuthEmail';
const GUEST_PASSWORD_KEY = 'guestAuthPassword';
const GUEST_NICKNAME_KEY = 'guestAuthNickname';
const NICKNAME_CACHE_PREFIX = 'nickname_cache_';

function createGuestSeed() {
  return `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

function createGuestNickname() {
  return `게스트${Math.floor(1000 + Math.random() * 9000)}`;
}

function getNicknameCacheKey(userId: string) {
  return `${NICKNAME_CACHE_PREFIX}${userId}`;
}

export default function LoginScreen({
  onLoginSuccess,
}: {
  onLoginSuccess: () => void;
}) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const saveNicknameCache = async (userId: string, value: string | null) => {
    const key = getNicknameCacheKey(userId);
    if (value) {
      await AsyncStorage.setItem(key, value);
    } else {
      await AsyncStorage.removeItem(key);
    }
  };

  const syncProfileNickname = async (
    userId: string,
    options?: {
      fallbackNickname?: string;
      provider?: 'guest' | 'email' | 'google';
    },
  ) => {
    const {data: existingProfile, error} = await supabase
      .from('profiles')
      .select('nickname, provider')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (existingProfile?.nickname) {
      await saveNicknameCache(userId, existingProfile.nickname);
      if (existingProfile.provider === 'guest') {
        await AsyncStorage.setItem(GUEST_NICKNAME_KEY, existingProfile.nickname);
      }
      return existingProfile.nickname;
    }

    if (options?.fallbackNickname) {
      const {error: upsertError} = await supabase.from('profiles').upsert({
        id: userId,
        nickname: options.fallbackNickname,
        provider: options.provider ?? existingProfile?.provider ?? 'email',
      });

      if (upsertError) {
        throw upsertError;
      }

      await saveNicknameCache(userId, options.fallbackNickname);
      if ((options.provider ?? existingProfile?.provider) === 'guest') {
        await AsyncStorage.setItem(GUEST_NICKNAME_KEY, options.fallbackNickname);
      }
      return options.fallbackNickname;
    }

    await saveNicknameCache(userId, null);
    return null;
  };

  const ensureGuestProfile = async (userId: string, guestNickname: string) => {
    await syncProfileNickname(userId, {
      fallbackNickname: guestNickname,
      provider: 'guest',
    });
  };

  const signInWithStoredGuest = async () => {
    const savedEmail = await AsyncStorage.getItem(GUEST_EMAIL_KEY);
    const savedPassword = await AsyncStorage.getItem(GUEST_PASSWORD_KEY);
    const savedNickname =
      (await AsyncStorage.getItem(GUEST_NICKNAME_KEY)) || createGuestNickname();

    if (!savedEmail || !savedPassword) {
      return false;
    }

    const {data, error} = await supabase.auth.signInWithPassword({
      email: savedEmail,
      password: savedPassword,
    });

    if (error || !data.user) {
      return false;
    }

    await ensureGuestProfile(data.user.id, savedNickname);
    return true;
  };

  const createGuestAccountFallback = async () => {
    if (await signInWithStoredGuest()) {
      return;
    }

    const seed = createGuestSeed();
    const guestEmail = `guest_${seed}@blockhero.local`;
    const guestPassword = `Guest#${seed}`;
    const guestNickname =
      (await AsyncStorage.getItem(GUEST_NICKNAME_KEY)) || createGuestNickname();

    const {data, error} = await supabase.auth.signUp({
      email: guestEmail,
      password: guestPassword,
    });

    if (error) {
      throw error;
    }

    let user = data.user;
    if (!data.session) {
      const signInResult = await supabase.auth.signInWithPassword({
        email: guestEmail,
        password: guestPassword,
      });
      if (signInResult.error || !signInResult.data.user) {
        throw signInResult.error || new Error('게스트 로그인에 실패했습니다.');
      }
      user = signInResult.data.user;
    }

    if (!user) {
      throw new Error('게스트 로그인에 실패했습니다.');
    }

    await ensureGuestProfile(user.id, guestNickname);
    await AsyncStorage.setItem(GUEST_EMAIL_KEY, guestEmail);
    await AsyncStorage.setItem(GUEST_PASSWORD_KEY, guestPassword);
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('common.notice'), t('auth.fillFields'));
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        Alert.alert(t('common.notice'), t('auth.passwordMismatch'));
        return;
      }
      if (password.length < 6) {
        Alert.alert(t('common.notice'), t('auth.passwordTooShort'));
        return;
      }
      if (!nickname.trim()) {
        Alert.alert(t('common.notice'), t('auth.enterNickname'));
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const {data, error} = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) {
          throw error;
        }

        if (data.user) {
          await syncProfileNickname(data.user.id, {
            fallbackNickname: nickname.trim(),
            provider: 'email',
          });
        }

        Alert.alert(t('common.notice'), t('auth.signupSuccess'));
        onLoginSuccess();
      } else {
        const {data, error} = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          throw error;
        }
        if (data.user) {
          await syncProfileNickname(data.user.id);
        }
        onLoginSuccess();
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!GoogleSignin) {
      Alert.alert(t('common.notice'), '구글 로그인이 설정되지 않았습니다.');
      return;
    }

    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) {
        throw new Error('구글 로그인에 실패했습니다. 토큰을 가져오지 못했습니다.');
      }

      const {data, error} = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        await syncProfileNickname(data.user.id, {provider: 'google'});
      }

      onLoginSuccess();
    } catch (error: any) {
      if (error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert(t('common.error'), error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const {data, error} = await supabase.auth.signInAnonymously();
      if (error) {
        const message = String(error.message || '');
        if (message.toLowerCase().includes('anonymous sign-ins are disabled')) {
          await createGuestAccountFallback();
        } else {
          throw error;
        }
      } else if (data.user) {
        const guestNickname =
          (await AsyncStorage.getItem(GUEST_NICKNAME_KEY)) || createGuestNickname();
        await syncProfileNickname(data.user.id, {
          fallbackNickname: guestNickname,
          provider: 'guest',
        });
      }
      onLoginSuccess();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={[styles.block, styles.blockPrimary]} />
              <View style={[styles.block, styles.blockSecondary]} />
              <View style={[styles.block, styles.blockAccent]} />
            </View>
            <Text style={styles.title}>BlockHero</Text>
            <Text style={styles.subtitle}>
              {mode === 'login' ? t('auth.loginTitle') : t('auth.signupTitle')}
            </Text>
          </View>

          <View style={styles.form}>
            {mode === 'signup' ? (
              <TextInput
                autoCapitalize="none"
                maxLength={10}
                placeholder={t('auth.nickname')}
                placeholderTextColor="#64748b"
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
              />
            ) : null}

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder={t('auth.email')}
              placeholderTextColor="#64748b"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              placeholder={t('auth.password')}
              placeholderTextColor="#64748b"
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />

            {mode === 'signup' ? (
              <TextInput
                placeholder={t('auth.confirmPassword')}
                placeholderTextColor="#64748b"
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            ) : null}

            <TouchableOpacity
              disabled={loading}
              style={styles.primaryBtn}
              onPress={handleEmailAuth}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === 'login' ? t('auth.login') : t('auth.signup')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              <Text style={styles.toggleText}>
                {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialContainer}>
            <TouchableOpacity
              disabled={loading}
              style={styles.googleBtn}
              onPress={handleGoogleLogin}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>{t('auth.googleLogin')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={loading}
              style={styles.guestBtn}
              onPress={handleGuestLogin}>
              <Text style={styles.guestText}>{t('auth.guestLogin')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {backgroundColor: '#0f0a2e', flex: 1},
  flex: {flex: 1},
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  block: {
    borderRadius: 4,
    height: 24,
    width: 24,
  },
  blockPrimary: {backgroundColor: '#818cf8'},
  blockSecondary: {backgroundColor: '#6366f1'},
  blockAccent: {backgroundColor: '#a78bfa'},
  title: {
    color: '#e2e8f0',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
  },
  subtitle: {
    color: '#a5b4fc',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {gap: 12},
  input: {
    backgroundColor: '#1e1b4b',
    borderColor: '#312e81',
    borderRadius: 12,
    borderWidth: 1,
    color: '#e2e8f0',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 16,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  toggleText: {
    color: '#a5b4fc',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 24,
  },
  dividerLine: {
    backgroundColor: '#312e81',
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  socialContainer: {gap: 12},
  googleBtn: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  googleIcon: {
    color: '#4285F4',
    fontSize: 20,
    fontWeight: '800',
  },
  googleText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '700',
  },
  guestBtn: {
    alignItems: 'center',
    borderColor: '#312e81',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
  },
  guestText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
});
