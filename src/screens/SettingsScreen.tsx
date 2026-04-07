import React, {useEffect, useState} from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import GamePanel from '../components/GamePanel';
import MenuScreenFrame from '../components/MenuScreenFrame';
import {getAdminStatus} from '../services/adminSync';
import {openGameDialog, showGameConfirm} from '../services/gameDialogService';
import {supabase} from '../services/supabase';
import {CURRENT_VERSION_NAME} from '../services/updateService';
import {
  loadGameSettings,
  saveGameSettings,
  saveSkillTriggerNoticeMode,
  type SkillTriggerNoticeMode,
} from '../stores/gameSettings';

const NOTICE_MODE_OPTIONS: Array<{
  label: string;
  value: SkillTriggerNoticeMode;
  description: string;
}> = [
  {
    label: '끄기',
    value: 'off',
    description: '전투 중 스킬과 효과 알림을 표시하지 않습니다.',
  },
  {
    label: '확률·조건만',
    value: 'triggered_only',
    description: '회피, 부활, 자동 회복, 추가타처럼 실제 발동한 이벤트만 보여줍니다.',
  },
  {
    label: '모든 효과',
    value: 'all_effects',
    description: '기본 발동 외에도 콤보, 피버, 강화 적용 순간까지 같이 보여줍니다.',
  },
];

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        trackColor={{false: '#d1bea4', true: '#c59c55'}}
        thumbColor={value ? '#6e4926' : '#8a7b67'}
        onValueChange={onChange}
      />
    </View>
  );
}

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

  const handleLogout = async () => {
    const confirmed = await showGameConfirm({
      title: '로그아웃',
      message: '정말 로그아웃하시겠습니까?',
      confirmText: '로그아웃',
    });
    if (confirmed) {
      await supabase.auth.signOut();
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await showGameConfirm({
      title: '계정 삭제',
      message: '정말 계정을 삭제하시겠습니까?\n모든 데이터가 삭제되며 복구할 수 없습니다.',
      confirmText: '삭제',
      variant: 'error',
    });
    if (!confirmed) {
      return;
    }

    openGameDialog({title: '알림', message: '계정 삭제 요청이 접수되었습니다.'});
    await supabase.auth.signOut();
  };

  const handleClearCache = async () => {
    const confirmed = await showGameConfirm({
      title: '캐시 삭제',
      message: '로컬 캐시를 삭제하시겠습니까?',
      confirmText: '삭제',
    });
    if (!confirmed) {
      return;
    }

    openGameDialog({title: '알림', message: '캐시가 삭제되었습니다.'});
  };

  return (
    <MenuScreenFrame
      title="설정"
      subtitle="사운드, 알림, 계정과 지원 메뉴를 한 번에 관리합니다."
      onBack={() => navigation.goBack()}>
      <GamePanel>
        <Text style={styles.sectionTitle}>계정 정보</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>로그인 계정</Text>
          <Text style={styles.infoValue}>{email || '불러오는 중...'}</Text>
        </View>
      </GamePanel>

      <GamePanel>
        <Text style={styles.sectionTitle}>사운드와 입력</Text>
        <ToggleRow
          label="배경 음악"
          value={bgmEnabled}
          onChange={async value => {
            setBgmEnabled(value);
            await handleToggleSetting('bgm', value);
          }}
        />
        <ToggleRow
          label="효과음"
          value={sfxEnabled}
          onChange={async value => {
            setSfxEnabled(value);
            await handleToggleSetting('sfx', value);
          }}
        />
        <ToggleRow
          label="진동"
          value={vibrationEnabled}
          onChange={async value => {
            setVibrationEnabled(value);
            await handleToggleSetting('vibration', value);
          }}
        />
      </GamePanel>

      <GamePanel>
        <Text style={styles.sectionTitle}>전투 알림</Text>
        <Text style={styles.sectionHint}>
          스킬과 전투 효과 알림 범위를 선택합니다.
        </Text>
        <View style={styles.optionList}>
          {NOTICE_MODE_OPTIONS.map(option => {
            const active = option.value === skillNoticeMode;
            return (
              <TouchableOpacity
                key={option.value}
                activeOpacity={0.9}
                style={[styles.optionCard, active && styles.optionCardActive]}
                onPress={async () => {
                  setSkillNoticeMode(option.value);
                  await saveSkillTriggerNoticeMode(option.value);
                }}>
                <View style={styles.optionHeader}>
                  <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                    {option.label}
                  </Text>
                  {active ? <Text style={styles.optionBadge}>사용 중</Text> : null}
                </View>
                <Text
                  style={[
                    styles.optionDescription,
                    active && styles.optionDescriptionActive,
                  ]}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </GamePanel>

      <GamePanel>
        <Text style={styles.sectionTitle}>일반 알림</Text>
        <ToggleRow
          label="푸시 알림"
          value={notificationEnabled}
          onChange={async value => {
            setNotificationEnabled(value);
            await handleToggleSetting('notification', value);
          }}
        />
      </GamePanel>

      <GamePanel>
        <Text style={styles.sectionTitle}>지원</Text>
        <TouchableOpacity style={styles.menuItem} onPress={handleClearCache}>
          <Text style={styles.menuText}>캐시 삭제</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            Alert.alert(
              '앱 정보',
              `버전: ${CURRENT_VERSION_NAME}\n제작: BlockHero\nCopyright 2026`,
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
          style={[styles.menuItem, styles.menuItemLast]}
          onPress={() => Linking.openURL('https://blockhero.game/terms')}>
          <Text style={styles.menuText}>이용약관</Text>
        </TouchableOpacity>
      </GamePanel>

      {isAdmin ? (
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => navigation.navigate('Admin')}>
          <Text style={styles.adminButtonText}>관리자 모드</Text>
        </TouchableOpacity>
      ) : null}

      <GamePanel>
        <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
          <Text style={styles.actionButtonText}>로그아웃</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDeleteAccount}>
          <Text style={styles.deleteButtonText}>계정 삭제</Text>
        </TouchableOpacity>
      </GamePanel>

      <Text style={styles.versionText}>버전 {CURRENT_VERSION_NAME}</Text>
    </MenuScreenFrame>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: '#4f3118',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
  },
  sectionHint: {
    color: '#876346',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#f9ecd6',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d2b089',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  infoLabel: {
    color: '#886447',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  infoValue: {
    color: '#4b2f18',
    fontSize: 16,
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8ecd6',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d2b089',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  toggleLabel: {
    color: '#4f3118',
    fontSize: 15,
    fontWeight: '800',
  },
  optionList: {
    gap: 10,
  },
  optionCard: {
    backgroundColor: '#fff9ef',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#d5b48f',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  optionCardActive: {
    backgroundColor: '#f5e6cb',
    borderColor: '#7f5a32',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  optionTitle: {
    color: '#4f3118',
    fontSize: 15,
    fontWeight: '900',
  },
  optionTitleActive: {
    color: '#6d4622',
  },
  optionBadge: {
    color: '#7f5a32',
    fontSize: 12,
    fontWeight: '900',
  },
  optionDescription: {
    color: '#876346',
    fontSize: 13,
    lineHeight: 18,
  },
  optionDescriptionActive: {
    color: '#6d4929',
  },
  menuItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(129, 95, 55, 0.18)',
    paddingVertical: 14,
  },
  menuItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 4,
  },
  menuText: {
    color: '#4f3118',
    fontSize: 15,
    fontWeight: '800',
  },
  adminButton: {
    backgroundColor: '#7f5a32',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#4f3118',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    marginBottom: 14,
  },
  adminButtonText: {
    color: '#fff6e8',
    fontSize: 16,
    fontWeight: '900',
  },
  actionButton: {
    backgroundColor: '#f5e6cf',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#b48a60',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#6b4522',
    fontSize: 15,
    fontWeight: '900',
  },
  deleteButton: {
    backgroundColor: '#f3ddd4',
    borderColor: '#b86b58',
    marginBottom: 0,
  },
  deleteButtonText: {
    color: '#8b3326',
    fontSize: 15,
    fontWeight: '900',
  },
  versionText: {
    color: '#ead6b6',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
});
