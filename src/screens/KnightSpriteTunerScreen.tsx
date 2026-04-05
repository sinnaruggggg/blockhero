import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import KnightSprite from '../components/KnightSprite';
import MageSprite from '../components/MageSprite';
import {CHARACTER_CLASSES} from '../constants/characters';
import {getAdminStatus} from '../services/adminSync';
import {
  BaseCharacterVisualTuning,
  CharacterId,
  CharacterVisualTuning,
  CharacterVisualTuningMap,
  getCachedCharacterVisualTunings,
  KnightAttackTuning,
  KnightVisualTuning,
  loadCharacterVisualTunings,
  resetCharacterVisualTuning,
  sanitizeCharacterVisualTuning,
  saveCharacterVisualTuning,
} from '../stores/characterVisualTuning';

const BATTLE_PORTRAITS: Partial<Record<CharacterId, any>> = {
  mage: require('../assets/ui/hero_mage.png'),
};

const CHARACTER_THEMES: Record<
  CharacterId,
  {
    accent: string;
    accentSoft: string;
    ink: string;
    frame: string;
  }
> = {
  knight: {
    accent: '#d67f39',
    accentSoft: '#f6d4a8',
    ink: '#5f381c',
    frame: '#8f5732',
  },
  mage: {
    accent: '#6c7df2',
    accentSoft: '#d9ddff',
    ink: '#29337d',
    frame: '#5464c7',
  },
  archer: {
    accent: '#4aa65e',
    accentSoft: '#d8f2cc',
    ink: '#265a2d',
    frame: '#4f8751',
  },
  rogue: {
    accent: '#c85a64',
    accentSoft: '#ffd7d8',
    ink: '#742c34',
    frame: '#95444e',
  },
  healer: {
    accent: '#f0b84b',
    accentSoft: '#fff0c8',
    ink: '#83561c',
    frame: '#b47c2e',
  },
};

type BaseFieldKey = keyof BaseCharacterVisualTuning;
type KnightFieldKey = keyof KnightAttackTuning;
type DraftMap = Record<string, string>;

type FieldConfig<T extends string> = {
  key: T;
  label: string;
  step: number;
  precision?: number;
  helper?: string;
};

const BASE_FIELD_CONFIGS: FieldConfig<BaseFieldKey>[] = [
  {
    key: 'showcaseScaleMultiplier',
    label: '메인 배율',
    step: 0.05,
    precision: 2,
    helper: '홈 화면과 선택창 프리뷰 크기',
  },
  {
    key: 'showcaseOffsetX',
    label: '메인 X 오프셋',
    step: 2,
    helper: '오른쪽은 +, 왼쪽은 -',
  },
  {
    key: 'showcaseOffsetY',
    label: '메인 Y 오프셋',
    step: 2,
    helper: '아래는 +, 위는 -',
  },
  {
    key: 'battleScaleMultiplier',
    label: '전투 배율',
    step: 0.05,
    precision: 2,
    helper: '싱글/레이드 전투 초상화 크기',
  },
  {
    key: 'battleOffsetX',
    label: '전투 X 오프셋',
    step: 2,
    helper: '오른쪽은 +, 왼쪽은 -',
  },
  {
    key: 'battleOffsetY',
    label: '전투 Y 오프셋',
    step: 2,
    helper: '아래는 +, 위는 -',
  },
];

const KNIGHT_FIELD_CONFIGS: FieldConfig<KnightFieldKey>[] = [
  {
    key: 'attackScaleMultiplier',
    label: '공격 배율',
    step: 0.05,
    precision: 2,
    helper: '대기 대비 공격 모션 크기',
  },
  {
    key: 'attackOffsetX',
    label: '공격 X 오프셋',
    step: 2,
    helper: '오른쪽은 +, 왼쪽은 -',
  },
  {
    key: 'attackOffsetY',
    label: '공격 Y 오프셋',
    step: 2,
    helper: '아래는 +, 위는 -',
  },
  {
    key: 'attackFrameCols',
    label: '공격 열 수',
    step: 1,
  },
  {
    key: 'attackFrameRows',
    label: '공격 행 수',
    step: 1,
  },
  {
    key: 'attackTotalFrames',
    label: '공격 총 프레임',
    step: 1,
  },
  {
    key: 'attackFrameWidth',
    label: '공격 프레임 폭',
    step: 1,
  },
  {
    key: 'attackFrameHeight',
    label: '공격 프레임 높이',
    step: 1,
  },
  {
    key: 'attackFrameMs',
    label: '공격 프레임 속도(ms)',
    step: 1,
  },
];

function formatDraftValue(value: number, precision?: number) {
  if (precision !== undefined) {
    return value.toFixed(precision);
  }
  return String(Math.round(value));
}

function buildDrafts(characterId: CharacterId, config: CharacterVisualTuning) {
  const drafts: DraftMap = {};

  BASE_FIELD_CONFIGS.forEach(field => {
    drafts[field.key] = formatDraftValue(config[field.key] as number, field.precision);
  });

  if (characterId === 'knight') {
    KNIGHT_FIELD_CONFIGS.forEach(field => {
      drafts[field.key] = formatDraftValue(config[field.key] as number, field.precision);
    });
  }

  return drafts;
}

function CharacterChip({
  active,
  color,
  label,
  onPress,
}: {
  active: boolean;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.characterChip,
        active && {
          backgroundColor: color,
          borderColor: color,
        },
      ]}
      onPress={onPress}>
      <Text style={[styles.characterChipText, active && styles.characterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function TuningStage({
  characterId,
  config,
  mode,
  attackPulse = 0,
}: {
  characterId: CharacterId;
  config: CharacterVisualTuning;
  mode: 'showcase' | 'battle';
  attackPulse?: number;
}) {
  const theme = CHARACTER_THEMES[characterId];
  const visual = CHARACTER_CLASSES.find(entry => entry.id === characterId) ?? CHARACTER_CLASSES[0];
  const scaleMultiplier =
    mode === 'showcase' ? config.showcaseScaleMultiplier : config.battleScaleMultiplier;
  const offsetX = mode === 'showcase' ? config.showcaseOffsetX : config.battleOffsetX;
  const offsetY = mode === 'showcase' ? config.showcaseOffsetY : config.battleOffsetY;
  const transformStyle = {
    transform: [{translateX: offsetX}, {translateY: offsetY}, {scale: scaleMultiplier}],
  };

  if (mode === 'showcase') {
    if (characterId === 'knight') {
      return (
        <View style={[styles.previewVisualWrap, transformStyle]}>
          <KnightSprite size={96} tuningOverride={config as KnightVisualTuning} />
        </View>
      );
    }

    if (characterId === 'mage') {
      return (
        <View style={[styles.previewVisualWrap, transformStyle]}>
          <View style={styles.previewMageFlip}>
            <MageSprite size={94} />
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.previewVisualWrap, transformStyle]}>
        <View
          style={[
            styles.previewBadge,
            {
              backgroundColor: theme.accentSoft,
              borderColor: theme.frame,
            },
          ]}>
          <Text style={[styles.previewBadgeText, {color: theme.ink}]}>
            {visual.emoji}
          </Text>
        </View>
      </View>
    );
  }

  if (characterId === 'knight') {
    return (
      <View style={[styles.previewVisualWrap, transformStyle]}>
        <KnightSprite
          size={54}
          attackPulse={attackPulse}
          facing={-1}
          tuningOverride={config as KnightVisualTuning}
        />
      </View>
    );
  }

  const portraitSource = BATTLE_PORTRAITS[characterId];
  if (portraitSource) {
    return (
      <View style={[styles.previewVisualWrap, transformStyle]}>
        <Image
          source={portraitSource}
          resizeMode="contain"
          style={styles.battlePortrait}
        />
      </View>
    );
  }

  return (
    <View style={[styles.previewVisualWrap, transformStyle]}>
      <View
        style={[
          styles.previewBadge,
          styles.previewBadgeSmall,
          {
            backgroundColor: theme.accentSoft,
            borderColor: theme.frame,
          },
        ]}>
        <Text style={[styles.previewBadgeText, styles.previewBadgeTextSmall, {color: theme.ink}]}>
          {visual.emoji}
        </Text>
      </View>
    </View>
  );
}

export default function KnightSpriteTunerScreen({navigation}: any) {
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<CharacterId>('knight');
  const [configMap, setConfigMap] = useState<CharacterVisualTuningMap>(
    getCachedCharacterVisualTunings(),
  );
  const [drafts, setDrafts] = useState<DraftMap>(
    buildDrafts('knight', getCachedCharacterVisualTunings().knight),
  );
  const [attackPulse, setAttackPulse] = useState(0);

  useEffect(() => {
    let active = true;

    (async () => {
      const isAdmin = await getAdminStatus();
      if (!active) {
        return;
      }

      setHasAdminAccess(isAdmin);
      setAccessChecked(true);

      if (!isAdmin) {
        Alert.alert('접근 제한', '관리자만 접근할 수 있습니다.', [
          {text: '확인', onPress: () => navigation.goBack()},
        ]);
      }
    })();

    return () => {
      active = false;
    };
  }, [navigation]);

  useEffect(() => {
    if (!hasAdminAccess) {
      return;
    }

    loadCharacterVisualTunings().then(nextTunings => {
      setConfigMap(nextTunings);
      setDrafts(buildDrafts(selectedCharacterId, nextTunings[selectedCharacterId]));
    });
  }, [hasAdminAccess, selectedCharacterId]);

  const currentConfig = configMap[selectedCharacterId];
  const currentTheme = CHARACTER_THEMES[selectedCharacterId];
  const isKnight = selectedCharacterId === 'knight';
  const currentKnightConfig = currentConfig as KnightVisualTuning;

  useEffect(() => {
    setDrafts(buildDrafts(selectedCharacterId, currentConfig));
  }, [currentConfig, selectedCharacterId]);

  const previewSummary = useMemo(() => {
    if (!isKnight) {
      return `메인 ${currentConfig.showcaseScaleMultiplier.toFixed(2)}x / 전투 ${currentConfig.battleScaleMultiplier.toFixed(2)}x`;
    }

    return `메인 ${currentConfig.showcaseScaleMultiplier.toFixed(2)}x / 전투 ${currentConfig.battleScaleMultiplier.toFixed(2)}x / 공격 ${currentKnightConfig.attackScaleMultiplier.toFixed(2)}x`;
  }, [currentConfig, currentKnightConfig.attackScaleMultiplier, isKnight]);

  const applyValue = useCallback(
    (key: string, rawValue: string) => {
      setDrafts(previous => ({
        ...previous,
        [key]: rawValue,
      }));

      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed)) {
        return;
      }

      setConfigMap(previous => ({
        ...previous,
        [selectedCharacterId]: sanitizeCharacterVisualTuning(selectedCharacterId, {
          ...previous[selectedCharacterId],
          [key]: parsed,
        }),
      }));
    },
    [selectedCharacterId],
  );

  const nudgeValue = useCallback(
    (field: FieldConfig<string>, direction: -1 | 1) => {
      const currentValue = Number(
        (currentConfig as Record<string, number | undefined>)[field.key] ?? 0,
      );
      const nextConfig = sanitizeCharacterVisualTuning(selectedCharacterId, {
        ...currentConfig,
        [field.key]: currentValue + field.step * direction,
      });
      setConfigMap(previous => ({
        ...previous,
        [selectedCharacterId]: nextConfig,
      }));
      setDrafts(buildDrafts(selectedCharacterId, nextConfig));
    },
    [currentConfig, selectedCharacterId],
  );

  const handleBlur = useCallback(
    (field: FieldConfig<string>) => {
      const value = Number(
        (currentConfig as Record<string, number | undefined>)[field.key] ?? 0,
      );
      setDrafts(previous => ({
        ...previous,
        [field.key]: formatDraftValue(value, field.precision),
      }));
    },
    [currentConfig],
  );

  const handleSave = useCallback(async () => {
    const nextTunings = await saveCharacterVisualTuning(selectedCharacterId, currentConfig);
    setConfigMap(nextTunings);
    setDrafts(buildDrafts(selectedCharacterId, nextTunings[selectedCharacterId]));
    Alert.alert('알림', '현재 직업 비주얼 설정을 저장했습니다.');
  }, [currentConfig, selectedCharacterId]);

  const handleReset = useCallback(async () => {
    const nextTunings = await resetCharacterVisualTuning(selectedCharacterId);
    setConfigMap(nextTunings);
    setDrafts(buildDrafts(selectedCharacterId, nextTunings[selectedCharacterId]));
    setAttackPulse(previous => previous + 1);
  }, [selectedCharacterId]);

  if (!accessChecked) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7a5332" />
      </SafeAreaView>
    );
  }

  if (!hasAdminAccess) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.backDock}>
            <BackImageButton onPress={() => navigation.goBack()} size={42} />
          </View>
          <Text style={styles.title}>캐릭터 비주얼 튜너</Text>
          <View style={styles.backDock} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>직업 선택</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}>
            {CHARACTER_CLASSES.map(characterClass => (
              <CharacterChip
                key={characterClass.id}
                active={selectedCharacterId === characterClass.id}
                color={CHARACTER_THEMES[characterClass.id as CharacterId].accent}
                label={characterClass.name}
                onPress={() => setSelectedCharacterId(characterClass.id as CharacterId)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>실시간 프리뷰</Text>
          <Text style={styles.cardNote}>
            메인은 홈 화면과 선택창, 전투는 싱글/레이드 전투 초상화 기준입니다.
          </Text>

          <View style={styles.previewRow}>
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>메인 화면</Text>
              <View
                style={[
                  styles.previewStage,
                  {backgroundColor: `${currentTheme.accent}18`, borderColor: `${currentTheme.frame}66`},
                ]}>
                <TuningStage
                  characterId={selectedCharacterId}
                  config={currentConfig}
                  mode="showcase"
                />
              </View>
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>전투 화면</Text>
              <View
                style={[
                  styles.previewStage,
                  styles.previewStageBattle,
                  {backgroundColor: `${currentTheme.accent}18`, borderColor: `${currentTheme.frame}66`},
                ]}>
                <TuningStage
                  characterId={selectedCharacterId}
                  config={currentConfig}
                  mode="battle"
                  attackPulse={attackPulse}
                />
              </View>
              {isKnight ? (
                <TouchableOpacity
                  style={[styles.previewBtn, {backgroundColor: currentTheme.accent}]}
                  onPress={() => setAttackPulse(previous => previous + 1)}>
                  <Text style={styles.previewBtnText}>공격 재생</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <Text style={styles.previewSummary}>{previewSummary}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>공통 표시값</Text>
          {BASE_FIELD_CONFIGS.map(field => (
            <View key={field.key} style={styles.fieldBlock}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                {field.helper ? <Text style={styles.fieldHelper}>{field.helper}</Text> : null}
              </View>
              <View style={styles.fieldControls}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => nudgeValue(field, -1)}>
                  <Text style={styles.stepBtnText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  value={drafts[field.key] ?? ''}
                  onChangeText={value => applyValue(field.key, value)}
                  onBlur={() => handleBlur(field)}
                  keyboardType="numeric"
                  selectTextOnFocus
                  style={styles.fieldInput}
                />
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => nudgeValue(field, 1)}>
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {isKnight ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>기사 공격 시트</Text>
            {KNIGHT_FIELD_CONFIGS.map(field => (
              <View key={field.key} style={styles.fieldBlock}>
                <View style={styles.fieldHeader}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  {field.helper ? <Text style={styles.fieldHelper}>{field.helper}</Text> : null}
                </View>
                <View style={styles.fieldControls}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => nudgeValue(field, -1)}>
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <TextInput
                    value={drafts[field.key] ?? ''}
                    onChangeText={value => applyValue(field.key, value)}
                    onBlur={() => handleBlur(field)}
                    keyboardType="numeric"
                    selectTextOnFocus
                    style={styles.fieldInput}
                  />
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => nudgeValue(field, 1)}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetText}>현재 직업 기본값</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, {backgroundColor: currentTheme.accent}]}
            onPress={handleSave}>
            <Text style={styles.saveText}>저장</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backDock: {
    width: 52,
    alignItems: 'center',
  },
  title: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardNote: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  chipRow: {
    gap: 8,
  },
  characterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#111827',
  },
  characterChipText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  characterChipTextActive: {
    color: '#ffffff',
  },
  previewRow: {
    flexDirection: 'row',
    gap: 10,
  },
  previewCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  previewLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  previewStage: {
    height: 156,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewStageBattle: {
    height: 132,
  },
  previewVisualWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMageFlip: {
    transform: [{scaleX: -1}],
  },
  previewBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBadgeSmall: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  previewBadgeText: {
    fontSize: 32,
  },
  previewBadgeTextSmall: {
    fontSize: 24,
  },
  battlePortrait: {
    width: 58,
    height: 74,
  },
  previewBtn: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  previewBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  previewSummary: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },
  fieldBlock: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  fieldHeader: {
    gap: 4,
    marginBottom: 8,
  },
  fieldLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  fieldHelper: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  fieldControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  fieldInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  resetBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#334155',
  },
  resetText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  saveBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
