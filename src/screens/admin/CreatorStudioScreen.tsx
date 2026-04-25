import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import GamePanel from '../../components/GamePanel';
import AdminStudioScaffold from '../../components/admin/AdminStudioScaffold';
import {
  fetchCreatorDraft,
  fetchCreatorReleaseHistory,
  publishCreatorDraft,
  rollbackCreatorRelease,
  saveCreatorDraft,
} from '../../services/creatorService';
import {getAdminStatus} from '../../services/adminSync';
import {
  listCreatorEncounters,
  listCreatorLevels,
  listCreatorRaids,
  sanitizeCreatorManifest,
  type CreatorEncounterTemplate,
  type CreatorLevelConfig,
  type CreatorManifest,
  type CreatorRaidConfig,
  type CreatorRaidType,
} from '../../game/creatorManifest';
import {
  StudioActionButton,
  StudioChipRow,
  StudioNumberField,
  StudioSectionTitle,
  StudioSwitchField,
  StudioTextField,
} from './StudioFields';

type CreatorTab = 'levels' | 'normalRaids' | 'bossRaids' | 'encounters';

type ReleaseHistoryEntry = {
  version: number;
  created_at: string;
  notes: string | null;
};

function toInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sortReleaseHistory(entries: ReleaseHistoryEntry[]) {
  return [...entries].sort((left, right) => right.version - left.version);
}

export default function CreatorStudioScreen({navigation}: any) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<CreatorTab>('levels');
  const [selectedKey, setSelectedKey] = useState('1');
  const [manifest, setManifest] = useState<CreatorManifest | null>(null);
  const [releaseHistory, setReleaseHistory] = useState<ReleaseHistoryEntry[]>([]);
  const [publishNotes, setPublishNotes] = useState('');

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const admin = await getAdminStatus();
      setHasAccess(admin);
      if (!admin) {
        return;
      }

      const [draft, history] = await Promise.all([
        fetchCreatorDraft(),
        fetchCreatorReleaseHistory(12),
      ]);
      setManifest(sanitizeCreatorManifest(draft));
      setReleaseHistory(sortReleaseHistory(history));
    } catch (error: any) {
      Alert.alert(
        '관리자 데이터 로드 실패',
        error?.message ?? '초안 데이터를 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const items = useMemo(() => {
    if (!manifest) {
      return [] as Array<{key: string; title: string; subtitle: string}>;
    }

    switch (activeTab) {
      case 'levels':
        return listCreatorLevels(manifest).map(level => ({
          key: String(level.levelId),
          title: `${level.levelId}. ${level.name}`,
          subtitle: `월드 ${level.worldId} · 목표 ${level.goalValue}`,
        }));
      case 'normalRaids':
        return listCreatorRaids(manifest, 'normal').map(raid => ({
          key: String(raid.stage),
          title: `일반 ${raid.stage}단계`,
          subtitle: `${raid.name} · ${raid.timeLimitMs / 1000}s`,
        }));
      case 'bossRaids':
        return listCreatorRaids(manifest, 'boss').map(raid => ({
          key: String(raid.stage),
          title: `보스 ${raid.stage}단계`,
          subtitle: `${raid.name} · ${raid.maxParticipants}인`,
        }));
      case 'encounters':
      default:
        return listCreatorEncounters(manifest).map(encounter => ({
          key: encounter.id,
          title: encounter.displayName,
          subtitle: `${encounter.kind} · ${encounter.tier} · HP ${encounter.baseHp}`,
        }));
    }
  }, [activeTab, manifest]);

  useEffect(() => {
    if (!items.some(item => item.key === selectedKey)) {
      setSelectedKey(items[0]?.key ?? '');
    }
  }, [items, selectedKey]);

  const selectedLevel = useMemo<CreatorLevelConfig | null>(() => {
    if (!manifest || activeTab !== 'levels') {
      return null;
    }
    return manifest.levels[selectedKey] ?? null;
  }, [activeTab, manifest, selectedKey]);

  const selectedRaid = useMemo<CreatorRaidConfig | null>(() => {
    if (!manifest || (activeTab !== 'normalRaids' && activeTab !== 'bossRaids')) {
      return null;
    }
    const raidType: CreatorRaidType = activeTab === 'normalRaids' ? 'normal' : 'boss';
    return manifest.raids[raidType][selectedKey] ?? null;
  }, [activeTab, manifest, selectedKey]);

  const selectedEncounter = useMemo<CreatorEncounterTemplate | null>(() => {
    if (!manifest || activeTab !== 'encounters') {
      return null;
    }
    return manifest.encounters[selectedKey] ?? null;
  }, [activeTab, manifest, selectedKey]);

  const patchManifest = useCallback(
    (mutator: (draft: CreatorManifest) => void) => {
      setManifest(current => {
        if (!current) {
          return current;
        }
        const next = sanitizeCreatorManifest(current);
        mutator(next);
        return sanitizeCreatorManifest(next);
      });
    },
    [],
  );

  const handleSaveDraft = useCallback(async () => {
    if (!manifest) {
      return;
    }

    setSaving(true);
    try {
      const nextManifest = sanitizeCreatorManifest(manifest);
      await saveCreatorDraft(nextManifest);
      setManifest(nextManifest);
      Alert.alert('초안 저장 완료', '관리자 데이터 초안을 저장했습니다.');
    } catch (error: any) {
      Alert.alert(
        '초안 저장 실패',
        error?.message ?? '초안을 저장하지 못했습니다.',
      );
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
      await saveCreatorDraft(sanitizeCreatorManifest(manifest));
      const version = await publishCreatorDraft(publishNotes);
      const [draft, history] = await Promise.all([
        fetchCreatorDraft(),
        fetchCreatorReleaseHistory(12),
      ]);
      setManifest(sanitizeCreatorManifest(draft));
      setReleaseHistory(sortReleaseHistory(history));
      setPublishNotes('');
      Alert.alert('배포 완료', `관리자 데이터 v${version} 배포가 완료됐습니다.`);
    } catch (error: any) {
      Alert.alert(
        '배포 실패',
        error?.message ?? '관리자 데이터를 배포하지 못했습니다.',
      );
    } finally {
      setPublishing(false);
    }
  }, [manifest, publishNotes]);

  const handleRollback = useCallback(async (version: number) => {
    setPublishing(true);
    try {
      await rollbackCreatorRelease(version);
      const [draft, history] = await Promise.all([
        fetchCreatorDraft(),
        fetchCreatorReleaseHistory(12),
      ]);
      setManifest(sanitizeCreatorManifest(draft));
      setReleaseHistory(sortReleaseHistory(history));
      Alert.alert('롤백 완료', `v${version} 기준 새 배포본을 만들었습니다.`);
    } catch (error: any) {
      Alert.alert(
        '롤백 실패',
        error?.message ?? '이전 버전으로 롤백하지 못했습니다.',
      );
    } finally {
      setPublishing(false);
    }
  }, []);

  const leftPane = loading ? (
    <GamePanel style={styles.loadingPanel}>
      <ActivityIndicator size="large" color="#8a5e35" />
      <Text style={styles.loadingText}>관리자 데이터를 불러오는 중입니다.</Text>
    </GamePanel>
  ) : !hasAccess ? (
    <GamePanel>
      <StudioSectionTitle
        title="접근 권한 없음"
        description="관리자 계정만 관리자 데이터를 편집할 수 있습니다."
      />
    </GamePanel>
  ) : (
    <>
      <GamePanel>
        <StudioSectionTitle
          title="편집 범위"
          description="레벨, 레이드, 적 템플릿을 한 화면에서 골라 편집합니다."
        />
        <StudioChipRow<CreatorTab>
          options={[
            {value: 'levels', label: '레벨'},
            {value: 'normalRaids', label: '일반 레이드'},
            {value: 'bossRaids', label: '보스 레이드'},
            {value: 'encounters', label: '적 템플릿'},
          ]}
          selectedValue={activeTab}
          onSelect={setActiveTab}
        />
      </GamePanel>

      <GamePanel>
        <StudioSectionTitle
          title="목록"
          description="왼쪽에서 항목을 고르면 오른쪽 패널에서 바로 수정합니다."
        />
        <View style={styles.listColumn}>
          {items.map(item => {
            const active = item.key === selectedKey;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.listCard, active && styles.listCardActive]}
                onPress={() => setSelectedKey(item.key)}>
                <Text style={[styles.listTitle, active && styles.listTitleActive]}>
                  {item.title}
                </Text>
                <Text
                  style={[
                    styles.listSubtitle,
                    active && styles.listSubtitleActive,
                  ]}>
                  {item.subtitle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </GamePanel>
    </>
  );

  const rightPane = !manifest || !hasAccess ? null : (
    <>
      {selectedLevel ? (
        <GamePanel>
          <StudioSectionTitle
            title={`레벨 ${selectedLevel.levelId}`}
            description="레벨 이름, 목표, 보상, 사용 여부를 수정합니다."
          />
          <View style={styles.fieldGrid}>
            <StudioTextField
              label="레벨 이름"
              value={selectedLevel.name}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.levels[selectedKey].name = value;
                })
              }
            />
            <StudioNumberField
              label="목표 수치"
              value={String(selectedLevel.goalValue)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.levels[selectedKey].goalValue = toInt(
                    value,
                    selectedLevel.goalValue,
                  );
                })
              }
            />
            <StudioNumberField
              label="반복 골드"
              value={String(selectedLevel.reward.repeatGold)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.levels[selectedKey].reward.repeatGold = toInt(
                    value,
                    selectedLevel.reward.repeatGold,
                  );
                })
              }
            />
            <StudioNumberField
              label="첫 클리어 추가 골드"
              value={String(selectedLevel.reward.firstClearBonusGold)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.levels[selectedKey].reward.firstClearBonusGold = toInt(
                    value,
                    selectedLevel.reward.firstClearBonusGold,
                  );
                })
              }
            />
            <StudioNumberField
              label="캐릭터 경험치"
              value={String(selectedLevel.reward.characterExp)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.levels[selectedKey].reward.characterExp = toInt(
                    value,
                    selectedLevel.reward.characterExp,
                  );
                })
              }
            />
            <StudioTextField
              label="적 템플릿 ID"
              value={selectedLevel.enemyTemplateId}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.levels[selectedKey].enemyTemplateId = value;
                })
              }
            />
          </View>
          <StudioSwitchField
            label="레벨 사용"
            value={selectedLevel.enabled}
            onValueChange={value =>
              patchManifest(draft => {
                draft.levels[selectedKey].enabled = value;
              })
            }
          />
          <StudioTextField
            label="메모"
            value={selectedLevel.notes ?? ''}
            onChangeText={value =>
              patchManifest(draft => {
                draft.levels[selectedKey].notes = value;
              })
            }
            multiline
          />
        </GamePanel>
      ) : null}

      {selectedRaid ? (
        <GamePanel>
          <StudioSectionTitle
            title={`${selectedRaid.raidType === 'normal' ? '일반' : '보스'} 레이드 ${
              selectedRaid.stage
            }`}
            description="레이드 이름, 시간 제한, 참가 인원, 보상을 수정합니다."
          />
          <View style={styles.fieldGrid}>
            <StudioTextField
              label="레이드 이름"
              value={selectedRaid.name}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.raids[
                    selectedRaid.raidType
                  ][selectedKey].name = value;
                })
              }
            />
            <StudioNumberField
              label="시간 제한(ms)"
              value={String(selectedRaid.timeLimitMs)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.raids[
                    selectedRaid.raidType
                  ][selectedKey].timeLimitMs = toInt(
                    value,
                    selectedRaid.timeLimitMs,
                  );
                })
              }
            />
            <StudioNumberField
              label="개설 간격(시간)"
              value={String(selectedRaid.raidWindowHours)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.raids[
                    selectedRaid.raidType
                  ][selectedKey].raidWindowHours = toInt(
                    value,
                    selectedRaid.raidWindowHours,
                  );
                })
              }
            />
            <StudioNumberField
              label="참여 가능 시간(분)"
              value={String(selectedRaid.joinWindowMinutes)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.raids[
                    selectedRaid.raidType
                  ][selectedKey].joinWindowMinutes = toInt(
                    value,
                    selectedRaid.joinWindowMinutes,
                  );
                })
              }
            />
            <StudioNumberField
              label="최대 참가 인원"
              value={String(selectedRaid.maxParticipants)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.raids[
                    selectedRaid.raidType
                  ][selectedKey].maxParticipants = toInt(
                    value,
                    selectedRaid.maxParticipants,
                  );
                })
              }
            />
            <StudioTextField
              label="적 템플릿 ID"
              value={selectedRaid.encounterTemplateId}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.raids[
                    selectedRaid.raidType
                  ][selectedKey].encounterTemplateId = value;
                })
              }
            />
          </View>
          <View style={styles.fieldGrid}>
            <StudioNumberField
              label="첫 클리어 다이아"
              value={String(selectedRaid.reward.firstClearDiamondReward)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.raids[
                    selectedRaid.raidType
                  ][selectedKey].reward.firstClearDiamondReward = toInt(
                    value,
                    selectedRaid.reward.firstClearDiamondReward,
                  );
                })
              }
            />
            <StudioNumberField
              label="반복 다이아"
              value={String(selectedRaid.reward.repeatDiamondReward)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.raids[
                    selectedRaid.raidType
                  ][selectedKey].reward.repeatDiamondReward = toInt(
                    value,
                    selectedRaid.reward.repeatDiamondReward,
                  );
                })
              }
            />
          </View>
          <StudioSwitchField
            label="레이드 사용"
            value={selectedRaid.enabled}
            onValueChange={value =>
              patchManifest(draft => {
                draft.raids[selectedRaid.raidType][selectedKey].enabled = value;
              })
            }
          />
          <StudioTextField
            label="메모"
            value={selectedRaid.notes ?? ''}
            onChangeText={value =>
              patchManifest(draft => {
                draft.raids[selectedRaid.raidType][selectedKey].notes = value;
              })
            }
            multiline
          />
        </GamePanel>
      ) : null}

      {selectedEncounter ? (
        <GamePanel>
          <StudioSectionTitle
            title={selectedEncounter.displayName}
            description="적 이름, 표시 이모지, 전투 수치를 바로 수정합니다."
          />
          <View style={styles.fieldGrid}>
            <StudioTextField
              label="표시 이름"
              value={selectedEncounter.displayName}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.encounters[selectedKey].displayName = value;
                })
              }
            />
            <StudioTextField
              label="몬스터 이름"
              value={selectedEncounter.monsterName}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.encounters[selectedKey].monsterName = value;
                })
              }
            />
            <StudioTextField
              label="이모지"
              value={selectedEncounter.monsterEmoji}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.encounters[selectedKey].monsterEmoji = value;
                })
              }
            />
            <StudioTextField
              label="색상"
              value={selectedEncounter.monsterColor}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.encounters[selectedKey].monsterColor = value;
                })
              }
            />
            <StudioNumberField
              label="체력"
              value={String(selectedEncounter.baseHp)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.encounters[selectedKey].baseHp = toInt(
                    value,
                    selectedEncounter.baseHp,
                  );
                })
              }
            />
            <StudioNumberField
              label="공격력"
              value={String(selectedEncounter.baseAttack)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.encounters[selectedKey].baseAttack = toInt(
                    value,
                    selectedEncounter.baseAttack,
                  );
                })
              }
            />
            <StudioNumberField
              label="공격 주기(ms)"
              value={String(selectedEncounter.attackIntervalMs)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.encounters[selectedKey].attackIntervalMs = toInt(
                    value,
                    selectedEncounter.attackIntervalMs,
                  );
                })
              }
            />
          </View>
          <StudioSwitchField
            label="적 사용"
            value={selectedEncounter.enabled}
            onValueChange={value =>
              patchManifest(draft => {
                draft.encounters[selectedKey].enabled = value;
              })
            }
          />
          <StudioTextField
            label="메모"
            value={selectedEncounter.notes ?? ''}
            onChangeText={value =>
              patchManifest(draft => {
                draft.encounters[selectedKey].notes = value;
              })
            }
            multiline
          />
        </GamePanel>
      ) : null}

      <GamePanel>
        <StudioSectionTitle
          title="저장과 배포"
          description="초안 저장 후 배포하면 게임과 관리자 앱이 같은 버전을 읽습니다."
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
          description="필요하면 이전 버전을 기준으로 새 배포본을 다시 만듭니다."
        />
        <View style={styles.listColumn}>
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
      title="관리자 데이터"
      subtitle="레벨, 레이드, 적 템플릿을 모바일에서도 바로 편집합니다."
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
  listColumn: {
    gap: 10,
  },
  listCard: {
    backgroundColor: '#fff8ee',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#d5b48f',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  listCardActive: {
    backgroundColor: '#f4e2c4',
    borderColor: '#7f5a32',
  },
  listTitle: {
    color: '#4f3118',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  listTitleActive: {
    color: '#6d4622',
  },
  listSubtitle: {
    color: '#876346',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  listSubtitleActive: {
    color: '#6d4929',
  },
  fieldGrid: {
    gap: 12,
    marginBottom: 12,
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
