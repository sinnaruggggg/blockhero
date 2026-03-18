import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {supabase} from '../services/supabase';
import {t} from '../i18n';

let GoogleSignin: any = null;
try {
  const gsi = require('@react-native-google-signin/google-signin');
  GoogleSignin = gsi.GoogleSignin;
  // Google Cloud Console > APIs & Credentials > OAuth 2.0 Client ID (Web)
  // Supabase Dashboard > Authentication > Providers > Google 에 같은 Client ID 설정
  GoogleSignin.configure({
    webClientId: '916951227577-tg9iq1q07e95d595pt07t3qje1jafbl6.apps.googleusercontent.com',
    offlineAccess: true,
  });
} catch {
  // Google Sign-In not available
}

type Mode = 'login' | 'signup';

export default function LoginScreen({onLoginSuccess}: {onLoginSuccess: () => void}) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

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
        if (error) throw error;
        // 프로필 직접 생성
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            nickname: nickname.trim(),
            provider: 'email',
          });
        }
        Alert.alert(t('common.notice'), t('auth.signupSuccess'));
        onLoginSuccess();
      } else {
        const {error} = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        onLoginSuccess();
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!GoogleSignin) {
      Alert.alert(t('common.notice'), 'Google Sign-In is not configured.');
      return;
    }
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) {
        throw new Error('Google Sign-In failed: no ID token');
      }

      const {error} = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;
      onLoginSuccess();
    } catch (err: any) {
      if (err.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert(t('common.error'), err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const {error} = await supabase.auth.signInAnonymously();
      if (error) throw error;
      onLoginSuccess();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message);
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={[styles.block, {backgroundColor: '#818cf8'}]} />
              <View style={[styles.block, {backgroundColor: '#6366f1'}]} />
              <View style={[styles.block, {backgroundColor: '#a78bfa'}]} />
            </View>
            <Text style={styles.title}>CUBRICKS</Text>
            <Text style={styles.subtitle}>
              {mode === 'login' ? t('auth.loginTitle') : t('auth.signupTitle')}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'signup' && (
              <TextInput
                style={styles.input}
                placeholder={t('auth.nickname')}
                placeholderTextColor="#64748b"
                value={nickname}
                onChangeText={setNickname}
                maxLength={10}
                autoCapitalize="none"
              />
            )}

            <TextInput
              style={styles.input}
              placeholder={t('auth.email')}
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder={t('auth.password')}
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {mode === 'signup' && (
              <TextInput
                style={styles.input}
                placeholder={t('auth.confirmPassword')}
                placeholderTextColor="#64748b"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            )}

            {/* Email Auth Button */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleEmailAuth}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === 'login' ? t('auth.login') : t('auth.signup')}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Login/Signup */}
            <TouchableOpacity
              onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              <Text style={styles.toggleText}>
                {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login */}
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleLogin}
              disabled={loading}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>{t('auth.googleLogin')}</Text>
            </TouchableOpacity>

            {/* Guest Login */}
            <TouchableOpacity
              style={styles.guestBtn}
              onPress={handleGuestLogin}
              disabled={loading}>
              <Text style={styles.guestText}>{t('auth.guestLogin')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0a2e',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
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
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#e2e8f0',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#a5b4fc',
    marginTop: 8,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: '#1e1b4b',
    color: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#312e81',
  },
  primaryBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  toggleText: {
    color: '#a5b4fc',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#312e81',
  },
  dividerText: {
    color: '#64748b',
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
  },
  socialContainer: {
    gap: 12,
  },
  googleBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '700',
  },
  guestBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#312e81',
  },
  guestText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
});
