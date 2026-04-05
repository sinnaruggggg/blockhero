import React, {useEffect, useReducer, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  clearPersistedAppState,
  loadPersistedAppState,
  persistAppState,
} from './blockhero_persistence';
import {buildSupabaseSyncPayload} from './blockhero_sync_payload';
import {canUnlockOrUpgradeSkill} from './combat_rules';
import {SKIN_DEFINITIONS} from './game_catalog';
import {
  appReducer,
  createInitialState,
  getBossRaidWindowInfo,
  getCurrentCharacterDefinition,
  getCurrentInventoryCap,
  getCurrentCharacterStats,
  getCurrentClearCount,
  getCurrentShopOffers,
  getCurrentSkillTree,
  getEquippedSkin,
  getEquippedSummonProgress,
  getSelectedWorld,
  getStagesForSelectedWorld,
  initialState,
} from './blockhero_state';

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}

function getPieceCellStyle(filled: boolean, color: string) {
  return StyleSheet.compose(
    filled ? styles.pieceCellFilled : styles.pieceCellEmpty,
    filled ? {backgroundColor: color} : null,
  );
}

export default function BlockHeroApp() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [lobbyDraft, setLobbyDraft] = useState('');
  const [runDraft, setRunDraft] = useState('');
  const [showFullBossStandings, setShowFullBossStandings] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'loading' | 'saved' | 'error'>('loading');

  useEffect(() => {
    const timer = setInterval(() => {
      dispatch({type: 'tick', nowMs: Date.now()});
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      const snapshot = await loadPersistedAppState();

      if (!mounted) {
        return;
      }

      if (snapshot) {
        dispatch({type: 'hydrate_state', snapshot});
      }

      setHasHydrated(true);
      setSaveStatus('saved');
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    let mounted = true;

    async function save() {
      const success = await persistAppState(state);

      if (mounted) {
        setSaveStatus(success ? 'saved' : 'error');
      }
    }

    save();

    return () => {
      mounted = false;
    };
  }, [hasHydrated, state]);

  const selectedCharacter = state.player.characters[state.player.selectedClassId];
  const selectedDefinition = getCurrentCharacterDefinition(state);
  const selectedWorld = getSelectedWorld(state);
  const stages = getStagesForSelectedWorld(state);
  const selectedStage = stages.find(stage => stage.id === state.selectedStageId) ?? stages[0];
  const skillTree = getCurrentSkillTree(state);
  const shopOffers = getCurrentShopOffers(state);
  const inventoryCap = getCurrentInventoryCap(state);
  const syncPreview = buildSupabaseSyncPayload('local-preview', state);
  const equippedSkin = getEquippedSkin(state);
  const equippedSummonProgress = getEquippedSummonProgress(state);
  const previewMode =
    state.screen === 'raids'
      ? state.selectedRaidType === 'boss'
        ? 'boss_raid'
        : 'normal_raid'
      : state.screen === 'endless'
      ? 'endless'
      : 'level';
  const previewStats = getCurrentCharacterStats(
    state,
    previewMode,
  );
  const bossWindow = getBossRaidWindowInfo(Date.now());
  const activeRun = state.activeRun;
  const bossRaidStartDisabled =
    state.selectedRaidType === 'boss' &&
    (!bossWindow.isOpen || state.player.unlockedBossRaidStage < state.selectedRaidStage);

  const renderTopNav = () => (
    <View style={styles.navRow}>
      {(['home', 'characters', 'levels', 'endless', 'raids', 'shop'] as const).map(screen => (
        <Pressable
          key={screen}
          onPress={() => dispatch({type: 'select_screen', screen})}
          style={[styles.navButton, state.screen === screen && styles.navButtonActive]}>
          <Text style={styles.navButtonText}>{screen.toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.heroCard}>
      <Text style={styles.heroTitle}>BlockHero Prototype</Text>
      <Text style={styles.heroMeta}>Build 1.2.7-proto | Package com.blockhero.prototype</Text>
      <Text style={styles.heroSubtitle}>
        Hearts {state.player.hearts}/{previewStats.maxHearts} | Gold {state.player.gold} |
        Diamonds {state.player.diamonds}
      </Text>
      <Text style={styles.heroMeta}>
        {selectedDefinition.name} Lv.{selectedCharacter.level} | Attack {previewStats.attack} |
        HP {previewStats.maxHp}
      </Text>
      <Text style={styles.heroMeta}>
        Local save {saveStatus === 'loading' ? 'loading' : saveStatus === 'saved' ? 'ready' : 'failed'}
      </Text>
    </View>
  );

  const renderHome = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Overview</Text>
      <Text style={styles.paragraph}>
        Level mode now uses monster HP. Endless converts attack output into score and gold
        thresholds. Raid tabs expose local lobby chat, in-match voice toggle, item blocks, gem
        blocks, combo and fever rules.
      </Text>
      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>Unlocked stage {state.player.unlockedStageId}/300</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>Boss raid unlock {state.player.unlockedBossRaidStage}/10</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>Skins {state.player.unlockedSkinIds.length}</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Inventory</Text>
      <Text style={styles.paragraph}>
        Hammer {state.player.inventory.hammer} | Bomb {state.player.inventory.bomb} | Refresh{' '}
        {state.player.inventory.refresh}
      </Text>
      <Pressable
        onPress={async () => {
          await clearPersistedAppState();
          dispatch({type: 'hydrate_state', snapshot: createInitialState()});
          setSaveStatus('saved');
        }}
        style={styles.inlineButton}>
        <Text style={styles.inlineButtonText}>Reset Local Save</Text>
      </Pressable>
      <Text style={styles.sectionTitle}>Cloud Payload</Text>
      <Text style={styles.paragraph}>
        Profile 1 | Wallet 1 | Inventory {syncPreview.inventory.length} | Characters{' '}
        {syncPreview.characterProgress.length} | Skills {syncPreview.skillProgress.length} | Stages{' '}
        {syncPreview.stageProgress.length} | Summons {syncPreview.playerSummons.length}
      </Text>
      <Text style={styles.sectionTitle}>Skin Progress</Text>
      {Array.from({length: 10}, (_, index) => index + 1).map(stage => (
        <Text key={stage} style={styles.listText}>
          Raid {stage}: {getCurrentClearCount(state, stage)}/10 clears
        </Text>
      ))}
    </View>
  );

  const renderSkillList = (title: string, skillIds: typeof skillTree.personal) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {skillIds.map(skill => {
        const currentLevel = selectedCharacter.skills.find(entry => entry.skillId === skill.id)?.level ?? 0;
        const canUpgrade = canUnlockOrUpgradeSkill(skill.id, selectedCharacter.skills);

        return (
          <View key={skill.id} style={styles.skillCard}>
            <View style={styles.skillHeader}>
              <Text style={styles.skillName}>{skill.name}</Text>
              <Text style={styles.skillLevel}>Lv.{currentLevel}/5</Text>
            </View>
            <Text style={styles.skillDescription}>{skill.shortDescription}</Text>
            <Text style={styles.skillMeta}>
              {skill.prerequisiteSkillId ? 'Requires previous node at 5.' : 'Root node.'}
            </Text>
            <Pressable
              onPress={() => dispatch({type: 'upgrade_skill', skillId: skill.id})}
              style={[
                styles.inlineButton,
                (!canUpgrade || selectedCharacter.skillPoints <= 0 || currentLevel >= 5) &&
                  styles.inlineButtonDisabled,
              ]}>
              <Text style={styles.inlineButtonText}>Upgrade</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );

  const renderSkinCards = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Skins and Summons</Text>
      <Text style={styles.paragraph}>
        Equipped skin: {equippedSkin?.id ?? 'None'} | Summon level {equippedSummonProgress?.level ?? 1}
      </Text>
      {SKIN_DEFINITIONS.map(skin => {
        const unlocked = state.player.unlockedSkinIds.includes(skin.id);
        const summon = state.player.summonProgress[skin.summonId];

        return (
          <View key={skin.id} style={styles.skillCard}>
            <Text style={styles.skillName}>{skin.id}</Text>
            <Text style={styles.skillDescription}>
              Attack +{Math.round(skin.attackBonusRate * 100)}% | Summon {skin.summonId}
            </Text>
            <Text style={styles.skillMeta}>
              {unlocked
                ? `Unlocked | Summon Lv.${summon?.level ?? 1} | Remaining ${summon?.activeTimeLeftSec ?? 300}s`
                : 'Locked: clear the matching normal raid 10 times.'}
            </Text>
            <Pressable
              onPress={() =>
                dispatch({
                  type: 'equip_skin',
                  skinId: unlocked ? (state.player.equippedSkinId === skin.id ? null : skin.id) : null,
                })
              }
              style={[styles.inlineButton, !unlocked && styles.inlineButtonDisabled]}>
              <Text style={styles.inlineButtonText}>
                {state.player.equippedSkinId === skin.id ? 'Unequip' : 'Equip'}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );

  const renderCharacters = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Characters</Text>
      <View style={styles.navRow}>
        {(['knight', 'mage', 'archer', 'rogue', 'healer'] as const).map(classId => (
          <Pressable
            key={classId}
            onPress={() => dispatch({type: 'select_class', classId})}
            style={[
              styles.navButton,
              state.player.selectedClassId === classId && styles.navButtonActive,
            ]}>
            <Text style={styles.navButtonText}>{classId.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.paragraph}>
        {selectedDefinition.name} | Skill points {selectedCharacter.skillPoints} | Exp{' '}
        {selectedCharacter.exp}
      </Text>
      <Text style={styles.paragraph}>
        Hearts regen every {Math.floor(previewStats.heartRegenMs / 60000)}m | Fever every{' '}
        {previewStats.feverRequirement} lines
      </Text>
      {renderSkinCards()}
      {renderSkillList('Personal Passives', skillTree.personal)}
      {renderSkillList('Party and Raid Buffs', skillTree.party)}
    </View>
  );

  const renderLevels = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Level Mode</Text>
      <View style={styles.navRow}>
        {Array.from({length: 10}, (_, index) => index + 1).map(worldId => (
          <Pressable
            key={worldId}
            onPress={() => dispatch({type: 'select_world', worldId})}
            style={[
              styles.navButton,
              state.selectedWorldId === worldId && styles.navButtonActive,
            ]}>
            <Text style={styles.navButtonText}>W{worldId}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.paragraph}>
        {selectedWorld.name} | {selectedWorld.theme}
      </Text>
      {selectedStage ? (
        <Text style={styles.paragraph}>
          Selected: {selectedStage.name} | {selectedStage.monsterName} | HP {selectedStage.monsterHp}{' '}
          | Gold {selectedStage.rewardGold} | Exp {selectedStage.rewardCharacterExp}
        </Text>
      ) : null}
      <View style={styles.stageGrid}>
        {stages.map(stage => {
          const locked = stage.id > state.player.unlockedStageId;

          return (
            <Pressable
              key={stage.id}
              onPress={() => dispatch({type: 'select_stage', stageId: stage.id})}
              style={[
                styles.stageCard,
                state.selectedStageId === stage.id && styles.stageCardActive,
                locked && styles.stageCardLocked,
              ]}>
              <Text style={styles.stageCardTitle}>{stage.stageNumberInWorld}</Text>
              <Text style={styles.stageCardText}>{locked ? 'Locked' : stage.monsterName}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={() => dispatch({type: 'start_level_run', stageId: state.selectedStageId})}
        style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Start Selected Stage</Text>
      </Pressable>
    </View>
  );

  const renderEndless = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Endless Mode</Text>
      <Text style={styles.paragraph}>
        Attack output becomes score. Every threshold grants gold immediately. Obstacle durability
        rises with score and line clears chip them down without removing them instantly.
      </Text>
      <Pressable onPress={() => dispatch({type: 'start_endless_run'})} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Start Endless Run</Text>
      </Pressable>
    </View>
  );

  const renderRaids = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Raid Lobby</Text>
      <View style={styles.navRow}>
        {(['normal', 'boss'] as const).map(raidType => (
          <Pressable
            key={raidType}
            onPress={() => dispatch({type: 'select_raid_type', raidType})}
            style={[
              styles.navButton,
              state.selectedRaidType === raidType && styles.navButtonActive,
            ]}>
            <Text style={styles.navButtonText}>{raidType.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.paragraph}>
        Boss window: {bossWindow.isOpen ? 'OPEN' : 'CLOSED'} | next cycle in{' '}
        {formatCountdown(bossWindow.nextWindowStartsAtMs - Date.now())}
      </Text>
      <View style={styles.navRow}>
        {Array.from({length: 10}, (_, index) => index + 1).map(stage => (
          <Pressable
            key={stage}
            onPress={() => dispatch({type: 'select_raid_stage', stage})}
            style={[
              styles.navButton,
              state.selectedRaidStage === stage && styles.navButtonActive,
            ]}>
            <Text style={styles.navButtonText}>T{stage}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.paragraph}>
        Normal clears {getCurrentClearCount(state, state.selectedRaidStage)}/10 | Boss unlock{' '}
        {state.player.unlockedBossRaidStage >= state.selectedRaidStage ? 'Yes' : 'No'}
      </Text>
      <Text style={styles.paragraph}>
        {state.selectedRaidType === 'normal'
          ? `Normal raid rewards skin progress and repeat diamonds for tier ${state.selectedRaidStage}.`
          : `Boss raid tier ${state.selectedRaidStage} is ${
              state.player.unlockedBossRaidStage >= state.selectedRaidStage ? 'available' : 'locked'
            } in progression. Start button opens a local prototype instance.`}
      </Text>
      <View style={styles.chatCard}>
        {state.raidLobbyMessages.map(message => (
          <Text key={message.id} style={styles.chatLine}>
            {message.author}: {message.text}
          </Text>
        ))}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={lobbyDraft}
          onChangeText={setLobbyDraft}
          placeholder="Type lobby message"
          placeholderTextColor="#64748b"
        />
        <Pressable
          onPress={() => {
            dispatch({type: 'send_lobby_message', text: lobbyDraft});
            setLobbyDraft('');
          }}
          style={styles.inlineButton}>
          <Text style={styles.inlineButtonText}>Send</Text>
        </Pressable>
      </View>
      <Pressable
        onPress={() => {
          if (bossRaidStartDisabled) {
            return;
          }

          dispatch(
            state.selectedRaidType === 'normal'
              ? {type: 'start_normal_raid', stage: state.selectedRaidStage}
              : {type: 'start_boss_raid', stage: state.selectedRaidStage},
          );
        }}
        style={[styles.primaryButton, bossRaidStartDisabled && styles.inlineButtonDisabled]}>
        <Text style={styles.primaryButtonText}>
          Start {state.selectedRaidType === 'normal' ? 'Normal' : 'Boss'} Raid
          {state.selectedRaidType === 'boss' ? ' Practice' : ''}
        </Text>
      </Pressable>
    </View>
  );

  const renderShop = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Shop</Text>
      <Text style={styles.paragraph}>
        Base inventory cap is {inventoryCap} per item. Raid skins are not sold here and unlock
        after 10 normal raid clears for the matching boss tier.
      </Text>
      {shopOffers.map(offer => {
        const count = state.player.inventory[offer.itemId];
        const capped = count >= inventoryCap;

        return (
          <View key={offer.itemId} style={styles.skillCard}>
            <Text style={styles.skillName}>{offer.itemId.toUpperCase()}</Text>
            <Text style={styles.skillDescription}>
              Owned {count}/{inventoryCap}
            </Text>
            <Text style={styles.skillMeta}>
              Gold {offer.goldPrice} | Diamonds {offer.diamondPrice}
            </Text>
            <View style={styles.inputRow}>
              <Pressable
                onPress={() => dispatch({type: 'buy_shop_item', itemId: offer.itemId, currency: 'gold'})}
                style={[
                  styles.inlineButton,
                  (capped || state.player.gold < offer.goldPrice) && styles.inlineButtonDisabled,
                ]}>
                <Text style={styles.inlineButtonText}>Buy With Gold</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  dispatch({type: 'buy_shop_item', itemId: offer.itemId, currency: 'diamond'})
                }
                style={[
                  styles.inlineButton,
                  (capped || state.player.diamonds < offer.diamondPrice) &&
                    styles.inlineButtonDisabled,
                ]}>
                <Text style={styles.inlineButtonText}>Buy With Diamonds</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      <Text style={styles.paragraph}>
        Skin bonus attack and summon runtime are already active through the skin system. Diamond
        raid-skill upgrade UI is still pending.
      </Text>
    </View>
  );

  const renderRun = () => {
    if (!activeRun) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{activeRun.title}</Text>
        <Text style={styles.paragraph}>{activeRun.subtitle}</Text>
        <Text style={styles.paragraph}>
          HP {activeRun.playerHp}/{activeRun.playerMaxHp}
          {activeRun.enemyHp !== null
            ? ` | Enemy ${activeRun.enemyHp}/${activeRun.enemyMaxHp}`
            : ` | Score ${activeRun.score}`}
        </Text>
        <Text style={styles.paragraph}>
          Combo {activeRun.combo.comboCount} | Fever{' '}
          {activeRun.fever.active ? 'ACTIVE' : `${activeRun.fever.lineGauge}/${activeRun.fever.requirement}`}
          {activeRun.nextEndlessRewardScore !== null
            ? ` | Next gold ${activeRun.nextEndlessRewardGold} at ${activeRun.nextEndlessRewardScore}`
            : ''}
        </Text>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => dispatch({type: 'select_tool', tool: 'place'})}
            style={[styles.chip, activeRun.selectedTool === 'place' && styles.chipActive]}>
            <Text style={styles.chipText}>Place</Text>
          </Pressable>
          <Pressable
            onPress={() => dispatch({type: 'select_tool', tool: 'hammer'})}
            style={[styles.chip, activeRun.selectedTool === 'hammer' && styles.chipActive]}>
            <Text style={styles.chipText}>Hammer {state.player.inventory.hammer}</Text>
          </Pressable>
          <Pressable
            onPress={() => dispatch({type: 'select_tool', tool: 'bomb'})}
            style={[styles.chip, activeRun.selectedTool === 'bomb' && styles.chipActive]}>
            <Text style={styles.chipText}>Bomb {state.player.inventory.bomb}</Text>
          </Pressable>
          <Pressable onPress={() => dispatch({type: 'use_refresh'})} style={styles.chip}>
            <Text style={styles.chipText}>Refresh {state.player.inventory.refresh}</Text>
          </Pressable>
        </View>
        <View style={styles.board}>
          {activeRun.board.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.boardRow}>
              {row.map((cell, colIndex) => (
                <Pressable
                  key={`${rowIndex}-${colIndex}`}
                  onPress={() => dispatch({type: 'tap_board', row: rowIndex, col: colIndex})}
                  style={[
                    styles.boardCell,
                    {backgroundColor: cell?.color ?? '#0f172a'},
                    cell?.obstacleDurability ? styles.boardCellObstacle : null,
                  ]}>
                  <Text style={styles.boardCellText}>
                    {cell?.obstacleDurability
                      ? `X${cell.obstacleDurability}`
                      : cell?.specialKind === 'gem'
                      ? 'D'
                      : cell?.specialKind === 'item'
                      ? cell.specialItemId?.charAt(0).toUpperCase()
                      : ''}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pieceRow}>
          {activeRun.pieces.map(piece => (
            <Pressable
              key={piece.id}
              onPress={() => dispatch({type: 'select_piece', pieceId: piece.id})}
              style={[
                styles.pieceCard,
                activeRun.selectedPieceId === piece.id && styles.pieceCardSelected,
              ]}>
              {piece.shape.map((shapeRow, rowIndex) => (
                <View key={`${piece.id}-${rowIndex}`} style={styles.boardRow}>
                  {shapeRow.map((cell, cellIndex) => (
                    <View
                      key={`${piece.id}-${rowIndex}-${cellIndex}`}
                      style={getPieceCellStyle(cell === 1, piece.color)}
                    />
                  ))}
                </View>
              ))}
            </Pressable>
          ))}
        </ScrollView>
        {activeRun.previewCount > 0 && activeRun.upcomingPieces.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next Pieces</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pieceRow}>
              {activeRun.upcomingPieces.map(piece => (
                <View key={`preview-${piece.id}`} style={styles.pieceCard}>
                  {piece.shape.map((shapeRow, rowIndex) => (
                    <View key={`preview-${piece.id}-${rowIndex}`} style={styles.boardRow}>
                      {shapeRow.map((cell, cellIndex) => (
                        <View
                          key={`preview-${piece.id}-${rowIndex}-${cellIndex}`}
                          style={getPieceCellStyle(cell === 1, piece.color)}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
        {(activeRun.mode === 'normal_raid' || activeRun.mode === 'boss_raid') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Party</Text>
            {activeRun.partySummary.map(line => (
              <Text key={line} style={styles.listText}>
                {line}
              </Text>
            ))}
            <Pressable onPress={() => dispatch({type: 'toggle_voice'})} style={styles.inlineButton}>
              <Text style={styles.inlineButtonText}>
                Voice {activeRun.voiceEnabled ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
            <View style={styles.chatCard}>
              {activeRun.lobbyChat.map(message => (
                <Text key={message.id} style={styles.chatLine}>
                  {message.author}: {message.text}
                </Text>
              ))}
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={runDraft}
                onChangeText={setRunDraft}
                placeholder="Type raid message"
                placeholderTextColor="#64748b"
              />
              <Pressable
                onPress={() => {
                  dispatch({type: 'send_run_message', text: runDraft});
                  setRunDraft('');
                }}
                style={styles.inlineButton}>
                <Text style={styles.inlineButtonText}>Send</Text>
              </Pressable>
            </View>
          </View>
        )}
        {activeRun.mode === 'boss_raid' && activeRun.raidStandings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Boss Raid Rankings</Text>
            {(showFullBossStandings
              ? activeRun.raidStandings
              : activeRun.raidStandings.slice(0, 10)
            ).map((entry, index) => (
              <Text key={entry.id} style={styles.listText}>
                {index + 1}. {entry.name} - {entry.damage}
              </Text>
            ))}
            <Pressable
              onPress={() => setShowFullBossStandings(value => !value)}
              style={styles.inlineButton}>
              <Text style={styles.inlineButtonText}>
                {showFullBossStandings ? 'Show Top 10' : 'Show All 30'}
              </Text>
            </Pressable>
          </View>
        )}
        <View style={styles.logCard}>
          {activeRun.logs.map((log, index) => (
            <Text key={`${log}-${index}`} style={styles.logLine}>
              {log}
            </Text>
          ))}
        </View>
        {activeRun.ended && (
          <Pressable onPress={() => dispatch({type: 'claim_run'})} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              {activeRun.victory ? 'Claim Rewards' : 'Exit Run'}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {renderHeader()}
      {activeRun ? null : renderTopNav()}
      {activeRun
        ? renderRun()
        : state.screen === 'home'
        ? renderHome()
        : state.screen === 'characters'
        ? renderCharacters()
        : state.screen === 'levels'
        ? renderLevels()
        : state.screen === 'endless'
        ? renderEndless()
        : state.screen === 'shop'
        ? renderShop()
        : renderRaids()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#07111f'},
  content: {padding: 16, paddingBottom: 48, gap: 14},
  heroCard: {
    backgroundColor: '#122033',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e334d',
  },
  heroTitle: {color: '#f8fafc', fontSize: 24, fontWeight: '800'},
  heroSubtitle: {color: '#cbd5e1', marginTop: 8},
  heroMeta: {color: '#94a3b8', marginTop: 4},
  navRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12},
  navButton: {
    backgroundColor: '#16273c',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  navButtonActive: {backgroundColor: '#f97316'},
  navButtonText: {color: '#f8fafc', fontWeight: '700', fontSize: 12},
  section: {
    backgroundColor: '#0f1b2d',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1d2e45',
  },
  sectionTitle: {color: '#f8fafc', fontSize: 18, fontWeight: '800', marginBottom: 10},
  paragraph: {color: '#cbd5e1', lineHeight: 20, marginBottom: 10},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12},
  chip: {backgroundColor: '#17293f', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999},
  chipActive: {backgroundColor: '#ea580c'},
  chipText: {color: '#f8fafc', fontSize: 12, fontWeight: '700'},
  listText: {color: '#cbd5e1', marginBottom: 4},
  skillCard: {backgroundColor: '#132238', borderRadius: 14, padding: 12, marginBottom: 10},
  skillHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6},
  skillName: {color: '#f8fafc', fontWeight: '800'},
  skillLevel: {color: '#f97316', fontWeight: '800'},
  skillDescription: {color: '#cbd5e1', marginBottom: 4},
  skillMeta: {color: '#94a3b8', fontSize: 12, marginBottom: 8},
  inlineButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  inlineButtonDisabled: {backgroundColor: '#334155'},
  inlineButtonText: {color: '#eff6ff', fontWeight: '700'},
  stageGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12},
  stageCard: {
    width: '18%',
    minWidth: 56,
    backgroundColor: '#16273c',
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  stageCardActive: {backgroundColor: '#1d4ed8'},
  stageCardLocked: {opacity: 0.45},
  stageCardTitle: {color: '#f8fafc', fontWeight: '800'},
  stageCardText: {color: '#cbd5e1', fontSize: 11, textAlign: 'center'},
  primaryButton: {
    backgroundColor: '#f97316',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {color: '#fff7ed', fontWeight: '800'},
  chatCard: {backgroundColor: '#08111d', borderRadius: 14, padding: 12, marginBottom: 10},
  chatLine: {color: '#cbd5e1', marginBottom: 4},
  inputRow: {flexDirection: 'row', gap: 8, alignItems: 'center'},
  input: {
    flex: 1,
    backgroundColor: '#08111d',
    color: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  board: {alignSelf: 'center', backgroundColor: '#08111d', padding: 8, borderRadius: 18, marginBottom: 14},
  boardRow: {flexDirection: 'row'},
  boardCell: {
    width: 34,
    height: 34,
    margin: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardCellObstacle: {borderWidth: 2, borderColor: '#fbbf24'},
  boardCellText: {color: '#f8fafc', fontSize: 12, fontWeight: '800'},
  pieceRow: {marginBottom: 12},
  pieceCard: {
    backgroundColor: '#122033',
    padding: 10,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#233650',
  },
  pieceCardSelected: {borderColor: '#f97316', borderWidth: 2},
  pieceCell: {width: 14, height: 14, margin: 1, borderRadius: 3},
  pieceCellEmpty: {width: 14, height: 14, margin: 1, borderRadius: 3, backgroundColor: 'transparent'},
  pieceCellFilled: {width: 14, height: 14, margin: 1, borderRadius: 3},
  logCard: {backgroundColor: '#08111d', borderRadius: 14, padding: 12},
  logLine: {color: '#cbd5e1', marginBottom: 4},
});
