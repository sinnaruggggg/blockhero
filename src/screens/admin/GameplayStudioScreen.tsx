import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import GamePanel from '../../components/GamePanel';
import AdminStudioScaffold from '../../components/admin/AdminStudioScaffold';
import {
  GAMEPLAY_BGM_LABELS,
  GAMEPLAY_BGM_TRACK_IDS,
  GAMEPLAY_SFX_EVENT_IDS,
  GAMEPLAY_SFX_LABELS,
  sanitizeVisualConfigManifest,
  type GameplayBgmTrackId,
  type GameplaySfxEventId,
  type VisualConfigManifest,
} from '../../game/visualConfig';
import {getAdminStatus} from '../../services/adminSync';
import {
  fetchVisualConfigDraft,
  fetchVisualConfigReleaseHistory,
  publishVisualConfigDraft,
  rollbackVisualConfig,
  saveVisualConfigDraft,
} from '../../services/visualConfigService';
import {listUiAssets, type UiAssetSummary} from '../../services/uiAssetService';
import {
  StudioActionButton,
  StudioChipRow,
  StudioNumberField,
  StudioSectionTitle,
  StudioSwitchField,
  StudioTextField,
} from './StudioFields';

type ReleaseHistoryEntry = {
  version: number;
  created_at: string;
  notes: string | null;
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isAudioAsset(asset: UiAssetSummary) {
  return (
    (asset.mimeType ?? '').startsWith('audio/') ||
    asset.assetKey.toLowerCase().endsWith('.mp3') ||
    asset.assetKey.toLowerCase().endsWith('.wav') ||
    asset.assetKey.toLowerCase().endsWith('.ogg') ||
    asset.assetKey.toLowerCase().endsWith('.m4a')
  );
}

export default function GameplayStudioScreen({navigation}: any) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [manifest, setManifest] = useState<VisualConfigManifest | null>(null);
  const [releaseHistory, setReleaseHistory] = useState<ReleaseHistoryEntry[]>([]);
  const [publishNotes, setPublishNotes] = useState('');
  const [selectedSfxEvent, setSelectedSfxEvent] =
    useState<GameplaySfxEventId>('blockPlace');
  const [selectedBgmTrack, setSelectedBgmTrack] =
    useState<GameplayBgmTrackId>('level');
  const [audioAssets, setAudioAssets] = useState<UiAssetSummary[]>([]);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const admin = await getAdminStatus();
      setHasAccess(admin);
      if (!admin) {
        return;
      }

      const [draft, history, assets] = await Promise.all([
        fetchVisualConfigDraft(),
        fetchVisualConfigReleaseHistory(12),
        listUiAssets(),
      ]);
      setManifest(sanitizeVisualConfigManifest(draft));
      setReleaseHistory(history);
      setAudioAssets(assets.filter(isAudioAsset));
    } catch (error: any) {
      Alert.alert(
        '사운드/드래그 로드 실패',
        error?.message ?? '데이터를 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const patchManifest = useCallback((mutator: (draft: VisualConfigManifest) => void) => {
    setManifest(current => {
      if (!current) {
        return current;
      }
      const next = sanitizeVisualConfigManifest(current);
      mutator(next);
      return sanitizeVisualConfigManifest(next);
    });
  }, []);

  const selectedSfxRule = manifest?.gameplay.audio.sfx[selectedSfxEvent] ?? null;
  const selectedBgmRule = manifest?.gameplay.audio.bgm[selectedBgmTrack] ?? null;

  const assetOptions = useMemo(
    () =>
      audioAssets.map(asset => ({
        value: asset.assetKey,
        label: asset.assetKey,
      })),
    [audioAssets],
  );

  const handleSaveDraft = useCallback(async () => {
    if (!manifest) {
      return;
    }

    setSaving(true);
    try {
      const nextManifest = sanitizeVisualConfigManifest(manifest);
      await saveVisualConfigDraft(nextManifest);
      setManifest(nextManifest);
      Alert.alert('초안 저장 완료', '드래그/오디오 초안을 저장했습니다.');
    } catch (error: any) {
      Alert.alert('초안 저장 실패', error?.message ?? '초안 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }, [manifest]);

  const handlePublish = useCallback(async () => {
    if (!manifest) {
      return;
    }

    setPublishing(true);
    try {
      await saveVisualConfigDraft(sanitizeVisualConfigManifest(manifest));
      const version = await publishVisualConfigDraft(publishNotes);
      const [draft, history] = await Promise.all([
        fetchVisualConfigDraft(),
        fetchVisualConfigReleaseHistory(12),
      ]);
      setManifest(sanitizeVisualConfigManifest(draft));
      setReleaseHistory(history);
      setPublishNotes('');
      Alert.alert('배포 완료', `사운드/드래그 설정 v${version} 배포가 완료됐습니다.`);
    } catch (error: any) {
      Alert.alert('배포 실패', error?.message ?? '배포에 실패했습니다.');
    } finally {
      setPublishing(false);
    }
  }, [manifest, publishNotes]);

  const handleRollback = useCallback(async (version: number) => {
    setPublishing(true);
    try {
      await rollbackVisualConfig(version);
      const [draft, history] = await Promise.all([
        fetchVisualConfigDraft(),
        fetchVisualConfigReleaseHistory(12),
      ]);
      setManifest(sanitizeVisualConfigManifest(draft));
      setReleaseHistory(history);
      Alert.alert('롤백 완료', `v${version} 기준 새 배포본을 만들었습니다.`);
    } catch (error: any) {
      Alert.alert('롤백 실패', error?.message ?? '롤백에 실패했습니다.');
    } finally {
      setPublishing(false);
    }
  }, []);

  const leftPane = loading ? (
    <GamePanel style={styles.loadingPanel}>
      <ActivityIndicator size="large" color="#8a5e35" />
      <Text style={styles.loadingText}>사운드/드래그 설정을 불러오는 중입니다.</Text>
    </GamePanel>
  ) : !hasAccess ? (
    <GamePanel>
      <StudioSectionTitle
        title="접근 권한 없음"
        description="관리자 계정만 이 스튜디오에 접근할 수 있습니다."
      />
    </GamePanel>
  ) : !manifest ? null : (
    <>
      <GamePanel>
        <StudioSectionTitle
          title="드래그 감도"
          description="모바일 관리자 앱에서 바로 손맛과 스냅 범위를 조정합니다."
        />
        <View style={styles.fieldGrid}>
          <StudioNumberField
            label="들어올림 높이"
            value={String(manifest.gameplay.dragTuning.liftOffsetCells)}
            onChangeText={value =>
              patchManifest(draft => {
                draft.gameplay.dragTuning.liftOffsetCells = toNumber(
                  value,
                  draft.gameplay.dragTuning.liftOffsetCells,
                );
              })
            }
          />
          <StudioNumberField
            label="중심 X"
            value={String(manifest.gameplay.dragTuning.centerOffsetXCells)}
            onChangeText={value =>
              patchManifest(draft => {
                draft.gameplay.dragTuning.centerOffsetXCells = toNumber(
                  value,
                  draft.gameplay.dragTuning.centerOffsetXCells,
                );
              })
            }
          />
          <StudioNumberField
            label="중심 Y"
            value={String(manifest.gameplay.dragTuning.centerOffsetYCells)}
            onChangeText={value =>
              patchManifest(draft => {
                draft.gameplay.dragTuning.centerOffsetYCells = toNumber(
                  value,
                  draft.gameplay.dragTuning.centerOffsetYCells,
                );
              })
            }
          />
          <StudioNumberField
            label="이동 증폭 X"
            value={String(manifest.gameplay.dragTuning.dragDistanceScaleX)}
            onChangeText={value =>
              patchManifest(draft => {
                draft.gameplay.dragTuning.dragDistanceScaleX = toNumber(
                  value,
                  draft.gameplay.dragTuning.dragDistanceScaleX,
                );
              })
            }
          />
          <StudioNumberField
            label="이동 증폭 Y"
            value={String(manifest.gameplay.dragTuning.dragDistanceScaleY)}
            onChangeText={value =>
              patchManifest(draft => {
                draft.gameplay.dragTuning.dragDistanceScaleY = toNumber(
                  value,
                  draft.gameplay.dragTuning.dragDistanceScaleY,
                );
              })
            }
          />
          <StudioNumberField
            label="자석 거리"
            value={String(manifest.gameplay.dragTuning.snapMaxDistanceCells)}
            onChangeText={value =>
              patchManifest(draft => {
                draft.gameplay.dragTuning.snapMaxDistanceCells = toNumber(
                  value,
                  draft.gameplay.dragTuning.snapMaxDistanceCells,
                );
              })
            }
          />
          <StudioNumberField
            label="고정 유지 거리"
            value={String(manifest.gameplay.dragTuning.stickyThresholdCells)}
            onChangeText={value =>
              patchManifest(draft => {
                draft.gameplay.dragTuning.stickyThresholdCells = toNumber(
                  value,
                  draft.gameplay.dragTuning.stickyThresholdCells,
                );
              })
            }
          />
          <StudioNumberField
            label="검색 반경"
            value={String(manifest.gameplay.dragTuning.snapSearchRadius)}
            onChangeText={value =>
              patchManifest(draft => {
                draft.gameplay.dragTuning.snapSearchRadius = toNumber(
                  value,
                  draft.gameplay.dragTuning.snapSearchRadius,
                );
              })
            }
          />
        </View>
      </GamePanel>

      <GamePanel>
        <StudioSectionTitle
          title="오디오 자산"
          description="이미 업로드된 오디오 키를 골라 SFX/BGM에 연결합니다."
        />
        <View style={styles.assetList}>
          {assetOptions.map(asset => (
            <Text key={asset.value} style={styles.assetItem}>
              {asset.label}
            </Text>
          ))}
        </View>
      </GamePanel>
    </>
  );

  const rightPane = !manifest || !hasAccess ? null : (
    <>
      <GamePanel>
        <StudioSectionTitle
          title="전체 볼륨"
          description="공용 볼륨은 개별 이벤트/트랙 설정과 곱연산으로 적용됩니다."
        />
        <View style={styles.fieldGrid}>
          <StudioNumberField
            label="마스터"
            value={String(manifest.gameplay.audio.masterVolume)}
            onChangeText={value =>
              patchManifest(draft => {
                draft.gameplay.audio.masterVolume = toNumber(
                  value,
                  draft.gameplay.audio.masterVolume,
                );
              })
            }
          />
          <StudioNumberField
            label="효과음"
            value={String(manifest.gameplay.audio.sfxVolume)}
            onChangeText={value =>
              patchManifest(draft => {
                draft.gameplay.audio.sfxVolume = toNumber(
                  value,
                  draft.gameplay.audio.sfxVolume,
                );
              })
            }
          />
          <StudioNumberField
            label="배경음"
            value={String(manifest.gameplay.audio.bgmVolume)}
            onChangeText={value =>
              patchManifest(draft => {
                draft.gameplay.audio.bgmVolume = toNumber(
                  value,
                  draft.gameplay.audio.bgmVolume,
                );
              })
            }
          />
        </View>
        <StudioSwitchField
          label="전체 음소거"
          value={manifest.gameplay.audio.muted}
          onValueChange={value =>
            patchManifest(draft => {
              draft.gameplay.audio.muted = value;
            })
          }
        />
      </GamePanel>

      <GamePanel>
        <StudioSectionTitle
          title="효과음 이벤트"
          description="이벤트별 볼륨, 쿨다운, 겹침 허용 여부를 수정합니다."
        />
        <StudioChipRow<GameplaySfxEventId>
          options={GAMEPLAY_SFX_EVENT_IDS.map(eventId => ({
            value: eventId,
            label: GAMEPLAY_SFX_LABELS[eventId],
          }))}
          selectedValue={selectedSfxEvent}
          onSelect={setSelectedSfxEvent}
        />
        {selectedSfxRule ? (
          <View style={styles.fieldGrid}>
            <StudioTextField
              label="오디오 키"
              value={selectedSfxRule.assetKey ?? ''}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.gameplay.audio.sfx[selectedSfxEvent].assetKey =
                    value.trim().length > 0 ? value.trim() : null;
                })
              }
            />
            <StudioNumberField
              label="개별 볼륨"
              value={String(selectedSfxRule.volume)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.gameplay.audio.sfx[selectedSfxEvent].volume = toNumber(
                    value,
                    selectedSfxRule.volume,
                  );
                })
              }
            />
            <StudioNumberField
              label="쿨다운(ms)"
              value={String(selectedSfxRule.cooldownMs)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.gameplay.audio.sfx[selectedSfxEvent].cooldownMs = toNumber(
                    value,
                    selectedSfxRule.cooldownMs,
                  );
                })
              }
            />
            <StudioSwitchField
              label="겹침 허용"
              value={selectedSfxRule.allowOverlap}
              onValueChange={value =>
                patchManifest(draft => {
                  draft.gameplay.audio.sfx[selectedSfxEvent].allowOverlap = value;
                })
              }
            />
            <StudioSwitchField
              label="이벤트 사용"
              value={selectedSfxRule.enabled}
              onValueChange={value =>
                patchManifest(draft => {
                  draft.gameplay.audio.sfx[selectedSfxEvent].enabled = value;
                })
              }
            />
          </View>
        ) : null}
      </GamePanel>

      <GamePanel>
        <StudioSectionTitle
          title="배경음 트랙"
          description="트랙별 파일, 볼륨, 페이드 시간을 따로 조정합니다."
        />
        <StudioChipRow<GameplayBgmTrackId>
          options={GAMEPLAY_BGM_TRACK_IDS.map(trackId => ({
            value: trackId,
            label: GAMEPLAY_BGM_LABELS[trackId],
          }))}
          selectedValue={selectedBgmTrack}
          onSelect={setSelectedBgmTrack}
        />
        {selectedBgmRule ? (
          <View style={styles.fieldGrid}>
            <StudioTextField
              label="오디오 키"
              value={selectedBgmRule.assetKey ?? ''}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.gameplay.audio.bgm[selectedBgmTrack].assetKey =
                    value.trim().length > 0 ? value.trim() : null;
                })
              }
            />
            <StudioNumberField
              label="개별 볼륨"
              value={String(selectedBgmRule.volume)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.gameplay.audio.bgm[selectedBgmTrack].volume = toNumber(
                    value,
                    selectedBgmRule.volume,
                  );
                })
              }
            />
            <StudioNumberField
              label="페이드 인(ms)"
              value={String(selectedBgmRule.fadeInMs)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.gameplay.audio.bgm[selectedBgmTrack].fadeInMs = toNumber(
                    value,
                    selectedBgmRule.fadeInMs,
                  );
                })
              }
            />
            <StudioNumberField
              label="페이드 아웃(ms)"
              value={String(selectedBgmRule.fadeOutMs)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.gameplay.audio.bgm[selectedBgmTrack].fadeOutMs = toNumber(
                    value,
                    selectedBgmRule.fadeOutMs,
                  );
                })
              }
            />
            <StudioSwitchField
              label="반복 재생"
              value={selectedBgmRule.loop}
              onValueChange={value =>
                patchManifest(draft => {
                  draft.gameplay.audio.bgm[selectedBgmTrack].loop = value;
                })
              }
            />
            <StudioSwitchField
              label="트랙 사용"
              value={selectedBgmRule.enabled}
              onValueChange={value =>
                patchManifest(draft => {
                  draft.gameplay.audio.bgm[selectedBgmTrack].enabled = value;
                })
              }
            />
          </View>
        ) : null}
      </GamePanel>

      <GamePanel>
        <StudioSectionTitle
          title="저장과 배포"
          description="UI 스튜디오와 같은 draft/release 흐름을 그대로 사용합니다."
        />
        <StudioTextField
          label="배포 메모"
          value={publishNotes}
          onChangeText={setPublishNotes}
          multiline
        />
        <View style={styles.actionRow}>
          <StudioActionButton
            label={saving ? '저장 중...' : '초안 저장'}
            onPress={() => void handleSaveDraft()}
            disabled={saving}
          />
          <StudioActionButton
            label={publishing ? '배포 중...' : '배포'}
            onPress={() => void handlePublish()}
            disabled={publishing}
          />
        </View>
      </GamePanel>

      <GamePanel>
        <StudioSectionTitle
          title="배포 이력"
          description="문제가 있으면 이전 버전을 기준으로 새 배포본을 만듭니다."
        />
        <View style={styles.assetList}>
          {releaseHistory.map(entry => (
            <View key={entry.version} style={styles.releaseCard}>
              <View style={styles.releaseMeta}>
                <Text style={styles.releaseTitle}>v{entry.version}</Text>
                <Text style={styles.releaseSubtitle}>
                  {new Date(entry.created_at).toLocaleString('ko-KR')}
                </Text>
                <Text style={styles.releaseSubtitle}>
                  {entry.notes || '메모 없음'}
                </Text>
              </View>
              <StudioActionButton
                label="롤백"
                tone="secondary"
                onPress={() => void handleRollback(entry.version)}
              />
            </View>
          ))}
        </View>
      </GamePanel>
    </>
  );

  return (
    <AdminStudioScaffold
      title="사운드/드래그"
      subtitle="효과음, 배경음, 드래그 감도를 모바일 관리자 앱에서 바로 조정합니다."
      onBack={() => navigation.goBack()}
      left={leftPane}
      right={rightPane}
    />
  );
}

const styles = StyleSheet.create({
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
  fieldGrid: {
    gap: 12,
  },
  assetList: {
    gap: 8,
  },
  assetItem: {
    color: '#6f4e2a',
    fontSize: 13,
    fontWeight: '800',
    backgroundColor: '#fff8ee',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d5b48f',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  releaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff8ee',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d5b48f',
    padding: 12,
  },
  releaseMeta: {
    flex: 1,
    gap: 4,
  },
  releaseTitle: {
    color: '#4f3118',
    fontSize: 15,
    fontWeight: '900',
  },
  releaseSubtitle: {
    color: '#7b5b39',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
});
