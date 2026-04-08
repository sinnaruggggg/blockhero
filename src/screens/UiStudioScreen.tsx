import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import GamePanel from '../components/GamePanel';
import MenuScreenFrame from '../components/MenuScreenFrame';
import VisualRuntimePreview from '../components/VisualRuntimePreview';
import {
  cloneVisualConfigManifest,
  DEFAULT_VISUAL_BACKGROUND_OVERRIDE,
  DEFAULT_VISUAL_CONFIG_MANIFEST,
  DEFAULT_VISUAL_ELEMENT_RULE,
  DEFAULT_VISUAL_REFERENCE_VIEWPORT,
  getVisualDeviceProfile,
  sanitizeVisualConfigManifest,
  type VisualBackgroundOverride,
  type VisualConfigManifest,
  type VisualElementId,
  type VisualScreenId,
  type VisualViewport,
  VISUAL_DEVICE_PROFILES,
  VISUAL_ELEMENT_LABELS,
  VISUAL_SCREEN_LABELS,
} from '../game/visualConfig';
import {useVisualConfig} from '../hooks/useVisualConfig';
import {getAdminStatus} from '../services/adminSync';
import {
  downloadPublishedVisualConfigIfNeeded,
  fetchVisualConfigDraft,
  fetchVisualConfigReleaseHistory,
  publishVisualConfigDraft,
  rollbackVisualConfig,
  saveVisualConfigDraft,
  uploadVisualAsset,
} from '../services/visualConfigService';

type BackgroundScopeMode = 'world' | 'level';

type ReleaseHistoryEntry = {
  version: number;
  created_at: string;
  notes: string | null;
};

function clampInteger(value: string, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function formatViewport(viewport: VisualViewport) {
  return `${viewport.width} x ${viewport.height} · safe ${viewport.safeTop}/${viewport.safeBottom}`;
}

export default function UiStudioScreen({navigation}: any) {
  const windowDimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {assetUris} = useVisualConfig();

  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [activeScreen, setActiveScreen] = useState<VisualScreenId>('level');
  const [selectedElementId, setSelectedElementId] = useState<VisualElementId>('header');
  const [previewProfileId, setPreviewProfileId] = useState('current');
  const [draftManifest, setDraftManifest] = useState<VisualConfigManifest>(
    cloneVisualConfigManifest(DEFAULT_VISUAL_CONFIG_MANIFEST),
  );
  const [publishNotes, setPublishNotes] = useState('');
  const [releaseHistory, setReleaseHistory] = useState<ReleaseHistoryEntry[]>([]);
  const [previewWorld, setPreviewWorld] = useState('1');
  const [previewLevelId, setPreviewLevelId] = useState('1');
  const [previewRaidStage, setPreviewRaidStage] = useState('1');
  const [customViewportWidth, setCustomViewportWidth] = useState(
    String(DEFAULT_VISUAL_REFERENCE_VIEWPORT.width),
  );
  const [customViewportHeight, setCustomViewportHeight] = useState(
    String(DEFAULT_VISUAL_REFERENCE_VIEWPORT.height),
  );
  const [customSafeTop, setCustomSafeTop] = useState(
    String(DEFAULT_VISUAL_REFERENCE_VIEWPORT.safeTop),
  );
  const [customSafeBottom, setCustomSafeBottom] = useState(
    String(DEFAULT_VISUAL_REFERENCE_VIEWPORT.safeBottom),
  );
  const [levelBackgroundScope, setLevelBackgroundScope] =
    useState<BackgroundScopeMode>('world');

  const currentViewport = useMemo<VisualViewport>(
    () => ({
      width: Math.round(windowDimensions.width),
      height: Math.round(windowDimensions.height),
      safeTop: Math.round(insets.top),
      safeBottom: Math.round(insets.bottom),
    }),
    [insets.bottom, insets.top, windowDimensions.height, windowDimensions.width],
  );

  const customViewport = useMemo<VisualViewport>(() => {
    const width = clampInteger(
      customViewportWidth,
      DEFAULT_VISUAL_REFERENCE_VIEWPORT.width,
      280,
      1600,
    );
    const height = clampInteger(
      customViewportHeight,
      DEFAULT_VISUAL_REFERENCE_VIEWPORT.height,
      480,
      3200,
    );
    const safeTop = clampInteger(customSafeTop, 0, 0, 200);
    const safeBottom = clampInteger(customSafeBottom, 0, 0, 200);

    return sanitizeVisualConfigManifest({
      referenceViewport: {width, height, safeTop, safeBottom},
    }).referenceViewport;
  }, [customSafeBottom, customSafeTop, customViewportHeight, customViewportWidth]);

  const selectedProfile = useMemo(
    () => getVisualDeviceProfile(previewProfileId),
    [previewProfileId],
  );

  const activePreviewViewport = useMemo<VisualViewport>(() => {
    if (previewProfileId === 'current') {
      return currentViewport;
    }
    if (previewProfileId === 'custom') {
      return customViewport;
    }
    return selectedProfile?.viewport ?? currentViewport;
  }, [currentViewport, customViewport, previewProfileId, selectedProfile]);

  const previewScale = useMemo(() => {
    const maxWidth = Math.max(240, windowDimensions.width - 72);
    return Math.min(1, maxWidth / Math.max(1, activePreviewViewport.width));
  }, [activePreviewViewport.width, windowDimensions.width]);

  const fullPreviewScale = useMemo(() => {
    if (previewProfileId === 'current') {
      return 1;
    }

    const availableWidth = Math.max(240, windowDimensions.width - 20);
    const availableHeight = Math.max(320, windowDimensions.height - 20);
    return Math.min(
      1,
      availableWidth / Math.max(1, activePreviewViewport.width),
      availableHeight / Math.max(1, activePreviewViewport.height),
    );
  }, [
    activePreviewViewport.height,
    activePreviewViewport.width,
    previewProfileId,
    windowDimensions.height,
    windowDimensions.width,
  ]);

  const syncCustomViewportFromManifest = useCallback((manifest: VisualConfigManifest) => {
    const viewport = manifest.referenceViewport;
    setCustomViewportWidth(String(viewport.width));
    setCustomViewportHeight(String(viewport.height));
    setCustomSafeTop(String(viewport.safeTop));
    setCustomSafeBottom(String(viewport.safeBottom));
  }, []);

  const loadStudioState = useCallback(async () => {
    setLoading(true);
    try {
      const admin = await getAdminStatus();
      setHasAccess(admin);
      if (!admin) {
        return;
      }

      await downloadPublishedVisualConfigIfNeeded();
      const [draft, history] = await Promise.all([
        fetchVisualConfigDraft(),
        fetchVisualConfigReleaseHistory(10),
      ]);
      const nextDraft = sanitizeVisualConfigManifest(draft);
      setDraftManifest(nextDraft);
      syncCustomViewportFromManifest(nextDraft);
      setReleaseHistory(history);
    } catch (error: any) {
      Alert.alert(
        'UI 스튜디오 로드 실패',
        error?.message ?? '설정 데이터를 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, [syncCustomViewportFromManifest]);

  useEffect(() => {
    void loadStudioState();
  }, [loadStudioState]);

  useEffect(() => {
    const screenElements = VISUAL_ELEMENT_LABELS[activeScreen];
    if (!screenElements.some(option => option.id === selectedElementId)) {
      setSelectedElementId(screenElements[0].id as VisualElementId);
    }
  }, [activeScreen, selectedElementId]);

  const selectedRule = useMemo(() => {
    const screen = draftManifest.screens[activeScreen] as {
      elements: Record<string, typeof DEFAULT_VISUAL_ELEMENT_RULE>;
    };
    return screen.elements[selectedElementId] ?? DEFAULT_VISUAL_ELEMENT_RULE;
  }, [activeScreen, draftManifest, selectedElementId]);

  const numericPreviewWorld = Math.max(1, Number.parseInt(previewWorld, 10) || 1);
  const numericPreviewLevelId = Math.max(1, Number.parseInt(previewLevelId, 10) || 1);
  const numericPreviewRaidStage = Math.max(1, Number.parseInt(previewRaidStage, 10) || 1);

  const currentBackgroundOverride = useMemo(() => {
    if (activeScreen === 'level') {
      const targetMap =
        levelBackgroundScope === 'world'
          ? draftManifest.screens.level.backgrounds.byWorld
          : draftManifest.screens.level.backgrounds.byLevel;
      const targetKey =
        levelBackgroundScope === 'world'
          ? String(numericPreviewWorld)
          : String(numericPreviewLevelId);
      return targetMap[targetKey] ?? DEFAULT_VISUAL_BACKGROUND_OVERRIDE;
    }

    if (activeScreen === 'raid') {
      return (
        draftManifest.screens.raid.backgrounds.byBossStage[
          String(numericPreviewRaidStage)
        ] ?? DEFAULT_VISUAL_BACKGROUND_OVERRIDE
      );
    }

    return DEFAULT_VISUAL_BACKGROUND_OVERRIDE;
  }, [
    activeScreen,
    draftManifest,
    levelBackgroundScope,
    numericPreviewLevelId,
    numericPreviewRaidStage,
    numericPreviewWorld,
  ]);

  const mutateDraft = useCallback(
    (mutator: (next: VisualConfigManifest) => void) => {
      setDraftManifest(current => {
        const next = cloneVisualConfigManifest(current);
        mutator(next);
        next.referenceViewport = activePreviewViewport;
        return sanitizeVisualConfigManifest(next);
      });
    },
    [activePreviewViewport],
  );

  const patchElementRule = useCallback(
    (
      screenId: VisualScreenId,
      elementId: VisualElementId,
      patch: Partial<typeof DEFAULT_VISUAL_ELEMENT_RULE>,
    ) => {
      mutateDraft(next => {
        const screen = next.screens[screenId] as {
          elements: Record<string, typeof DEFAULT_VISUAL_ELEMENT_RULE>;
        };
        screen.elements[elementId] = {
          ...screen.elements[elementId],
          ...patch,
        };
      });
    },
    [mutateDraft],
  );

  const updateCurrentBackgroundOverride = useCallback(
    (patch: Partial<VisualBackgroundOverride>) => {
      mutateDraft(next => {
        if (activeScreen === 'level') {
          const targetMap =
            levelBackgroundScope === 'world'
              ? next.screens.level.backgrounds.byWorld
              : next.screens.level.backgrounds.byLevel;
          const targetKey =
            levelBackgroundScope === 'world'
              ? String(numericPreviewWorld)
              : String(numericPreviewLevelId);
          targetMap[targetKey] = {
            ...(targetMap[targetKey] ?? DEFAULT_VISUAL_BACKGROUND_OVERRIDE),
            ...patch,
          };
        } else if (activeScreen === 'raid') {
          next.screens.raid.backgrounds.byBossStage[String(numericPreviewRaidStage)] = {
            ...(next.screens.raid.backgrounds.byBossStage[
              String(numericPreviewRaidStage)
            ] ?? DEFAULT_VISUAL_BACKGROUND_OVERRIDE),
            ...patch,
          };
        }
      });
    },
    [
      activeScreen,
      levelBackgroundScope,
      mutateDraft,
      numericPreviewLevelId,
      numericPreviewRaidStage,
      numericPreviewWorld,
    ],
  );

  const clearCurrentBackgroundOverride = useCallback(() => {
    mutateDraft(next => {
      if (activeScreen === 'level') {
        const targetMap =
          levelBackgroundScope === 'world'
            ? next.screens.level.backgrounds.byWorld
            : next.screens.level.backgrounds.byLevel;
        const targetKey =
          levelBackgroundScope === 'world'
            ? String(numericPreviewWorld)
            : String(numericPreviewLevelId);
        delete targetMap[targetKey];
      } else if (activeScreen === 'raid') {
        delete next.screens.raid.backgrounds.byBossStage[String(numericPreviewRaidStage)];
      }
    });
  }, [
    activeScreen,
    levelBackgroundScope,
    mutateDraft,
    numericPreviewLevelId,
    numericPreviewRaidStage,
    numericPreviewWorld,
  ]);

  const handlePickBackgroundImage = useCallback(async () => {
    try {
      const {launchImageLibrary} = require('react-native-image-picker') as {
        launchImageLibrary: (options: Record<string, unknown>) => Promise<any>;
      };

      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        selectionLimit: 1,
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.85,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorMessage) {
        throw new Error(result.errorMessage);
      }

      const asset = result.assets?.[0];
      if (!asset?.base64 || !asset.type) {
        throw new Error('이미지 데이터를 읽지 못했습니다.');
      }

      const assetKey =
        activeScreen === 'level'
          ? levelBackgroundScope === 'world'
            ? `level_world_${numericPreviewWorld}`
            : `level_${numericPreviewLevelId}`
          : `raid_stage_${numericPreviewRaidStage}`;

      await uploadVisualAsset({
        assetKey,
        dataUrl: `data:${asset.type};base64,${asset.base64}`,
        mimeType: asset.type,
      });
      updateCurrentBackgroundOverride({
        assetKey,
        removeImage: false,
      });
      Alert.alert('배경 적용', '선택한 이미지를 초안 배경으로 반영했습니다.');
    } catch (error: any) {
      Alert.alert(
        '배경 업로드 실패',
        error?.message ?? '이미지를 업로드하지 못했습니다.',
      );
    }
  }, [
    activeScreen,
    levelBackgroundScope,
    numericPreviewLevelId,
    numericPreviewRaidStage,
    numericPreviewWorld,
    updateCurrentBackgroundOverride,
  ]);

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    try {
      const nextDraft = sanitizeVisualConfigManifest({
        ...draftManifest,
        referenceViewport: activePreviewViewport,
      });
      await saveVisualConfigDraft(nextDraft);
      setDraftManifest(nextDraft);
      syncCustomViewportFromManifest(nextDraft);
      Alert.alert('초안 저장', '현재 편집한 UI 설정을 초안으로 저장했습니다.');
    } catch (error: any) {
      Alert.alert(
        '초안 저장 실패',
        error?.message ?? '초안을 저장하지 못했습니다.',
      );
    } finally {
      setSaving(false);
    }
  }, [activePreviewViewport, draftManifest, syncCustomViewportFromManifest]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      const nextDraft = sanitizeVisualConfigManifest({
        ...draftManifest,
        referenceViewport: activePreviewViewport,
      });
      await saveVisualConfigDraft(nextDraft);
      const version = await publishVisualConfigDraft(publishNotes);
      const [refreshedDraft, history] = await Promise.all([
        fetchVisualConfigDraft(),
        fetchVisualConfigReleaseHistory(10),
      ]);
      const sanitizedDraft = sanitizeVisualConfigManifest(refreshedDraft);
      setDraftManifest(sanitizedDraft);
      syncCustomViewportFromManifest(sanitizedDraft);
      setReleaseHistory(history);
      setPublishNotes('');
      Alert.alert('배포 완료', `UI 설정 v${version} 배포가 완료되었습니다.`);
    } catch (error: any) {
      Alert.alert(
        '배포 실패',
        error?.message ?? '설정을 배포하지 못했습니다.',
      );
    } finally {
      setPublishing(false);
    }
  }, [
    activePreviewViewport,
    draftManifest,
    publishNotes,
    syncCustomViewportFromManifest,
  ]);

  const handleRollback = useCallback(async (version: number) => {
    const shouldProceed = await new Promise<boolean>(resolve => {
      Alert.alert(
        '롤백',
        `v${version} 설정으로 되돌린 새 배포를 생성합니다.`,
        [
          {text: '취소', style: 'cancel', onPress: () => resolve(false)},
          {text: '진행', onPress: () => resolve(true)},
        ],
      );
    });

    if (!shouldProceed) {
      return;
    }

    setPublishing(true);
    try {
      const versionResult = await rollbackVisualConfig(version);
      const [refreshedDraft, history] = await Promise.all([
        fetchVisualConfigDraft(),
        fetchVisualConfigReleaseHistory(10),
      ]);
      const sanitizedDraft = sanitizeVisualConfigManifest(refreshedDraft);
      setDraftManifest(sanitizedDraft);
      syncCustomViewportFromManifest(sanitizedDraft);
      setReleaseHistory(history);
      Alert.alert(
        '롤백 완료',
        `v${version} 기준으로 새 배포 v${versionResult}를 생성했습니다.`,
      );
    } catch (error: any) {
      Alert.alert(
        '롤백 실패',
        error?.message ?? '설정을 롤백하지 못했습니다.',
      );
    } finally {
      setPublishing(false);
    }
  }, [syncCustomViewportFromManifest]);

  if (loading) {
    return (
      <MenuScreenFrame
        title="UI Studio"
        subtitle="관리자 전용 비주얼 설정"
        onBack={() => navigation.goBack()}>
        <GamePanel style={styles.loadingPanel}>
          <ActivityIndicator size="large" color="#8a5e35" />
          <Text style={styles.loadingText}>UI 설정을 불러오는 중입니다.</Text>
        </GamePanel>
      </MenuScreenFrame>
    );
  }

  if (!hasAccess) {
    return (
      <MenuScreenFrame
        title="UI Studio"
        subtitle="관리자 전용 비주얼 설정"
        onBack={() => navigation.goBack()}>
        <GamePanel>
          <Text style={styles.sectionTitle}>접근 권한 없음</Text>
          <Text style={styles.supportText}>
            관리자 계정만 UI 스튜디오에 접근할 수 있습니다.
          </Text>
        </GamePanel>
      </MenuScreenFrame>
    );
  }

  return (
    <>
      <MenuScreenFrame
        title="UI Studio"
        subtitle="실기기 기준 프리뷰로 배치와 배경을 조정하고 전역 배포합니다."
        onBack={() => navigation.goBack()}
        contentContainerStyle={styles.contentContainer}>
        <GamePanel>
          <Text style={styles.sectionTitle}>화면 선택</Text>
          <View style={styles.chipRow}>
            {(Object.keys(VISUAL_SCREEN_LABELS) as VisualScreenId[]).map(screenId => (
              <TouchableOpacity
                key={screenId}
                style={[styles.chip, activeScreen === screenId && styles.chipActive]}
                onPress={() => setActiveScreen(screenId)}>
                <Text
                  style={[
                    styles.chipText,
                    activeScreen === screenId && styles.chipTextActive,
                  ]}>
                  {VISUAL_SCREEN_LABELS[screenId]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GamePanel>

        <GamePanel>
          <Text style={styles.sectionTitle}>프리뷰 기준 기기</Text>
          <Text style={styles.supportText}>
            현재 기기 프리뷰는 안전영역까지 포함한 실기기 비율로 그려집니다. 다른
            해상도는 시뮬레이션이고, 최종 검수는 현재 기기 전체화면 프리뷰 기준으로
            확인하면 됩니다.
          </Text>

          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, previewProfileId === 'current' && styles.chipActive]}
              onPress={() => setPreviewProfileId('current')}>
              <Text
                style={[
                  styles.chipText,
                  previewProfileId === 'current' && styles.chipTextActive,
                ]}>
                현재 기기
              </Text>
            </TouchableOpacity>
            {VISUAL_DEVICE_PROFILES.filter(profile => profile.id !== 'current').map(
              profile => (
                <TouchableOpacity
                  key={profile.id}
                  style={[
                    styles.chip,
                    previewProfileId === profile.id && styles.chipActive,
                  ]}
                  onPress={() => setPreviewProfileId(profile.id)}>
                  <Text
                    style={[
                      styles.chipText,
                      previewProfileId === profile.id && styles.chipTextActive,
                    ]}>
                    {profile.label}
                  </Text>
                </TouchableOpacity>
              ),
            )}
            <TouchableOpacity
              style={[styles.chip, previewProfileId === 'custom' && styles.chipActive]}
              onPress={() => setPreviewProfileId('custom')}>
              <Text
                style={[
                  styles.chipText,
                  previewProfileId === 'custom' && styles.chipTextActive,
                ]}>
                직접 입력
              </Text>
            </TouchableOpacity>
          </View>

          {previewProfileId === 'custom' ? (
            <View style={styles.inputGrid}>
              <View style={styles.inputCell}>
                <Text style={styles.controlLabel}>폭</Text>
                <TextInput
                  value={customViewportWidth}
                  onChangeText={setCustomViewportWidth}
                  keyboardType="number-pad"
                  style={styles.numberInput}
                />
              </View>
              <View style={styles.inputCell}>
                <Text style={styles.controlLabel}>높이</Text>
                <TextInput
                  value={customViewportHeight}
                  onChangeText={setCustomViewportHeight}
                  keyboardType="number-pad"
                  style={styles.numberInput}
                />
              </View>
              <View style={styles.inputCell}>
                <Text style={styles.controlLabel}>safe top</Text>
                <TextInput
                  value={customSafeTop}
                  onChangeText={setCustomSafeTop}
                  keyboardType="number-pad"
                  style={styles.numberInput}
                />
              </View>
              <View style={styles.inputCell}>
                <Text style={styles.controlLabel}>safe bottom</Text>
                <TextInput
                  value={customSafeBottom}
                  onChangeText={setCustomSafeBottom}
                  keyboardType="number-pad"
                  style={styles.numberInput}
                />
              </View>
            </View>
          ) : null}

          <View style={styles.metricsCard}>
            <Text style={styles.metricTitle}>현재 프리뷰 기준</Text>
            <Text style={styles.metricValue}>{formatViewport(activePreviewViewport)}</Text>
            <Text style={styles.metricValue}>
              저장 기준 viewport: {formatViewport(draftManifest.referenceViewport)}
            </Text>
          </View>
        </GamePanel>

        <GamePanel>
          <View style={styles.previewHeader}>
            <View style={styles.previewHeaderText}>
              <Text style={styles.sectionTitle}>실시간 프리뷰</Text>
              <Text style={styles.supportText}>
                드래그한 값은 현재 선택한 기기 기준으로 저장됩니다.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setShowFullPreview(true)}>
              <Text style={styles.secondaryButtonText}>전체화면 프리뷰</Text>
            </TouchableOpacity>
          </View>

          <VisualRuntimePreview
            screenId={activeScreen}
            manifest={draftManifest}
            assetUris={assetUris}
            selectedElementId={selectedElementId}
            previewWorld={numericPreviewWorld}
            previewLevelId={numericPreviewLevelId}
            previewRaidStage={numericPreviewRaidStage}
            viewport={activePreviewViewport}
            displayScale={previewScale}
            onSelectElement={setSelectedElementId}
            onMoveElement={(elementId, nextOffsetX, nextOffsetY) =>
              patchElementRule(activeScreen, elementId, {
                offsetX: nextOffsetX,
                offsetY: nextOffsetY,
              })
            }
          />
        </GamePanel>

        <GamePanel>
          <Text style={styles.sectionTitle}>요소 선택</Text>
          <View style={styles.chipRow}>
            {VISUAL_ELEMENT_LABELS[activeScreen].map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.chip,
                  selectedElementId === option.id && styles.chipActive,
                ]}
                onPress={() => setSelectedElementId(option.id as VisualElementId)}>
                <Text
                  style={[
                    styles.chipText,
                    selectedElementId === option.id && styles.chipTextActive,
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.metricsCard}>
            <Text style={styles.metricTitle}>현재 값</Text>
            <Text style={styles.metricValue}>
              X {selectedRule.offsetX} / Y {selectedRule.offsetY}
            </Text>
            <Text style={styles.metricValue}>
              Scale {selectedRule.scale.toFixed(2)} / Opacity{' '}
              {selectedRule.opacity.toFixed(2)}
            </Text>
            <Text style={styles.metricValue}>
              Z {selectedRule.zIndex} / {selectedRule.visible ? 'Visible' : 'Hidden'}
            </Text>
            <Text style={styles.metricValue}>
              Safe area 기준: {selectedRule.safeAreaAware ? '사용' : '미사용'}
            </Text>
          </View>

          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>위치 이동</Text>
            <View style={styles.nudgeRow}>
              {[
                {label: 'X -10', dx: -10, dy: 0},
                {label: 'X -1', dx: -1, dy: 0},
                {label: 'X +1', dx: 1, dy: 0},
                {label: 'X +10', dx: 10, dy: 0},
              ].map(item => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.smallActionButton}
                  onPress={() =>
                    patchElementRule(activeScreen, selectedElementId, {
                      offsetX: selectedRule.offsetX + item.dx,
                    })
                  }>
                  <Text style={styles.smallActionText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.nudgeRow}>
              {[
                {label: 'Y -10', dy: -10},
                {label: 'Y -1', dy: -1},
                {label: 'Y +1', dy: 1},
                {label: 'Y +10', dy: 10},
              ].map(item => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.smallActionButton}
                  onPress={() =>
                    patchElementRule(activeScreen, selectedElementId, {
                      offsetY: selectedRule.offsetY + item.dy,
                    })
                  }>
                  <Text style={styles.smallActionText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>크기 / 투명도 / 순서</Text>
            <View style={styles.nudgeRow}>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={() =>
                  patchElementRule(activeScreen, selectedElementId, {
                    scale: selectedRule.scale - 0.05,
                  })
                }>
                <Text style={styles.smallActionText}>Scale -</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={() =>
                  patchElementRule(activeScreen, selectedElementId, {
                    scale: selectedRule.scale + 0.05,
                  })
                }>
                <Text style={styles.smallActionText}>Scale +</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={() =>
                  patchElementRule(activeScreen, selectedElementId, {
                    opacity: selectedRule.opacity - 0.05,
                  })
                }>
                <Text style={styles.smallActionText}>Opacity -</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={() =>
                  patchElementRule(activeScreen, selectedElementId, {
                    opacity: selectedRule.opacity + 0.05,
                  })
                }>
                <Text style={styles.smallActionText}>Opacity +</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.nudgeRow}>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={() =>
                  patchElementRule(activeScreen, selectedElementId, {
                    zIndex: selectedRule.zIndex - 1,
                  })
                }>
                <Text style={styles.smallActionText}>Z -</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={() =>
                  patchElementRule(activeScreen, selectedElementId, {
                    zIndex: selectedRule.zIndex + 1,
                  })
                }>
                <Text style={styles.smallActionText}>Z +</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={() =>
                  patchElementRule(activeScreen, selectedElementId, {
                    safeAreaAware: !selectedRule.safeAreaAware,
                  })
                }>
                <Text style={styles.smallActionText}>
                  {selectedRule.safeAreaAware ? 'Safe off' : 'Safe on'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={() =>
                  patchElementRule(activeScreen, selectedElementId, {
                    visible: !selectedRule.visible,
                  })
                }>
                <Text style={styles.smallActionText}>
                  {selectedRule.visible ? '숨기기' : '보이기'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={() =>
                  patchElementRule(
                    activeScreen,
                    selectedElementId,
                    DEFAULT_VISUAL_ELEMENT_RULE,
                  )
                }>
                <Text style={styles.smallActionText}>요소 초기화</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GamePanel>

        {(activeScreen === 'level' || activeScreen === 'raid') && (
          <GamePanel>
            <Text style={styles.sectionTitle}>배경 편집</Text>
            {activeScreen === 'level' ? (
              <>
                <View style={styles.chipRow}>
                  {(['world', 'level'] as BackgroundScopeMode[]).map(mode => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.chip,
                        levelBackgroundScope === mode && styles.chipActive,
                      ]}
                      onPress={() => setLevelBackgroundScope(mode)}>
                      <Text
                        style={[
                          styles.chipText,
                          levelBackgroundScope === mode && styles.chipTextActive,
                        ]}>
                        {mode === 'world' ? '월드 기준' : '스테이지 기준'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.inputRow}>
                  <Text style={styles.controlLabel}>월드</Text>
                  <TextInput
                    value={previewWorld}
                    onChangeText={setPreviewWorld}
                    keyboardType="number-pad"
                    style={styles.numberInput}
                  />
                  <Text style={styles.controlLabel}>스테이지</Text>
                  <TextInput
                    value={previewLevelId}
                    onChangeText={setPreviewLevelId}
                    keyboardType="number-pad"
                    style={styles.numberInput}
                  />
                </View>
              </>
            ) : (
              <View style={styles.inputRow}>
                <Text style={styles.controlLabel}>보스 단계</Text>
                <TextInput
                  value={previewRaidStage}
                  onChangeText={setPreviewRaidStage}
                  keyboardType="number-pad"
                  style={styles.numberInput}
                />
              </View>
            )}

            <View style={styles.metricsCard}>
              <Text style={styles.metricTitle}>현재 배경 설정</Text>
              <Text style={styles.metricValue}>
                Asset {currentBackgroundOverride.assetKey ?? '-'}
              </Text>
              <Text style={styles.metricValue}>
                Tint {currentBackgroundOverride.tintColor} /{' '}
                {currentBackgroundOverride.tintOpacity.toFixed(2)}
              </Text>
              <Text style={styles.metricValue}>
                {currentBackgroundOverride.removeImage
                  ? '기본 이미지 제거'
                  : '기본 이미지 유지'}
              </Text>
            </View>

            {currentBackgroundOverride.assetKey &&
            assetUris[currentBackgroundOverride.assetKey] ? (
              <Image
                source={{uri: assetUris[currentBackgroundOverride.assetKey]}}
                resizeMode="cover"
                style={styles.backgroundPreview}
              />
            ) : null}

            <View style={styles.nudgeRow}>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={() => void handlePickBackgroundImage()}>
                <Text style={styles.smallActionText}>이미지 선택</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={() =>
                  updateCurrentBackgroundOverride({
                    assetKey: null,
                    removeImage: true,
                  })
                }>
                <Text style={styles.smallActionText}>이미지 제거</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={clearCurrentBackgroundOverride}>
                <Text style={styles.smallActionText}>기본값 복원</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.controlLabel}>Tint</Text>
              <TextInput
                value={currentBackgroundOverride.tintColor}
                onChangeText={value =>
                  updateCurrentBackgroundOverride({tintColor: value})
                }
                style={styles.tintInput}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.nudgeRow}>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={() =>
                  updateCurrentBackgroundOverride({
                    tintOpacity: currentBackgroundOverride.tintOpacity - 0.05,
                  })
                }>
                <Text style={styles.smallActionText}>Tint -</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallActionButton}
                onPress={() =>
                  updateCurrentBackgroundOverride({
                    tintOpacity: currentBackgroundOverride.tintOpacity + 0.05,
                  })
                }>
                <Text style={styles.smallActionText}>Tint +</Text>
              </TouchableOpacity>
            </View>
          </GamePanel>
        )}

        <GamePanel>
          <Text style={styles.sectionTitle}>저장 / 배포</Text>
          <TextInput
            value={publishNotes}
            onChangeText={setPublishNotes}
            style={styles.notesInput}
            multiline
            placeholder="배포 메모를 입력하세요."
            placeholderTextColor="#7c6b58"
          />
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
              disabled={saving}
              onPress={() => void handleSaveDraft()}>
              <Text style={styles.primaryButtonText}>
                {saving ? '저장 중...' : '초안 저장'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, publishing && styles.buttonDisabled]}
              disabled={publishing}
              onPress={() => void handlePublish()}>
              <Text style={styles.primaryButtonText}>
                {publishing ? '배포 중...' : '배포'}
              </Text>
            </TouchableOpacity>
          </View>
        </GamePanel>

        <GamePanel>
          <Text style={styles.sectionTitle}>배포 이력</Text>
          {releaseHistory.map(entry => (
            <View key={entry.version} style={styles.releaseRow}>
              <View style={styles.releaseMeta}>
                <Text style={styles.releaseVersion}>v{entry.version}</Text>
                <Text style={styles.releaseDate}>
                  {new Date(entry.created_at).toLocaleString('ko-KR')}
                </Text>
                <Text style={styles.releaseNotes}>{entry.notes || '메모 없음'}</Text>
              </View>
              <TouchableOpacity
                style={styles.rollbackButton}
                onPress={() => void handleRollback(entry.version)}>
                <Text style={styles.rollbackButtonText}>롤백</Text>
              </TouchableOpacity>
            </View>
          ))}
        </GamePanel>
      </MenuScreenFrame>

      <Modal visible={showFullPreview} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowFullPreview(false)}>
            <Text style={styles.modalCloseText}>닫기</Text>
          </TouchableOpacity>
          <VisualRuntimePreview
            screenId={activeScreen}
            manifest={draftManifest}
            assetUris={assetUris}
            selectedElementId={selectedElementId}
            previewWorld={numericPreviewWorld}
            previewLevelId={numericPreviewLevelId}
            previewRaidStage={numericPreviewRaidStage}
            viewport={activePreviewViewport}
            displayScale={fullPreviewScale}
            onSelectElement={setSelectedElementId}
            onMoveElement={(elementId, nextOffsetX, nextOffsetY) =>
              patchElementRule(activeScreen, elementId, {
                offsetX: nextOffsetX,
                offsetY: nextOffsetY,
              })
            }
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    gap: 14,
  },
  loadingPanel: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 36,
  },
  loadingText: {
    color: '#6f4e2a',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#4d2f17',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
  },
  supportText: {
    color: '#6f4e2a',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  previewHeaderText: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#b38b5f',
    backgroundColor: '#f6ead4',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: '#7f5a32',
    borderColor: '#4f3118',
  },
  chipText: {
    color: '#6f4e2a',
    fontSize: 13,
    fontWeight: '900',
  },
  chipTextActive: {
    color: '#fff7ef',
  },
  metricsCard: {
    backgroundColor: 'rgba(255, 248, 234, 0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d2b48c',
    padding: 14,
    marginTop: 12,
    gap: 4,
  },
  metricTitle: {
    color: '#5f3a1e',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  metricValue: {
    color: '#6f4e2a',
    fontSize: 13,
    fontWeight: '700',
  },
  controlGroup: {
    marginTop: 14,
  },
  controlLabel: {
    color: '#6f4e2a',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },
  nudgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  smallActionButton: {
    backgroundColor: '#f6ead4',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#b38b5f',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallActionText: {
    color: '#6f4e2a',
    fontSize: 12,
    fontWeight: '900',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  inputCell: {
    width: '47%',
    minWidth: 120,
  },
  numberInput: {
    minWidth: 68,
    backgroundColor: '#fff8ee',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#b38b5f',
    color: '#5f3a1e',
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tintInput: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#fff8ee',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#b38b5f',
    color: '#5f3a1e',
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backgroundPreview: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    marginTop: 12,
    backgroundColor: '#dbc7a8',
  },
  notesInput: {
    backgroundColor: '#fff8ee',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#b38b5f',
    minHeight: 92,
    textAlignVertical: 'top',
    color: '#5f3a1e',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#7f5a32',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4f3118',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryButton: {
    backgroundColor: '#f6ead4',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#b38b5f',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: '#fff7ef',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: '#6f4e2a',
    fontSize: 12,
    fontWeight: '900',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  releaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(111, 78, 42, 0.12)',
    paddingVertical: 12,
  },
  releaseMeta: {
    flex: 1,
    gap: 3,
  },
  releaseVersion: {
    color: '#4d2f17',
    fontSize: 16,
    fontWeight: '900',
  },
  releaseDate: {
    color: '#7c5a39',
    fontSize: 12,
    fontWeight: '700',
  },
  releaseNotes: {
    color: '#6f4e2a',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  rollbackButton: {
    backgroundColor: '#f6ead4',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#b38b5f',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rollbackButtonText: {
    color: '#6f4e2a',
    fontSize: 12,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 24,
    right: 20,
    zIndex: 20,
    backgroundColor: 'rgba(20, 17, 38, 0.86)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  modalCloseText: {
    color: '#fff7ef',
    fontSize: 13,
    fontWeight: '900',
  },
});
