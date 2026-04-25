import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Modal,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import NativeVoxelWorldView from '../components/NativeVoxelWorldView';
import type {NativeVoxelWorldToolDurabilityEvent} from '../components/NativeVoxelWorldView';
import {
  BLOCK_WORLD_TOOL_DEFINITIONS,
  BLOCK_WORLD_TOOL_REWARD_SOURCES,
  formatBlockWorldToolName,
  getBlockWorldToolDefinition,
  getBlockWorldToolGradeDefinition,
} from '../game/blockWorldTools';
import {
  createEmptyBlockWorldToolInventory,
  loadBlockWorldToolInventory,
  saveSelectedBlockWorldTool,
  updateBlockWorldToolDurability,
  type BlockWorldToolInventory,
  type BlockWorldToolInstance,
} from '../stores/blockWorldToolStore';
import {
  allowBlockWorldOrientation,
  lockGamePortraitOrientation,
} from '../services/screenOrientation';

type BlockOption = {
  id: string;
  label: string;
  color: string;
};

const BLOCK_OPTIONS: BlockOption[] = [
  {id: 'plank', label: '나무판', color: '#b58046'},
  {id: 'grass', label: '잔디', color: '#56ac4e'},
  {id: 'dirt', label: '흙', color: '#7f5331'},
  {id: 'stone', label: '돌', color: '#747982'},
  {id: 'wood', label: '원목', color: '#82522a'},
  {id: 'leaves', label: '잎', color: '#32874d'},
  {id: 'iron_ore', label: '철광석', color: '#a18f7c'},
  {id: 'workbench', label: '작업대', color: '#975f2e'},
  {id: 'furnace', label: '화로', color: '#515860'},
  {id: 'door', label: '문', color: '#925c2d'},
  {id: 'chair', label: '의자', color: '#a66a38'},
];

function getToolSourceLabel(source: BlockWorldToolInstance['source']) {
  return (
    BLOCK_WORLD_TOOL_REWARD_SOURCES.find(item => item.source === source)?.label ??
    '획득 경로 미상'
  );
}

function BagIcon() {
  return (
    <View style={styles.bagIcon}>
      <View style={styles.bagHandle} />
      <View style={styles.bagBody}>
        <View style={styles.bagFlap} />
        <View style={styles.bagClasp} />
      </View>
    </View>
  );
}

export default function HiddenBlockWorldScreen({navigation}: any) {
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;
  const compact = height < 620;
  const [selectedBlock, setSelectedBlock] = useState(BLOCK_OPTIONS[0].id);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [toolInventory, setToolInventory] = useState<BlockWorldToolInventory>(
    createEmptyBlockWorldToolInventory,
  );
  const selected = useMemo(
    () => BLOCK_OPTIONS.find(block => block.id === selectedBlock) ?? BLOCK_OPTIONS[0],
    [selectedBlock],
  );
  const selectedTool = useMemo(
    () =>
      toolInventory.tools.find(tool => tool.id === toolInventory.selectedToolId) ??
      toolInventory.tools[0] ??
      null,
    [toolInventory],
  );
  const selectedToolLabel = selectedTool
    ? formatBlockWorldToolName(selectedTool)
    : '특별 도구 없음';
  const selectedToolGrade = selectedTool
    ? getBlockWorldToolGradeDefinition(selectedTool.grade)
    : null;
  const selectedToolDurabilityText = selectedTool
    ? `내구도 ${selectedTool.durability}/${selectedTool.maxDurability}`
    : '내구도 없음';

  useEffect(() => {
    allowBlockWorldOrientation();
    return () => {
      lockGamePortraitOrientation();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    loadBlockWorldToolInventory().then(next => {
      if (alive) {
        setToolInventory(next);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleSelectTool = useCallback(async (toolId: string | null) => {
    try {
      const next = await saveSelectedBlockWorldTool(toolId);
      setToolInventory(next);
      setInventoryOpen(false);
    } catch (error: any) {
      Alert.alert('도구 선택 실패', error?.message || '다시 시도해주세요.');
    }
  }, []);

  const handleToolDurabilityChanged = useCallback(
    async (event: NativeSyntheticEvent<NativeVoxelWorldToolDurabilityEvent>) => {
      const toolId = selectedTool?.id;
      if (!toolId) {
        return;
      }

      try {
        const next = await updateBlockWorldToolDurability(
          toolId,
          event.nativeEvent.durability,
        );
        setToolInventory(next);
      } catch {}
    },
    [selectedTool?.id],
  );

  return (
    <View style={styles.safeArea}>
      <StatusBar hidden translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.root}>
        <View style={[styles.viewport, isLandscape && styles.viewportLandscape]}>
          {Platform.OS === 'android' && NativeVoxelWorldView ? (
            <NativeVoxelWorldView
              moveX={0}
              moveZ={0}
              turn={0}
              look={0}
              selectedBlock={selectedBlock}
              selectedTool={selectedTool?.kind ?? 'none'}
              selectedToolPowerMultiplier={selectedToolGrade?.powerMultiplier ?? 0}
              selectedToolDurability={selectedTool?.durability ?? 0}
              selectedToolMaxDurability={selectedTool?.maxDurability ?? 0}
              mineCommand={0}
              placeCommand={0}
              resetCommand={0}
              onToolDurabilityChanged={handleToolDurabilityChanged}
              style={styles.nativeWorld}
            />
          ) : (
            <View style={styles.unsupported}>
              <Text style={styles.unsupportedTitle}>Android 전용 3D 월드입니다.</Text>
              <Text style={styles.unsupportedText}>
                현재 버전은 Android 네이티브 렌더러로 동작합니다.
              </Text>
            </View>
          )}

          <View pointerEvents="box-none" style={styles.overlay}>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => navigation.goBack()}
              style={[
                styles.backButton,
                isLandscape && styles.backButtonLandscape,
              ]}>
              <Text style={styles.backButtonText}>뒤로</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setInventoryOpen(true)}
              style={[
                styles.bagButton,
                isLandscape && styles.bagButtonLandscape,
              ]}>
              <BagIcon />
            </TouchableOpacity>

            <View style={[styles.selectedPill, compact && styles.selectedPillCompact]}>
              <View
                style={[styles.selectedSwatch, {backgroundColor: selected.color}]}
              />
              <View style={styles.selectedInfo}>
                <Text numberOfLines={1} style={styles.selectedText}>
                  놓기: {selected.label}
                </Text>
                <Text numberOfLines={1} style={styles.selectedToolText}>
                  캐기: {selectedToolLabel}
                </Text>
                <Text numberOfLines={1} style={styles.selectedDurabilityText}>
                  {selectedToolDurabilityText}
                </Text>
              </View>
            </View>

          </View>
        </View>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setInventoryOpen(false)}
        transparent
        visible={inventoryOpen}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.inventoryModal,
              isLandscape && styles.inventoryModalLandscape,
            ]}>
            <View style={styles.inventoryHeader}>
              <View>
                <Text style={styles.inventoryTitle}>가방</Text>
                <Text style={styles.inventorySubtitle}>
                  블록과 특별 도구를 여기서 확인합니다.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => setInventoryOpen(false)}
                style={styles.closeButton}>
                <Text style={styles.closeButtonText}>닫기</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.inventoryContent}
              showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>블록</Text>
              <View style={styles.blockList}>
                {BLOCK_OPTIONS.map(block => {
                  const active = selectedBlock === block.id;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.78}
                      key={block.id}
                      onPress={() => {
                        setSelectedBlock(block.id);
                        setInventoryOpen(false);
                      }}
                      style={[styles.blockChip, active && styles.blockChipActive]}>
                      <View
                        style={[styles.blockSwatch, {backgroundColor: block.color}]}
                      />
                      <Text
                        style={[
                          styles.blockChipText,
                          active && styles.blockChipTextActive,
                        ]}>
                        {block.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>특별 도구</Text>
              <Text style={styles.sectionHint}>
                등급은 목록에서 미리 보여주지 않고, 획득한 뒤에만 알 수 있게 둡니다.
              </Text>
              <View style={styles.toolList}>
                {toolInventory.tools.length === 0 ? (
                  BLOCK_WORLD_TOOL_DEFINITIONS.map(tool => (
                    <View key={tool.id} style={styles.toolCard}>
                      <Text style={styles.toolName}>{tool.label}</Text>
                      <Text style={styles.toolRole}>{tool.role}</Text>
                      <Text style={styles.toolLocked}>미획득</Text>
                    </View>
                  ))
                ) : (
                  toolInventory.tools.map(tool => {
                    const active = selectedTool?.id === tool.id;
                    const definition = getBlockWorldToolDefinition(tool.kind);
                    const grade = getBlockWorldToolGradeDefinition(tool.grade);
                    return (
                      <TouchableOpacity
                        activeOpacity={0.78}
                        key={tool.id}
                        onPress={() => handleSelectTool(tool.id)}
                        style={[styles.toolCard, active && styles.toolCardActive]}>
                        <View style={styles.toolCardHeader}>
                          <Text style={styles.toolName}>
                            {formatBlockWorldToolName(tool)}
                          </Text>
                          <Text
                            style={[
                              styles.toolEquipped,
                              active && styles.toolEquippedActive,
                            ]}>
                            {active ? '장착중' : '장착'}
                          </Text>
                        </View>
                        <Text style={styles.toolRole}>{definition?.role ?? ''}</Text>
                        <Text style={styles.toolMeta}>
                          등급 발견: {grade?.label ?? '알 수 없음'} ·{' '}
                          {getToolSourceLabel(tool.source)}
                        </Text>
                        <Text style={styles.toolDurability}>
                          내구도 {tool.durability}/{tool.maxDurability}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <Text style={styles.sectionTitle}>획득 경로</Text>
              <View style={styles.rewardList}>
                {BLOCK_WORLD_TOOL_REWARD_SOURCES.map(source => (
                  <View key={source.source} style={styles.rewardItem}>
                    <Text style={styles.rewardLabel}>{source.label}</Text>
                    <Text style={styles.rewardNote}>{source.note}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#79b0e8',
  },
  root: {
    flex: 1,
    backgroundColor: '#79b0e8',
  },
  backButton: {
    position: 'absolute',
    top: 44,
    left: 12,
    zIndex: 20,
    minWidth: 54,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 17, 31, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(221, 234, 255, 0.34)',
  },
  backButtonLandscape: {
    top: 12,
    left: 14,
  },
  backButtonText: {
    color: '#e5eefc',
    fontSize: 13,
    fontWeight: '800',
  },
  bagButton: {
    position: 'absolute',
    top: 42,
    right: 12,
    zIndex: 20,
    width: 44,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 17, 31, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(221, 234, 255, 0.34)',
  },
  bagButtonLandscape: {
    top: 10,
    right: 14,
  },
  bagIcon: {
    width: 27,
    height: 29,
    alignItems: 'center',
  },
  bagHandle: {
    width: 13,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: '#f2cf8a',
  },
  bagBody: {
    width: 25,
    height: 21,
    marginTop: -1,
    borderRadius: 6,
    backgroundColor: '#a86f38',
    borderWidth: 2,
    borderColor: '#f2cf8a',
    alignItems: 'center',
  },
  bagFlap: {
    width: 19,
    height: 7,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#7d4e25',
  },
  bagClasp: {
    width: 5,
    height: 5,
    marginTop: -2,
    borderRadius: 2,
    backgroundColor: '#ffe68a',
  },
  viewport: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#0f1b2d',
    borderWidth: 0,
  },
  viewportLandscape: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
  nativeWorld: {
    flex: 1,
  },
  unsupported: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  unsupportedTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  unsupportedText: {
    marginTop: 8,
    color: '#cbd5e1',
    fontSize: 13,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  selectedPill: {
    position: 'absolute',
    top: 90,
    left: 10,
    maxWidth: '74%',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: 'rgba(8, 17, 31, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(221, 234, 255, 0.24)',
  },
  selectedPillCompact: {
    top: 58,
    minHeight: 30,
  },
  selectedSwatch: {
    width: 15,
    height: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5eefc',
  },
  selectedInfo: {
    flexShrink: 1,
    gap: 1,
  },
  selectedText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  selectedToolText: {
    color: '#d6e2f2',
    fontSize: 10,
    fontWeight: '800',
  },
  selectedDurabilityText: {
    color: '#f2cf8a',
    fontSize: 10,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: 'rgba(2, 6, 13, 0.72)',
  },
  inventoryModal: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '82%',
    borderRadius: 14,
    backgroundColor: '#0b1525',
    borderWidth: 1,
    borderColor: '#304b73',
    overflow: 'hidden',
  },
  inventoryModalLandscape: {
    maxWidth: 720,
    maxHeight: '88%',
  },
  inventoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#223654',
  },
  inventoryTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  inventorySubtitle: {
    marginTop: 2,
    color: '#9fb0c7',
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    height: 34,
    paddingHorizontal: 13,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17243a',
    borderWidth: 1,
    borderColor: '#3a5278',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  inventoryContent: {
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    marginTop: 4,
    color: '#f6fbff',
    fontSize: 14,
    fontWeight: '900',
  },
  sectionHint: {
    marginTop: -4,
    color: '#9fb0c7',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  blockList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  blockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: '#101d31',
    borderWidth: 1,
    borderColor: '#253a5c',
  },
  blockChipActive: {
    backgroundColor: '#f4c95d',
    borderColor: '#fff0a8',
  },
  blockSwatch: {
    width: 13,
    height: 13,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.72)',
  },
  blockChipText: {
    color: '#d7e3f4',
    fontSize: 11,
    fontWeight: '900',
  },
  blockChipTextActive: {
    color: '#1e293b',
  },
  toolList: {
    gap: 8,
  },
  toolCard: {
    minHeight: 70,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#101d31',
    borderWidth: 1,
    borderColor: '#253a5c',
  },
  toolCardActive: {
    backgroundColor: '#1d314e',
    borderColor: '#f4c95d',
  },
  toolCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  toolName: {
    color: '#f8fbff',
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
  },
  toolRole: {
    marginTop: 4,
    color: '#b9c8dc',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  toolLocked: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    overflow: 'hidden',
    color: '#8899b1',
    backgroundColor: '#17243a',
    fontSize: 11,
    fontWeight: '900',
  },
  toolEquipped: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    overflow: 'hidden',
    color: '#17243a',
    backgroundColor: '#f4c95d',
    fontSize: 11,
    fontWeight: '900',
  },
  toolEquippedActive: {
    color: '#f4c95d',
    backgroundColor: '#17243a',
  },
  toolMeta: {
    marginTop: 6,
    color: '#f2cf8a',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
  },
  toolDurability: {
    marginTop: 4,
    color: '#d7e3f4',
    fontSize: 11,
    fontWeight: '800',
  },
  rewardList: {
    gap: 8,
  },
  rewardItem: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#0f1d31',
    borderWidth: 1,
    borderColor: '#243a5c',
  },
  rewardLabel: {
    color: '#f8fbff',
    fontSize: 13,
    fontWeight: '900',
  },
  rewardNote: {
    marginTop: 4,
    color: '#b9c8dc',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
});
