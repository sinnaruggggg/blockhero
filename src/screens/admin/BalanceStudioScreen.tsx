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
  applyPercentToCharacterFields,
  applyPercentToEncounterFields,
  applyPercentToGlobalSkillFields,
  applyPercentToSkillFields,
  getLevelEncounterIdsByWorld,
  getRaidEncounterIds,
  patchCharacterBalance,
  type CharacterBalanceField,
  type EncounterBalanceField,
  CHARACTER_BALANCE_FIELD_DEFINITIONS,
  ENCOUNTER_BALANCE_FIELD_DEFINITIONS,
} from '../../game/adminBalanceTools';
import {
  listCreatorLevels,
  listCreatorRaids,
  sanitizeCreatorManifest,
  type CreatorManifest,
} from '../../game/creatorManifest';
import {
  SKILL_EFFECT_FIELD_DEFINITIONS,
  SKILL_EFFECT_NUMERIC_FIELDS,
  type SkillEffectFieldDefinition,
} from '../../game/skillEffectCatalog';
import {getAdminStatus} from '../../services/adminSync';
import {
  fetchCreatorDraft,
  fetchCreatorReleaseHistory,
  publishCreatorDraft,
  rollbackCreatorRelease,
  saveCreatorDraft,
} from '../../services/creatorService';
import {
  StudioActionButton,
  StudioChipRow,
  StudioNumberField,
  StudioSectionTitle,
  StudioSwitchField,
} from './StudioFields';

type BalanceTab = 'monster' | 'raid' | 'characters' | 'skills';

type ReleaseHistoryEntry = {
  version: number;
  created_at: string;
  notes: string | null;
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function BalanceStudioScreen({navigation}: any) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [manifest, setManifest] = useState<CreatorManifest | null>(null);
  const [activeTab, setActiveTab] = useState<BalanceTab>('monster');
  const [selectedKey, setSelectedKey] = useState('1');
  const [publishNotes, setPublishNotes] = useState('');
  const [releaseHistory, setReleaseHistory] = useState<ReleaseHistoryEntry[]>([]);
  const [bulkPercent, setBulkPercent] = useState('10');
  const [monsterBulkField, setMonsterBulkField] =
    useState<EncounterBalanceField>('baseHp');
  const [monsterBulkScope, setMonsterBulkScope] = useState('all-levels');
  const [raidBulkField, setRaidBulkField] = useState<EncounterBalanceField>('baseHp');
  const [raidBulkScope, setRaidBulkScope] = useState('all-normal');
  const [characterBulkField, setCharacterBulkField] =
    useState<CharacterBalanceField>('baseAtk');
  const [skillBulkField, setSkillBulkField] = useState(SKILL_EFFECT_NUMERIC_FIELDS[0]);
  const [skillBulkScope, setSkillBulkScope] = useState('all-characters');

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
      setReleaseHistory(history);
    } catch (error: any) {
      Alert.alert(
        '전투 밸런스 로드 실패',
        error?.message ?? '밸런스 데이터를 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const patchManifest = useCallback((mutator: (draft: CreatorManifest) => void) => {
    setManifest(current => {
      if (!current) {
        return current;
      }
      const next = sanitizeCreatorManifest(current);
      mutator(next);
      return sanitizeCreatorManifest(next);
    });
  }, []);

  const worldIds = useMemo(() => {
    if (!manifest) {
      return [] as number[];
    }
    return Array.from(
      new Set(Object.values(manifest.levels).map(level => level.worldId)),
    ).sort((left, right) => left - right);
  }, [manifest]);

  const monsterItems = useMemo(() => {
    if (!manifest) {
      return [];
    }
    return listCreatorLevels(manifest).map(level => {
      const encounter = manifest.encounters[level.enemyTemplateId];
      return {
        key: String(level.levelId),
        title: `${level.levelId}. ${level.name}`,
        subtitle: `${encounter?.monsterName ?? level.enemyTemplateId} · HP ${
          encounter?.baseHp ?? '-'
        } · ATK ${encounter?.baseAttack ?? '-'}`,
      };
    });
  }, [manifest]);

  const raidItems = useMemo(() => {
    if (!manifest) {
      return [];
    }
    return [...listCreatorRaids(manifest, 'normal'), ...listCreatorRaids(manifest, 'boss')].map(
      raid => {
        const encounter = manifest.encounters[raid.encounterTemplateId];
        return {
          key: `${raid.raidType}:${raid.stage}`,
          title: `${raid.raidType === 'normal' ? '일반' : '보스'} ${raid.stage}`,
          subtitle: `${encounter?.monsterName ?? raid.encounterTemplateId} · HP ${
            encounter?.baseHp ?? '-'
          } · ATK ${encounter?.baseAttack ?? '-'}`,
        };
      },
    );
  }, [manifest]);

  const characterItems = useMemo(() => {
    if (!manifest) {
      return [];
    }
    return Object.values(manifest.balance.characters).map(character => ({
      key: character.id,
      title: character.name,
      subtitle: `ATK ${character.baseAtk}/${character.atkPerLevel} · HP ${character.baseHp}/${character.hpPerLevel}`,
    }));
  }, [manifest]);

  const skillItems = useMemo(() => {
    if (!manifest) {
      return [];
    }
    return [
      {key: 'global', title: '전체 스킬 배율', subtitle: '모든 캐릭터 공통 배율'},
      ...Object.values(manifest.balance.characters).map(character => ({
        key: character.id,
        title: `${character.name} 스킬`,
        subtitle: '캐릭터 전용 스킬 효과 배율',
      })),
    ];
  }, [manifest]);

  const activeItems = useMemo(() => {
    switch (activeTab) {
      case 'monster':
        return monsterItems;
      case 'raid':
        return raidItems;
      case 'characters':
        return characterItems;
      case 'skills':
      default:
        return skillItems;
    }
  }, [activeTab, characterItems, monsterItems, raidItems, skillItems]);

  useEffect(() => {
    if (!activeItems.some(item => item.key === selectedKey)) {
      setSelectedKey(activeItems[0]?.key ?? '');
    }
  }, [activeItems, selectedKey]);

  const selectedMonsterLevel = useMemo(() => {
    if (!manifest || activeTab !== 'monster') {
      return null;
    }
    return manifest.levels[selectedKey] ?? null;
  }, [activeTab, manifest, selectedKey]);

  const selectedMonsterEncounter = useMemo(() => {
    if (!manifest || !selectedMonsterLevel) {
      return null;
    }
    return manifest.encounters[selectedMonsterLevel.enemyTemplateId] ?? null;
  }, [manifest, selectedMonsterLevel]);

  const selectedRaidInfo = useMemo(() => {
    if (!manifest || activeTab !== 'raid') {
      return null;
    }
    const [raidType, stageRaw] = selectedKey.split(':');
    const raid = manifest.raids[raidType as 'normal' | 'boss']?.[stageRaw];
    if (!raid) {
      return null;
    }
    return {
      raid,
      encounter: manifest.encounters[raid.encounterTemplateId] ?? null,
    };
  }, [activeTab, manifest, selectedKey]);

  const selectedCharacter = useMemo(() => {
    if (!manifest || activeTab !== 'characters') {
      return null;
    }
    return manifest.balance.characters[selectedKey] ?? null;
  }, [activeTab, manifest, selectedKey]);

  const selectedSkillTarget = useMemo(() => {
    if (!manifest || activeTab !== 'skills') {
      return null;
    }
    if (selectedKey === 'global') {
      return manifest.balance.skillEffects.global;
    }
    return manifest.balance.skillEffects.characters[selectedKey] ?? null;
  }, [activeTab, manifest, selectedKey]);

  const handleSaveDraft = useCallback(async () => {
    if (!manifest) {
      return;
    }

    setSaving(true);
    try {
      const nextManifest = sanitizeCreatorManifest(manifest);
      await saveCreatorDraft(nextManifest);
      setManifest(nextManifest);
      Alert.alert('초안 저장 완료', '전투 밸런스 초안을 저장했습니다.');
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
      await saveCreatorDraft(sanitizeCreatorManifest(manifest));
      const version = await publishCreatorDraft(publishNotes);
      const [draft, history] = await Promise.all([
        fetchCreatorDraft(),
        fetchCreatorReleaseHistory(12),
      ]);
      setManifest(sanitizeCreatorManifest(draft));
      setReleaseHistory(history);
      setPublishNotes('');
      Alert.alert('배포 완료', `전투 밸런스 v${version} 배포가 완료됐습니다.`);
    } catch (error: any) {
      Alert.alert('배포 실패', error?.message ?? '배포에 실패했습니다.');
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
      setReleaseHistory(history);
      Alert.alert('롤백 완료', `v${version} 기준 새 배포본을 만들었습니다.`);
    } catch (error: any) {
      Alert.alert('롤백 실패', error?.message ?? '롤백에 실패했습니다.');
    } finally {
      setPublishing(false);
    }
  }, []);

  const applyMonsterBulk = useCallback(() => {
    if (!manifest) {
      return;
    }
    const percent = toNumber(bulkPercent, 0);
    const encounterIds =
      monsterBulkScope === 'all-levels'
        ? listCreatorLevels(manifest).map(level => level.enemyTemplateId)
        : getLevelEncounterIdsByWorld(
            manifest,
            toInt(monsterBulkScope.replace('world-', ''), 1),
          );
    setManifest(
      applyPercentToEncounterFields(manifest, encounterIds, [monsterBulkField], percent),
    );
  }, [bulkPercent, manifest, monsterBulkField, monsterBulkScope]);

  const applyRaidBulk = useCallback(() => {
    if (!manifest) {
      return;
    }
    const percent = toNumber(bulkPercent, 0);
    const encounterIds =
      raidBulkScope === 'all-boss'
        ? getRaidEncounterIds(manifest, 'boss')
        : getRaidEncounterIds(manifest, 'normal');
    setManifest(
      applyPercentToEncounterFields(manifest, encounterIds, [raidBulkField], percent),
    );
  }, [bulkPercent, manifest, raidBulkField, raidBulkScope]);

  const applyCharacterBulk = useCallback(() => {
    if (!manifest) {
      return;
    }
    const percent = toNumber(bulkPercent, 0);
    setManifest(
      applyPercentToCharacterFields(
        manifest,
        Object.keys(manifest.balance.characters),
        [characterBulkField],
        percent,
      ),
    );
  }, [bulkPercent, characterBulkField, manifest]);

  const applySkillBulk = useCallback(() => {
    if (!manifest) {
      return;
    }
    const percent = toNumber(bulkPercent, 0);
    if (skillBulkScope === 'global') {
      setManifest(applyPercentToGlobalSkillFields(manifest, [skillBulkField], percent));
      return;
    }
    const targetIds =
      skillBulkScope === 'all-characters'
        ? Object.keys(manifest.balance.characters)
        : [skillBulkScope];
    setManifest(applyPercentToSkillFields(manifest, targetIds, [skillBulkField], percent));
  }, [bulkPercent, manifest, skillBulkField, skillBulkScope]);

  const leftPane = loading ? (
    <GamePanel style={styles.loadingPanel}>
      <ActivityIndicator size="large" color="#8a5e35" />
      <Text style={styles.loadingText}>전투 밸런스를 불러오는 중입니다.</Text>
    </GamePanel>
  ) : !hasAccess ? (
    <GamePanel>
      <StudioSectionTitle
        title="접근 권한 없음"
        description="관리자 계정만 전투 밸런스를 편집할 수 있습니다."
      />
    </GamePanel>
  ) : !manifest ? null : (
    <>
      <GamePanel>
        <StudioSectionTitle
          title="편집 대상"
          description="개별 편집과 그룹 퍼센트 적용을 같은 화면에서 처리합니다."
        />
        <StudioChipRow<BalanceTab>
          options={[
            {value: 'monster', label: '월드 몬스터'},
            {value: 'raid', label: '레이드/보스'},
            {value: 'characters', label: '캐릭터'},
            {value: 'skills', label: '스킬 효과'},
          ]}
          selectedValue={activeTab}
          onSelect={setActiveTab}
        />
      </GamePanel>

      <GamePanel>
        <StudioSectionTitle
          title="그룹 퍼센트 적용"
          description="퍼센트를 넣고 적용하면 해당 범위의 수치만 일괄 변경됩니다."
        />
        <StudioNumberField
          label="적용 퍼센트"
          value={bulkPercent}
          onChangeText={setBulkPercent}
        />
        {activeTab === 'monster' ? (
          <>
            <StudioChipRow<string>
              options={[
                {value: 'all-levels', label: '전체 몬스터'},
                ...worldIds.map(worldId => ({
                  value: `world-${worldId}`,
                  label: `${worldId}월드`,
                })),
              ]}
              selectedValue={monsterBulkScope}
              onSelect={setMonsterBulkScope}
            />
            <StudioChipRow<EncounterBalanceField>
              options={ENCOUNTER_BALANCE_FIELD_DEFINITIONS.map(field => ({
                value: field.key,
                label: field.label,
              }))}
              selectedValue={monsterBulkField}
              onSelect={setMonsterBulkField}
            />
            <StudioActionButton label="몬스터 그룹 적용" onPress={applyMonsterBulk} />
          </>
        ) : null}

        {activeTab === 'raid' ? (
          <>
            <StudioChipRow<string>
              options={[
                {value: 'all-normal', label: '일반 레이드'},
                {value: 'all-boss', label: '보스 레이드'},
              ]}
              selectedValue={raidBulkScope}
              onSelect={setRaidBulkScope}
            />
            <StudioChipRow<EncounterBalanceField>
              options={ENCOUNTER_BALANCE_FIELD_DEFINITIONS.map(field => ({
                value: field.key,
                label: field.label,
              }))}
              selectedValue={raidBulkField}
              onSelect={setRaidBulkField}
            />
            <StudioActionButton label="레이드 그룹 적용" onPress={applyRaidBulk} />
          </>
        ) : null}

        {activeTab === 'characters' ? (
          <>
            <StudioChipRow<CharacterBalanceField>
              options={CHARACTER_BALANCE_FIELD_DEFINITIONS.map(field => ({
                value: field.key,
                label: field.label,
              }))}
              selectedValue={characterBulkField}
              onSelect={setCharacterBulkField}
            />
            <StudioActionButton label="전체 캐릭터 적용" onPress={applyCharacterBulk} />
          </>
        ) : null}

        {activeTab === 'skills' ? (
          <>
            <StudioChipRow<string>
              options={[
                {value: 'global', label: '전체 공통'},
                {value: 'all-characters', label: '전체 캐릭터'},
                ...Object.values(manifest.balance.characters).map(character => ({
                  value: character.id,
                  label: character.name,
                })),
              ]}
              selectedValue={skillBulkScope}
              onSelect={setSkillBulkScope}
            />
            <StudioChipRow<(typeof SKILL_EFFECT_NUMERIC_FIELDS)[number]>
              options={SKILL_EFFECT_NUMERIC_FIELDS.map(fieldKey => ({
                value: fieldKey,
                label: SKILL_EFFECT_FIELD_DEFINITIONS.find(field => field.key === fieldKey)
                  ?.label ?? fieldKey,
              }))}
              selectedValue={skillBulkField}
              onSelect={setSkillBulkField}
            />
            <StudioActionButton label="스킬 효과 적용" onPress={applySkillBulk} />
          </>
        ) : null}
      </GamePanel>

      <GamePanel>
        <StudioSectionTitle
          title="항목 목록"
          description="왼쪽에서 선택하고 오른쪽 패널에서 바로 세부 값을 고칩니다."
        />
        <View style={styles.listColumn}>
          {activeItems.map(item => {
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
      {selectedMonsterLevel && selectedMonsterEncounter ? (
        <GamePanel>
          <StudioSectionTitle
            title={`${selectedMonsterLevel.levelId}. ${selectedMonsterLevel.name}`}
            description="월드 몬스터 개별 수치 편집입니다."
          />
          <View style={styles.fieldGrid}>
            <StudioNumberField
              label="체력"
              value={String(selectedMonsterEncounter.baseHp)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.encounters[selectedMonsterEncounter.id].baseHp = toInt(
                    value,
                    selectedMonsterEncounter.baseHp,
                  );
                })
              }
            />
            <StudioNumberField
              label="공격력"
              value={String(selectedMonsterEncounter.baseAttack)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.encounters[selectedMonsterEncounter.id].baseAttack = toInt(
                    value,
                    selectedMonsterEncounter.baseAttack,
                  );
                })
              }
            />
            <StudioNumberField
              label="공격 주기(ms)"
              value={String(selectedMonsterEncounter.attackIntervalMs)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.encounters[selectedMonsterEncounter.id].attackIntervalMs = toInt(
                    value,
                    selectedMonsterEncounter.attackIntervalMs,
                  );
                })
              }
            />
          </View>
        </GamePanel>
      ) : null}

      {selectedRaidInfo?.raid && selectedRaidInfo.encounter ? (
        <GamePanel>
          <StudioSectionTitle
            title={`${selectedRaidInfo.raid.raidType === 'normal' ? '일반' : '보스'} ${
              selectedRaidInfo.raid.stage
            }단계`}
            description="레이드 보스 개별 수치 편집입니다."
          />
          <View style={styles.fieldGrid}>
            <StudioNumberField
              label="체력"
              value={String(selectedRaidInfo.encounter.baseHp)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.encounters[selectedRaidInfo.encounter!.id].baseHp = toInt(
                    value,
                    selectedRaidInfo.encounter!.baseHp,
                  );
                })
              }
            />
            <StudioNumberField
              label="공격력"
              value={String(selectedRaidInfo.encounter.baseAttack)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.encounters[selectedRaidInfo.encounter!.id].baseAttack = toInt(
                    value,
                    selectedRaidInfo.encounter!.baseAttack,
                  );
                })
              }
            />
            <StudioNumberField
              label="공격 주기(ms)"
              value={String(selectedRaidInfo.encounter.attackIntervalMs)}
              onChangeText={value =>
                patchManifest(draft => {
                  draft.encounters[
                    selectedRaidInfo.encounter!.id
                  ].attackIntervalMs = toInt(
                    value,
                    selectedRaidInfo.encounter!.attackIntervalMs,
                  );
                })
              }
            />
          </View>
        </GamePanel>
      ) : null}

      {selectedCharacter ? (
        <GamePanel>
          <StudioSectionTitle
            title={selectedCharacter.name}
            description="캐릭터 기본 능력치를 직접 수정합니다."
          />
          <View style={styles.fieldGrid}>
            <StudioNumberField
              label="기본 공격력"
              value={String(selectedCharacter.baseAtk)}
              onChangeText={value =>
                setManifest(
                  patchCharacterBalance(manifest, selectedCharacter.id, {
                    baseAtk: toInt(value, selectedCharacter.baseAtk),
                  }),
                )
              }
            />
            <StudioNumberField
              label="레벨당 공격력"
              value={String(selectedCharacter.atkPerLevel)}
              onChangeText={value =>
                setManifest(
                  patchCharacterBalance(manifest, selectedCharacter.id, {
                    atkPerLevel: toInt(value, selectedCharacter.atkPerLevel),
                  }),
                )
              }
            />
            <StudioNumberField
              label="기본 체력"
              value={String(selectedCharacter.baseHp)}
              onChangeText={value =>
                setManifest(
                  patchCharacterBalance(manifest, selectedCharacter.id, {
                    baseHp: toInt(value, selectedCharacter.baseHp),
                  }),
                )
              }
            />
            <StudioNumberField
              label="레벨당 체력"
              value={String(selectedCharacter.hpPerLevel)}
              onChangeText={value =>
                setManifest(
                  patchCharacterBalance(manifest, selectedCharacter.id, {
                    hpPerLevel: toInt(value, selectedCharacter.hpPerLevel),
                  }),
                )
              }
            />
          </View>
        </GamePanel>
      ) : null}

      {selectedSkillTarget ? (
        <GamePanel>
          <StudioSectionTitle
            title={selectedKey === 'global' ? '전체 공통 스킬 배율' : '캐릭터 스킬 배율'}
            description="수치 1.00은 기본값입니다. 1.20이면 20% 강화, 0.80이면 20% 약화입니다."
          />
          <View style={styles.skillFieldColumn}>
            {SKILL_EFFECT_NUMERIC_FIELDS.map(fieldKey => {
              const field = SKILL_EFFECT_FIELD_DEFINITIONS.find(
                entry => entry.key === fieldKey,
              ) as SkillEffectFieldDefinition;
              const currentValue = selectedSkillTarget.numeric[fieldKey] ?? 1;
              return (
                <StudioNumberField
                  key={fieldKey}
                  label={field.label}
                  value={String(currentValue)}
                  onChangeText={value =>
                    patchManifest(draft => {
                      const target =
                        selectedKey === 'global'
                          ? draft.balance.skillEffects.global
                          : draft.balance.skillEffects.characters[selectedKey];
                      target.numeric[fieldKey] = toNumber(value, currentValue);
                    })
                  }
                />
              );
            })}
            <StudioSwitchField
              label="부활 허용"
              value={selectedSkillTarget.booleans.reviveOnce === true}
              onValueChange={value =>
                patchManifest(draft => {
                  const target =
                    selectedKey === 'global'
                      ? draft.balance.skillEffects.global
                      : draft.balance.skillEffects.characters[selectedKey];
                  target.booleans.reviveOnce = value;
                })
              }
            />
          </View>
        </GamePanel>
      ) : null}

      <GamePanel>
        <StudioSectionTitle
          title="저장과 배포"
          description="전투 밸런스도 같은 creator draft/release 흐름으로 배포합니다."
        />
        <StudioNumberField
          label="배포 메모"
          value={publishNotes}
          onChangeText={setPublishNotes}
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
          description="문제가 생기면 이전 버전 기준으로 새 배포본을 만들 수 있습니다."
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
      title="전투 밸런스"
      subtitle="몬스터, 보스, 캐릭터, 스킬 효과를 개별 편집과 퍼센트 일괄 적용으로 조정합니다."
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
  },
  skillFieldColumn: {
    gap: 10,
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
