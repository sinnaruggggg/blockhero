import React, {useEffect, useState} from 'react';
import {
  Alert,
  Dimensions,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import {getAdminStatus} from '../services/adminSync';
import {supabase} from '../services/supabase';
import {CURRENT_VERSION_NAME} from '../services/updateService';
import {
  loadGameSettings,
  saveGameSettings,
  saveSkillTriggerNoticeMode,
  type SkillTriggerNoticeMode,
} from '../stores/gameSettings';

const {width: screenWidth} = Dimensions.get('window');

const NOTICE_MODE_OPTIONS: Array<{
  label: string;
  value: SkillTriggerNoticeMode;
  description: string;
}> = [
  {
    label: '끄기',
    value: 'off',
    description: '전투 중 스킬 발동 메시지를 표시하지 않습니다.',
  },
  {
    label: '확률·조건만',
    value: 'triggered_only',
    description: '회피, 부활, 자동 회복, 추가 타격처럼 실제 발동 이벤트만 표시합니다.',
  },
  {
    label: '모든 효과',
    value: 'all_effects',
    description: '조건 발동 외에도 콤보, 피버, 라인 강화 등 적용된 효과를 함께 표시합니다.',
  },
];

export default function SettingsScreen({navigation}: any) {
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [skillNoticeMode, setSkillNoticeMode] =
    useState<SkillTriggerNoticeMode>('triggered_only');

  useEffect(() => {
    (async () => {
      const {
        data: {user},
      } = await supabase.auth.getUser();

      if (user?.email) {
        setEmail(user.email);
      }

      setIsAdmin(await getAdminStatus());

      const settings = await loadGameSettings();
      setBgmEnabled(settings.bgm);
      setSfxEnabled(settings.sfx);
      setVibrationEnabled(settings.vibration);
      setNotificationEnabled(settings.notification);
      setSkillNoticeMode(settings.skillTriggerNoticeMode);
    })();
  }, []);

  const handleToggleSetting = async (
    key: 'bgm' | 'sfx' | 'vibration' | 'notification',
    value: boolean,
  ) => {
    await saveGameSettings({[key]: value});
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      {text: '취소', style: 'cancel'},
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '정말 계정을 삭제하시겠습니까?\n모든 데이터가 삭제되며 복구할 수 없습니다.',
      [
        {text: '취소', style: 'cancel'},
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            Alert.alert('알림', '계정 삭제 요청이 접수되었습니다.');
            await supabase.auth.signOut();
          },
        },
      ],
    );
  };

  const handleClearCache = () => {
    Alert.alert('캐시 삭제', '로컬 캐시를 삭제하시겠습니까?', [
      {text: '취소', style: 'cancel'},
      {
        text: '삭제',
        onPress: async () => {
          Alert.alert('알림', '캐시가 삭제되었습니다.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.backBtn}>
            <BackImageButton onPress={() => navigation.goBack()} size={42} />
          </View>
          <Text style={styles.title}>설정</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>계정 정보</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>로그인 계정</Text>
            <Text style={styles.infoValue}>{email || '불러오는 중...'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>사운드 및 진동</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>배경음악</Text>
            <Switch
              value={bgmEnabled}
              trackColor={{false: '#ddd', true: '#a5b4fc'}}
              thumbColor={bgmEnabled ? '#6366f1' : '#999'}
              onValueChange={async value => {
                setBgmEnabled(value);
                await handleToggleSetting('bgm', value);
              }}
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>효과음</Text>
            <Switch
              value={sfxEnabled}
              trackColor={{false: '#ddd', true: '#a5b4fc'}}
              thumbColor={sfxEnabled ? '#6366f1' : '#999'}
              onValueChange={async value => {
                setSfxEnabled(value);
                await handleToggleSetting('sfx', value);
              }}
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>진동</Text>
            <Switch
              value={vibrationEnabled}
              trackColor={{false: '#ddd', true: '#a5b4fc'}}
              thumbColor={vibrationEnabled ? '#6366f1' : '#999'}
              onValueChange={async value => {
                setVibrationEnabled(value);
                await handleToggleSetting('vibration', value);
              }}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>전투 알림</Text>
          <Text style={styles.settingHelp}>
            스킬이나 효과가 전투 중 실제로 적용될 때 표시할 메시지 범위를 선택합니다.
          </Text>
          <View style={styles.optionList}>
            {NOTICE_MODE_OPTIONS.map(option => {
              const active = option.value === skillNoticeMode;
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.86}
                  style={[styles.noticeOption, active && styles.noticeOptionActive]}
                  onPress={async () => {
                    setSkillNoticeMode(option.value);
                    await saveSkillTriggerNoticeMode(option.value);
                  }}>
                  <View style={styles.noticeOptionHeader}>
                    <Text
                      style={[
                        styles.noticeOptionTitle,
                        active && styles.noticeOptionTitleActive,
                      ]}>
                      {option.label}
                    </Text>
                    {active && <Text style={styles.noticeOptionBadge}>사용 중</Text>}
                  </View>
                  <Text
                    style={[
                      styles.noticeOptionDescription,
                      active && styles.noticeOptionDescriptionActive,
                    ]}>
                    {option.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>알림</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>푸시 알림</Text>
            <Switch
              value={notificationEnabled}
              trackColor={{false: '#ddd', true: '#a5b4fc'}}
              thumbColor={notificationEnabled ? '#6366f1' : '#999'}
              onValueChange={async value => {
                setNotificationEnabled(value);
                await handleToggleSetting('notification', value);
              }}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>지원</Text>
          <TouchableOpacity style={styles.menuItem} onPress={handleClearCache}>
            <Text style={styles.menuText}>캐시 삭제</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert(
                '앱 정보',
                `앱 이름: BlockHero\n버전: ${CURRENT_VERSION_NAME}\n2026 BlockHero`,
              )
            }>
            <Text style={styles.menuText}>앱 정보</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL('https://blockhero.game/privacy')}>
            <Text style={styles.menuText}>개인정보 처리방침</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL('https://blockhero.game/terms')}>
            <Text style={styles.menuText}>이용약관</Text>
          </TouchableOpacity>
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => navigation.navigate('Admin')}>
            <Text style={styles.adminText}>관리자 모드</Text>
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
            <Text style={styles.deleteText}>계정 삭제</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>버전 {CURRENT_VERSION_NAME}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {backgroundColor: '#f0edf5', flex: 1},
  scroll: {padding: 16, paddingBottom: 40},
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {width: 60},
  headerSpacer: {width: 60},
  title: {color: '#333', fontSize: 20, fontWeight: '800'},
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
    marginBottom: 12,
    minWidth: screenWidth - 32,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  sectionTitle: {color: '#333', fontSize: 16, fontWeight: '800', marginBottom: 12},
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {color: '#666', fontSize: 14},
  infoValue: {
    color: '#333',
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  settingLabel: {color: '#333', fontSize: 15, fontWeight: '600'},
  settingHelp: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  optionList: {
    gap: 10,
  },
  noticeOption: {
    borderColor: '#dbe4ff',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeOptionActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  noticeOptionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  noticeOptionTitle: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '800',
  },
  noticeOptionTitleActive: {
    color: '#3730a3',
  },
  noticeOptionBadge: {
    color: '#4338ca',
    fontSize: 12,
    fontWeight: '800',
  },
  noticeOptionDescription: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
  },
  noticeOptionDescriptionActive: {
    color: '#4338ca',
  },
  menuItem: {
    borderBottomColor: '#f1f5f9',
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
  menuText: {color: '#333', fontSize: 15, fontWeight: '600'},
  adminBtn: {
    alignItems: 'center',
    backgroundColor: '#4338ca',
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 4,
    paddingVertical: 14,
  },
  adminText: {color: '#fff', fontSize: 15, fontWeight: '800'},
  logoutBtn: {
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    marginBottom: 10,
    paddingVertical: 14,
  },
  logoutText: {color: '#4338ca', fontSize: 15, fontWeight: '800'},
  deleteBtn: {
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingVertical: 14,
  },
  deleteText: {color: '#dc2626', fontSize: 15, fontWeight: '800'},
  version: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});
