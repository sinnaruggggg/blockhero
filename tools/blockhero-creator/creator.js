import { createClient } from '@supabase/supabase-js';
import defaultCreatorManifest from './default-creator-manifest.json';

import {
  DEFAULT_REFERENCE_VIEWPORT,
  DEVICE_PROFILES,
  SCREEN_LABELS,
  ELEMENT_DEFS,
  ELEMENT_HELP,
  DEFAULT_RULE,
  clone as cloneVisualValue,
  ensureVisualManifest,
  createDefaultVisualManifest,
  sanitizeViewport,
  sanitizeRule,
  convertViewportDeltaToReference,
  getStudioSnapshot,
  getMeasuredBaseRect,
  applyRuleToRect,
  getPreviewLayout,
  getRule as getVisualRule,
  formatElementLabel as formatVisualElementLabel,
} from './visual-editor-core.js';

const DEFAULT_SUPABASE_URL = 'https://alhlmdhixmlmsdvgzhdu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaGxtZGhpeG1sbXNkdmd6aGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTY4NTQsImV4cCI6MjA4ODYzMjg1NH0.lkTNn1jeXzkQdCRnmtNAjejezJN_RfC1n5HEhCbV_n8';
const STORAGE_KEY = 'blockhero-creator-auth-v1';
const DEFAULT_DRAFT_ID = 1;
const PATTERN_OPTIONS = [
  'basic_auto',
  'burst_every_n',
  'phase_hp_threshold',
  'rage_after_time',
];

const HELP_TEXT = {
  level: {
    title: '레벨 스테이지',
    description:
      '레벨 모드의 목표, 적 연결, 골드/경험치 보상, 배경을 조정합니다.',
    tips: [
      '적 템플릿은 아래 화면에 나오는 적 원본 목록과 연결됩니다.',
      '첫 클리어 보상과 반복 보상을 분리해서 운영할 수 있습니다.',
      '배경 자산은 우측 자산 라이브러리에 올린 이미지를 그대로 연결하면 됩니다.',
    ],
  },
  raidNormal: {
    title: '일반 레이드',
    description:
      '상시 도전 가능한 일반 레이드의 이름, 보상, 시간 제한, 배경을 조정합니다.',
    tips: [
      '제한 시간은 실제 레이드 시작 후 종료 시점 계산에 사용됩니다.',
      '반복 보상은 첫 클리어 보상과 별도로 운영할 수 있습니다.',
      '스테이지별 오버라이드로 특정 단계만 체력, 공격력, 공격 간격을 따로 바꿀 수 있습니다.',
    ],
  },
  raidBoss: {
    title: '보스 레이드',
    description:
      '보스 레이드 단계별 보스 이름, 참가 인원, 입장 창, 시간 제한을 조정합니다.',
    tips: [
      '입장 가능 시간은 보스 레이드가 열린 뒤 참가할 수 있는 시간입니다.',
      '최대 참가 인원은 실제 보스 레이드 인원 제한에 연결됩니다.',
      '개방 시간은 화면 안내와 운영 기준에 함께 사용됩니다.',
    ],
  },
  encounter: {
    title: '적 템플릿',
    description: '레벨과 레이드가 공통으로 참조하는 적 원본 데이터입니다.',
    tips: [
      '스테이지별 override보다 먼저 적용되는 기본값입니다.',
      '공격 패턴은 현재 준비된 패턴만 선택할 수 있습니다.',
      'id를 덮어쓰기보다 새 템플릿을 만들고 연결만 바꾸는 편이 안전합니다.',
    ],
  },
};

const ATTACK_PATTERN_LABELS = {
  basic_auto: '기본 자동',
  burst_every_n: '주기 폭발',
  phase_hp_threshold: '체력 구간 전환',
  rage_after_time: '시간 경과 분노',
};

const ENCOUNTER_TIER_LABELS = {
  normal: '일반',
  elite: '정예',
  boss: '보스',
};

const ENCOUNTER_KIND_LABELS = {
  level: '레벨',
  raid: '레이드',
};

const $ = selector => document.querySelector(selector);

const elements = {
  activeViewStatus: $('#activeViewStatus'),
  loginCard: $('#loginCard'),
  workspace: $('#workspace'),
  supabaseUrl: $('#supabaseUrl'),
  supabaseAnonKey: $('#supabaseAnonKey'),
  adminEmail: $('#adminEmail'),
  adminPassword: $('#adminPassword'),
  loginButton: $('#loginButton'),
  restoreButton: $('#restoreButton'),
  logoutButton: $('#logoutButton'),
  refreshButton: $('#refreshButton'),
  saveDraftButton: $('#saveDraftButton'),
  publishButton: $('#publishButton'),
  publishNotes: $('#publishNotes'),
  connectionStatus: $('#connectionStatus'),
  deviceConnectionStatus: $('#deviceConnectionStatus'),
  manifestStatus: $('#manifestStatus'),
  globalStatusLine: $('#globalStatusLine'),
  uiEditorStatusLine: $('#uiEditorStatusLine'),
  viewUiButton: $('#viewUiButton'),
  viewAdminButton: $('#viewAdminButton'),
  viewHistoryButton: $('#viewHistoryButton'),
  viewSettingsButton: $('#viewSettingsButton'),
  uiEditorView: $('#uiEditorView'),
  adminDataView: $('#adminDataView'),
  historyView: $('#historyView'),
  settingsView: $('#settingsView'),
  userEmail: $('#userEmail'),
  visualDraftVersion: $('#visualDraftVersion'),
  visualPublishedVersion: $('#visualPublishedVersion'),
  draftVersion: $('#draftVersion'),
  publishedVersion: $('#publishedVersion'),
  assetCount: $('#assetCount'),
  settingsSupabaseUrl: $('#settingsSupabaseUrl'),
  settingsAdminEmail: $('#settingsAdminEmail'),
  settingsDeviceList: $('#settingsDeviceList'),
  settingsDeviceMeta: $('#settingsDeviceMeta'),
  settingsRefreshDevicesButton: $('#settingsRefreshDevicesButton'),
  settingsRefreshFrameButton: $('#settingsRefreshFrameButton'),
  visualScreenId: $('#visualScreenId'),
  visualDeviceSource: $('#visualDeviceSource'),
  visualDeviceSelect: $('#visualDeviceSelect'),
  visualDeviceProfile: $('#visualDeviceProfile'),
  visualViewportWidth: $('#visualViewportWidth'),
  visualViewportHeight: $('#visualViewportHeight'),
  visualSafeTop: $('#visualSafeTop'),
  visualSafeBottom: $('#visualSafeBottom'),
  visualRefreshDeviceButton: $('#visualRefreshDeviceButton'),
  visualRefreshFrameButton: $('#visualRefreshFrameButton'),
  visualDeviceMeta: $('#visualDeviceMeta'),
  visualShowGrid: $('#visualShowGrid'),
  visualSnapGrid: $('#visualSnapGrid'),
  visualGridSize: $('#visualGridSize'),
  visualElementList: $('#visualElementList'),
  visualCurrentScreen: $('#visualCurrentScreen'),
  visualCurrentElement: $('#visualCurrentElement'),
  visualCurrentViewport: $('#visualCurrentViewport'),
  visualFitButton: $('#visualFitButton'),
  visualActualButton: $('#visualActualButton'),
  visualStageHost: $('#visualStageHost'),
  visualPhoneFrame: $('#visualPhoneFrame'),
  visualLiveImage: $('#visualLiveImage'),
  visualFrameFallback: $('#visualFrameFallback'),
  visualSafeTopOverlay: $('#visualSafeTopOverlay'),
  visualSafeBottomOverlay: $('#visualSafeBottomOverlay'),
  visualGridOverlay: $('#visualGridOverlay'),
  visualOverlay: $('#visualOverlay'),
  visualStageStatus: $('#visualStageStatus'),
  visualInspectorTitle: $('#visualInspectorTitle'),
  visualInspectorHelp: $('#visualInspectorHelp'),
  visualOffsetX: $('#visualOffsetX'),
  visualOffsetY: $('#visualOffsetY'),
  visualScale: $('#visualScale'),
  visualWidthScale: $('#visualWidthScale'),
  visualHeightScale: $('#visualHeightScale'),
  visualOpacity: $('#visualOpacity'),
  visualZIndex: $('#visualZIndex'),
  visualVisible: $('#visualVisible'),
  visualSafeAware: $('#visualSafeAware'),
  visualNudgeUp: $('#visualNudgeUp'),
  visualNudgeDown: $('#visualNudgeDown'),
  visualNudgeLeft: $('#visualNudgeLeft'),
  visualNudgeRight: $('#visualNudgeRight'),
  visualNudgeUpLarge: $('#visualNudgeUpLarge'),
  visualNudgeDownLarge: $('#visualNudgeDownLarge'),
  visualNudgeLeftLarge: $('#visualNudgeLeftLarge'),
  visualNudgeRightLarge: $('#visualNudgeRightLarge'),
  visualUndoButton: $('#visualUndoButton'),
  visualRedoButton: $('#visualRedoButton'),
  visualResetButton: $('#visualResetButton'),
  visualPublishNotes: $('#visualPublishNotes'),
  visualSaveDraftButton: $('#visualSaveDraftButton'),
  visualPublishButton: $('#visualPublishButton'),
  visualReleaseHistory: $('#visualReleaseHistory'),
  visualHistoryViewList: $('#visualHistoryViewList'),
  adminHistoryViewList: $('#adminHistoryViewList'),
  contentTree: $('#contentTree'),
  editorTitle: $('#editorTitle'),
  editorSubtitle: $('#editorSubtitle'),
  selectionSummary: $('#selectionSummary'),
  editorForm: $('#editorForm'),
  manifestJson: $('#manifestJson'),
  copyJsonButton: $('#copyJsonButton'),
  applyJsonButton: $('#applyJsonButton'),
  helpPanel: $('#helpPanel'),
  assetLibrary: $('#assetLibrary'),
  assetKeyInput: $('#assetKeyInput'),
  assetFileInput: $('#assetFileInput'),
  uploadAssetButton: $('#uploadAssetButton'),
  releaseHistory: $('#releaseHistory'),
  addLevelButton: $('#addLevelButton'),
  addNormalRaidButton: $('#addNormalRaidButton'),
  addBossRaidButton: $('#addBossRaidButton'),
  addEncounterButton: $('#addEncounterButton'),
  cloneButton: $('#cloneButton'),
  deleteButton: $('#deleteButton'),
};

const state = {
  activeView: 'ui',
  supabase: null,
  supabaseUrl: '',
  supabaseKey: '',
  session: null,
  profile: null,
  visualManifest: null,
  visualPublishedVersion: null,
  visualReleaseHistory: [],
  visualSelectedScreenId: 'level',
  visualSelectedElementId: 'header',
  visualDeviceSource: 'phone',
  visualDeviceProfileId: 'galaxy-s23-ultra',
  visualCustomViewport: cloneVisualValue(DEFAULT_REFERENCE_VIEWPORT),
  visualConnectedDevices: [],
  visualActiveDeviceSerial: '',
  visualDeviceViewport: null,
  visualFrameDataUrl: '',
  visualFrameBusy: false,
  visualFrameTimer: null,
  visualZoomMode: 'fit',
  visualZoomValue: 1,
  visualFitScale: 1,
  visualDisplayScale: 1,
  visualShowGrid: false,
  visualSnapGrid: false,
  visualGridSize: 16,
  visualDirty: false,
  visualHistoryPast: [],
  visualHistoryFuture: [],
  visualDrag: null,
  visualWorkspaceLoaded: false,
  adminWorkspaceLoaded: false,
  manifest: null,
  publishedVersion: null,
  releaseHistory: [],
  assets: [],
  selected: null,
};

const localDesktopConfig =
  typeof window !== 'undefined'
    ? window.__BLOCKHERO_CREATOR_LOCAL_CONFIG__ ?? null
    : null;
const desktopBridge =
  typeof window !== 'undefined'
    ? window.__BLOCKHERO_CREATOR_DESKTOP__ ?? null
    : null;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function showToast(message) {
  window.alert(message);
}

function getErrorMessage(
  error,
  fallback = '요청 처리 중 오류가 발생했습니다.',
) {
  const rawMessage =
    typeof error === 'string'
      ? error
      : error && typeof error.message === 'string'
      ? error.message
      : '';

  if (!rawMessage) {
    return fallback;
  }

  const message = rawMessage.trim();

  const tableMatch = message.match(
    /Could not find the table 'public\.([a-zA-Z0-9_]+)' in the schema cache/i,
  );
  if (tableMatch) {
    return `DB 테이블 public.${tableMatch[1]}를 찾을 수 없습니다. Supabase SQL 설정을 먼저 적용하세요.`;
  }

  if (/Invalid login credentials/i.test(message)) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }

  if (/Invalid API key/i.test(message)) {
    return 'Supabase 익명 키가 올바르지 않습니다. 설정 파일의 키를 확인하세요.';
  }

  if (/Failed to fetch/i.test(message) || /NetworkError/i.test(message)) {
    return '네트워크 연결에 실패했습니다. 인터넷 연결과 Supabase URL을 확인하세요.';
  }

  if (/new row violates row-level security policy/i.test(message)) {
    return '권한이 없어 요청을 처리할 수 없습니다. 관리자 권한 계정인지 확인하세요.';
  }

  if (/permission denied/i.test(message)) {
    return '권한이 없어 요청을 처리할 수 없습니다.';
  }

  if (/relation .* does not exist/i.test(message)) {
    return '필요한 DB 테이블이 아직 생성되지 않았습니다. SQL 설정을 먼저 실행하세요.';
  }

  if (/duplicate key value violates unique constraint/i.test(message)) {
    return '중복된 값이 있어 저장할 수 없습니다.';
  }

  if (/[가-힣]/.test(message)) {
    return message;
  }

  return fallback;
}

function setStatus(target, message) {
  target.textContent = message;
}

function setInlineStatus(target, message, tone = 'muted') {
  if (!target) {
    return;
  }
  target.textContent = message;
  target.className = `inline-note${tone === 'muted' ? '' : ` ${tone}`}`;
}

function canLaunchLiveTool() {
  return (
    !!desktopBridge && typeof desktopBridge.launchUiStudioLive === 'function'
  );
}

function canUseDeviceBridge() {
  return (
    !!desktopBridge &&
    typeof desktopBridge.listDevices === 'function' &&
    typeof desktopBridge.getDeviceViewport === 'function' &&
    typeof desktopBridge.getDeviceFrame === 'function'
  );
}

function canUseDeviceLayoutBridge() {
  return !!desktopBridge && typeof desktopBridge.getDeviceLayout === 'function';
}

function setGlobalStatus(message, tone = 'muted') {
  setInlineStatus(elements.globalStatusLine, message, tone);
}

function isAdminAuthenticated() {
  return Boolean(state.session?.user && state.profile?.is_admin);
}

function requireAdminAccess(featureLabel = '이 기능') {
  if (isAdminAuthenticated()) {
    return true;
  }
  showToast(`${featureLabel}은 관리자 로그인 후 사용할 수 있습니다.`);
  return false;
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getManifestVersion(manifest) {
  return Number(manifest?.version || 0);
}

function getSelectedRecord() {
  if (!state.manifest || !state.selected) {
    return null;
  }
  if (state.selected.kind === 'level') {
    return state.manifest.levels[state.selected.id] ?? null;
  }
  if (state.selected.kind === 'raidNormal') {
    return state.manifest.raids.normal[state.selected.id] ?? null;
  }
  if (state.selected.kind === 'raidBoss') {
    return state.manifest.raids.boss[state.selected.id] ?? null;
  }
  if (state.selected.kind === 'encounter') {
    return state.manifest.encounters[state.selected.id] ?? null;
  }
  return null;
}

function formatEncounterReference(encounterId) {
  const encounter = state.manifest?.encounters?.[encounterId];
  if (!encounter) {
    return encounterId || '-';
  }
  return `${encounter.displayName} (${encounter.id})`;
}

function writePath(target, path, value) {
  const segments = path.split('.');
  let cursor = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (
      !Object.prototype.hasOwnProperty.call(cursor, segment) ||
      cursor[segment] == null
    ) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }
  cursor[segments[segments.length - 1]] = value;
}

function getAssetOptions(selectedKey = '') {
  const items = ['<option value="">없음</option>'];
  state.assets
    .slice()
    .sort((a, b) => a.asset_key.localeCompare(b.asset_key))
    .forEach(asset => {
      items.push(
        `<option value="${asset.asset_key}" ${
          selectedKey === asset.asset_key ? 'selected' : ''
        }>${asset.asset_key}</option>`,
      );
    });
  return items.join('');
}

function renderPatternOptions(selectedValue = '', allowDefault = false) {
  const options = [];
  if (allowDefault) {
    options.push(
      `<option value="" ${
        selectedValue === '' ? 'selected' : ''
      }>기본값 사용</option>`,
    );
  }
  PATTERN_OPTIONS.forEach(option => {
    const label = ATTACK_PATTERN_LABELS[option] || '기본 패턴';
    options.push(
      `<option value="${option}" ${
        selectedValue === option ? 'selected' : ''
      }>${label}</option>`,
    );
  });
  return options.join('');
}

function renderTierOptions(selectedValue = 'normal') {
  return Object.entries(ENCOUNTER_TIER_LABELS)
    .map(
      ([value, label]) =>
        `<option value="${value}" ${
          selectedValue === value ? 'selected' : ''
        }>${label}</option>`,
    )
    .join('');
}

function renderEncounterKindOptions(selectedValue = 'level') {
  return Object.entries(ENCOUNTER_KIND_LABELS)
    .map(
      ([value, label]) =>
        `<option value="${value}" ${
          selectedValue === value ? 'selected' : ''
        }>${label}</option>`,
    )
    .join('');
}

function renderHelpPanel() {
  const help = state.selected ? HELP_TEXT[state.selected.kind] ?? null : null;
  if (!help) {
    elements.helpPanel.innerHTML = `<div class="help-card"><strong>메뉴 설명 대기 중</strong><p>왼쪽 트리에서 항목을 선택하면 해당 메뉴의 역할과 수정 팁이 여기에 표시됩니다.</p></div>`;
    return;
  }
  elements.helpPanel.innerHTML = `<div class="help-card"><strong>${
    help.title
  }</strong><p>${help.description}</p><ul>${help.tips
    .map(item => `<li>${item}</li>`)
    .join('')}</ul></div>`;
}

function renderSummary(record) {
  if (!record || !state.selected) {
    elements.selectionSummary.innerHTML = `<div class="summary-card"><span>선택 없음</span><strong>편집 대상 미선택</strong></div>`;
    return;
  }
  if (state.selected.kind === 'level') {
    elements.selectionSummary.innerHTML = `
      <div class="summary-card"><span>레벨 ID</span><strong>${
        record.levelId
      }</strong></div>
      <div class="summary-card"><span>월드 / 스테이지</span><strong>${
        record.worldId
      }-${record.stageNumberInWorld}</strong></div>
      <div class="summary-card"><span>적 템플릿</span><strong>${formatEncounterReference(
        record.enemyTemplateId,
      )}</strong></div>
      <div class="summary-card"><span>사용 상태</span><strong>${
        record.enabled ? '활성' : '비활성'
      }</strong></div>`;
    return;
  }
  if (
    state.selected.kind === 'raidNormal' ||
    state.selected.kind === 'raidBoss'
  ) {
    elements.selectionSummary.innerHTML = `
      <div class="summary-card"><span>레이드 종류</span><strong>${
        state.selected.kind === 'raidNormal' ? '일반' : '보스'
      }</strong></div>
      <div class="summary-card"><span>단계</span><strong>${
        record.stage
      }</strong></div>
      <div class="summary-card"><span>템플릿</span><strong>${formatEncounterReference(
        record.encounterTemplateId,
      )}</strong></div>
      <div class="summary-card"><span>시간 제한</span><strong>${Math.round(
        record.timeLimitMs / 1000,
      )}초</strong></div>`;
    return;
  }
  elements.selectionSummary.innerHTML = `
    <div class="summary-card"><span>템플릿 ID</span><strong>${
      record.id
    }</strong></div>
    <div class="summary-card"><span>종류</span><strong>${
      record.kind === 'level' ? '레벨 적' : '레이드 적'
    }</strong></div>
    <div class="summary-card"><span>공격 주기</span><strong>${
      record.attackIntervalMs
    }밀리초</strong></div>
    <div class="summary-card"><span>사용 상태</span><strong>${
      record.enabled ? '활성' : '비활성'
    }</strong></div>`;
}

function backgroundFields(path, value = {}) {
  return `
    <div class="section-card">
      <div><h3>배경</h3><p>업로드한 배경 자산을 연결하고, 색상 덮개와 이미지 제거 여부를 조정합니다.</p></div>
      <div class="field-grid">
        <label><span>배경 자산</span><select data-path="${path}.background.assetKey">${getAssetOptions(
    value.assetKey ?? '',
  )}</select></label>
        <label><span>덮개 색상</span><input data-path="${path}.background.tintColor" type="text" value="${
    value.tintColor ?? '#000000'
  }" /></label>
        <label><span>덮개 투명도</span><input data-path="${path}.background.tintOpacity" type="number" step="0.05" min="0" max="1" value="${
    value.tintOpacity ?? 0
  }" /></label>
        <label><span>이미지 제거</span><select data-path="${path}.background.removeImage"><option value="false" ${
    value.removeImage ? '' : 'selected'
  }>아니오</option><option value="true" ${
    value.removeImage ? 'selected' : ''
  }>예</option></select></label>
      </div>
    </div>`;
}

function overrideFields(path, value = {}) {
  return `
    <div class="section-card">
      <div><h3>스테이지별 오버라이드</h3><p>템플릿을 건드리지 않고 이 스테이지에서만 다르게 적용할 값을 넣습니다. 빈 값은 기본 템플릿을 그대로 사용합니다.</p></div>
      <div class="field-grid three">
        <label><span>표시 이름</span><input data-path="${path}.encounterOverrides.displayName" type="text" value="${
    value.displayName ?? ''
  }" /></label>
        <label><span>몬스터 이름</span><input data-path="${path}.encounterOverrides.monsterName" type="text" value="${
    value.monsterName ?? ''
  }" /></label>
        <label><span>이모지</span><input data-path="${path}.encounterOverrides.monsterEmoji" type="text" value="${
    value.monsterEmoji ?? ''
  }" /></label>
        <label><span>색상</span><input data-path="${path}.encounterOverrides.monsterColor" type="text" value="${
    value.monsterColor ?? ''
  }" /></label>
        <label><span>HP</span><input data-path="${path}.encounterOverrides.baseHp" type="number" value="${
    value.baseHp ?? ''
  }" /></label>
        <label><span>공격력</span><input data-path="${path}.encounterOverrides.baseAttack" type="number" value="${
    value.baseAttack ?? ''
  }" /></label>
        <label><span>공격 주기(ms)</span><input data-path="${path}.encounterOverrides.attackIntervalMs" type="number" value="${
    value.attackIntervalMs ?? ''
  }" /></label>
        <label><span>공격 패턴</span><select data-path="${path}.encounterOverrides.attackPattern">${renderPatternOptions(
    value.attackPattern ?? '',
    true,
  )}</select></label>
      </div>
    </div>`;
}

function renderLevelEditor(level) {
  const path = `levels.${level.id}`;
  return `
    <div class="section-card">
      <div><h3>기본 정보</h3><p>레벨 이름, 월드, 스테이지 번호, 목표 수치, 연결된 적 템플릿을 조정합니다.</p></div>
      <div class="field-grid three">
        <label><span>내부 ID</span><input type="text" value="${
          level.id
        }" disabled /></label>
        <label><span>레벨 번호</span><input data-path="${path}.levelId" type="number" value="${
    level.levelId
  }" /></label>
        <label><span>이름</span><input data-path="${path}.name" type="text" value="${
    level.name
  }" /></label>
        <label><span>월드 번호</span><input data-path="${path}.worldId" type="number" value="${
    level.worldId
  }" /></label>
        <label><span>월드 내 번호</span><input data-path="${path}.stageNumberInWorld" type="number" value="${
    level.stageNumberInWorld
  }" /></label>
        <label><span>목표 수치</span><input data-path="${path}.goalValue" type="number" value="${
    level.goalValue
  }" /></label>
        <label><span>적 템플릿</span><select data-path="${path}.enemyTemplateId">${Object.values(
    state.manifest.encounters,
  )
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      encounter =>
        `<option value="${encounter.id}" ${
          encounter.id === level.enemyTemplateId ? 'selected' : ''
        }>${encounter.displayName} (${encounter.id})</option>`,
    )
    .join('')}</select></label>
        <label><span>보스 레이드 해금 단계</span><input data-path="${path}.unlocksBossRaidStage" type="number" value="${
    level.unlocksBossRaidStage ?? ''
  }" /></label>
        <label><span>활성화</span><select data-path="${path}.enabled"><option value="true" ${
    level.enabled ? 'selected' : ''
  }>활성</option><option value="false" ${
    level.enabled ? '' : 'selected'
  }>비활성</option></select></label>
      </div>
    </div>
    <div class="section-card"><div><h3>보상</h3><p>첫 클리어 보너스와 반복 보상을 나눠서 조정합니다.</p></div><div class="field-grid three"><label><span>반복 골드</span><input data-path="${path}.reward.repeatGold" type="number" value="${
    level.reward.repeatGold
  }" /></label><label><span>첫 클리어 보너스 골드</span><input data-path="${path}.reward.firstClearBonusGold" type="number" value="${
    level.reward.firstClearBonusGold
  }" /></label><label><span>캐릭터 경험치</span><input data-path="${path}.reward.characterExp" type="number" value="${
    level.reward.characterExp
  }" /></label></div></div>
    ${overrideFields(path, level.enemyOverrides)}
    ${backgroundFields(path, level.background)}
    <div class="section-card"><div><h3>운영 메모</h3><p>이 레벨에 대한 내부 메모를 남깁니다.</p></div><label><span>메모</span><textarea data-path="${path}.notes" rows="4">${
    level.notes ?? ''
  }</textarea></label></div>`;
}

function renderRaidEditor(raid, scope) {
  const path = `raids.${scope}.${raid.id}`;
  return `
    <div class="section-card">
      <div><h3>기본 정보</h3><p>레이드 이름, 단계, 연결 템플릿, 시간 제한과 참가 규칙을 조정합니다.</p></div>
      <div class="field-grid three">
        <label><span>내부 ID</span><input type="text" value="${
          raid.id
        }" disabled /></label>
        <label><span>이름</span><input data-path="${path}.name" type="text" value="${
    raid.name
  }" /></label>
        <label><span>단계</span><input data-path="${path}.stage" type="number" value="${
    raid.stage
  }" /></label>
        <label><span>월드 번호</span><input data-path="${path}.worldId" type="number" value="${
    raid.worldId ?? ''
  }" /></label>
        <label><span>제한 시간(밀리초)</span><input data-path="${path}.timeLimitMs" type="number" value="${
    raid.timeLimitMs
  }" /></label>
        <label><span>개방 시간(시간)</span><input data-path="${path}.raidWindowHours" type="number" value="${
    raid.raidWindowHours
  }" /></label>
        <label><span>입장 가능 시간(분)</span><input data-path="${path}.joinWindowMinutes" type="number" value="${
    raid.joinWindowMinutes
  }" /></label>
        <label><span>최대 참가 인원</span><input data-path="${path}.maxParticipants" type="number" value="${
    raid.maxParticipants
  }" /></label>
        <label><span>적 템플릿</span><select data-path="${path}.encounterTemplateId">${Object.values(
    state.manifest.encounters,
  )
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      encounter =>
        `<option value="${encounter.id}" ${
          encounter.id === raid.encounterTemplateId ? 'selected' : ''
        }>${encounter.displayName} (${encounter.id})</option>`,
    )
    .join('')}</select></label>
        <label><span>활성화</span><select data-path="${path}.enabled"><option value="true" ${
    raid.enabled ? 'selected' : ''
  }>활성</option><option value="false" ${
    raid.enabled ? '' : 'selected'
  }>비활성</option></select></label>
      </div>
    </div>
    <div class="section-card"><div><h3>보상</h3><p>첫 클리어와 반복 보상을 분리해 조정합니다.</p></div><div class="field-grid"><label><span>첫 클리어 다이아</span><input data-path="${path}.reward.firstClearDiamondReward" type="number" value="${
    raid.reward.firstClearDiamondReward
  }" /></label><label><span>반복 다이아</span><input data-path="${path}.reward.repeatDiamondReward" type="number" value="${
    raid.reward.repeatDiamondReward
  }" /></label></div></div>
    ${overrideFields(path, raid.encounterOverrides)}
    ${backgroundFields(path, raid.background)}
    <div class="section-card"><div><h3>운영 메모</h3><p>레이드 기획 메모를 정리합니다.</p></div><label><span>메모</span><textarea data-path="${path}.notes" rows="4">${
    raid.notes ?? ''
  }</textarea></label></div>`;
}

function renderEncounterEditor(encounter) {
  const path = `encounters.${encounter.id}`;
  return `
    <div class="section-card">
      <div><h3>템플릿 정보</h3><p>레벨과 레이드가 공통으로 참조하는 적 기본 템플릿입니다.</p></div>
      <div class="field-grid three">
        <label><span>내부 ID</span><input type="text" value="${
          encounter.id
        }" disabled /></label>
        <label><span>표시 이름</span><input data-path="${path}.displayName" type="text" value="${
    encounter.displayName
  }" /></label>
        <label><span>몬스터 이름</span><input data-path="${path}.monsterName" type="text" value="${
    encounter.monsterName
  }" /></label>
        <label><span>이모지</span><input data-path="${path}.monsterEmoji" type="text" value="${
    encounter.monsterEmoji
  }" /></label>
        <label><span>색상</span><input data-path="${path}.monsterColor" type="text" value="${
    encounter.monsterColor
  }" /></label>
        <label><span>등급</span><select data-path="${path}.tier">${renderTierOptions(
    encounter.tier,
  )}</select></label>
        <label><span>기본 체력</span><input data-path="${path}.baseHp" type="number" value="${
    encounter.baseHp
  }" /></label>
        <label><span>기본 공격력</span><input data-path="${path}.baseAttack" type="number" value="${
    encounter.baseAttack
  }" /></label>
        <label><span>공격 주기(밀리초)</span><input data-path="${path}.attackIntervalMs" type="number" value="${
    encounter.attackIntervalMs
  }" /></label>
        <label><span>공격 패턴</span><select data-path="${path}.attackPattern">${renderPatternOptions(
    encounter.attackPattern,
  )}</select></label>
        <label><span>사용 범위</span><select data-path="${path}.kind">${renderEncounterKindOptions(
    encounter.kind,
  )}</select></label>
        <label><span>활성화</span><select data-path="${path}.enabled"><option value="true" ${
    encounter.enabled ? 'selected' : ''
  }>활성</option><option value="false" ${
    encounter.enabled ? '' : 'selected'
  }>비활성</option></select></label>
      </div>
    </div>
    <div class="section-card"><div><h3>운영 메모</h3><p>적 밸런스나 기획 의도를 내부 메모로 남깁니다.</p></div><label><span>메모</span><textarea data-path="${path}.notes" rows="4">${
    encounter.notes ?? ''
  }</textarea></label></div>`;
}
function renderTree() {
  if (!state.manifest) {
    elements.contentTree.innerHTML = '';
    return;
  }
  const buildGroup = (title, items, kind) => `
    <section class="tree-group">
      <button type="button">${title}</button>
      <div class="tree-items">
        ${items
          .map(item => {
            const active =
              state.selected?.kind === kind && state.selected?.id === item.id
                ? 'active'
                : '';
            const label =
              kind === 'level'
                ? `${item.levelId}. ${item.name}`
                : kind === 'encounter'
                ? `${item.displayName} (${item.id})`
                : `${item.stage}단계 ${item.name}`;
            return `<button class="tree-item ${active}" data-kind="${kind}" data-id="${item.id}">${label}</button>`;
          })
          .join('')}
      </div>
    </section>`;

  elements.contentTree.innerHTML = [
    buildGroup(
      '레벨 스테이지',
      Object.values(state.manifest.levels).sort(
        (a, b) => a.levelId - b.levelId,
      ),
      'level',
    ),
    buildGroup(
      '일반 레이드',
      Object.values(state.manifest.raids.normal).sort(
        (a, b) => a.stage - b.stage,
      ),
      'raidNormal',
    ),
    buildGroup(
      '보스 레이드',
      Object.values(state.manifest.raids.boss).sort(
        (a, b) => a.stage - b.stage,
      ),
      'raidBoss',
    ),
    buildGroup(
      '적 템플릿',
      Object.values(state.manifest.encounters).sort((a, b) =>
        a.id.localeCompare(b.id),
      ),
      'encounter',
    ),
  ].join('');
}

function renderAssets() {
  elements.assetCount.textContent = String(state.assets.length);
  if (!state.assets.length) {
    elements.assetLibrary.innerHTML = `<div class="asset-card"><strong>등록된 자산이 없습니다.</strong><p>배경 이미지를 올리면 여기서 자산 키를 확인하고 레벨이나 레이드 배경에 연결할 수 있습니다.</p></div>`;
    return;
  }
  elements.assetLibrary.innerHTML = state.assets
    .slice()
    .sort((a, b) => a.asset_key.localeCompare(b.asset_key))
    .map(
      asset => `
    <div class="asset-card">
      <strong class="mono">${asset.asset_key}</strong>
      <img class="asset-preview" src="${asset.data_url}" alt="${
        asset.asset_key
      }" />
      <div class="asset-meta"><span>${
        asset.mime_type || '이미지'
      }</span><span>${asset.content_hash || '-'}</span></div>
    </div>`,
    )
    .join('');
}

function renderReleaseHistory() {
  if (!state.releaseHistory.length) {
    elements.releaseHistory.innerHTML = `<div class="release-card"><strong>배포 이력이 없습니다.</strong><p>아직 관리자 데이터 배포를 한 적이 없습니다.</p></div>`;
    return;
  }
  elements.releaseHistory.innerHTML = state.releaseHistory
    .map(
      release => `
    <div class="release-card">
      <strong>v${release.version}</strong>
      <p>${release.notes || '메모 없음'}</p>
      <div class="release-meta"><span>${new Date(
        release.created_at,
      ).toLocaleString(
        'ko-KR',
      )}</span><button class="ghost small rollback-button" data-version="${
        release.version
      }">이 버전으로 롤백</button></div>
    </div>`,
    )
    .join('');
}

function updateManifestTextarea() {
  elements.manifestJson.value = state.manifest
    ? JSON.stringify(state.manifest, null, 2)
    : '';
}

function renderEditor() {
  const record = getSelectedRecord();
  renderSummary(record);
  renderHelpPanel();
  if (!record || !state.selected) {
    elements.editorTitle.textContent = '항목을 선택하세요';
    elements.editorSubtitle.textContent =
      '왼쪽 트리에서 레벨, 레이드, 적 템플릿 중 하나를 선택하면 상세 편집기가 열립니다.';
    elements.editorForm.className = 'editor-form empty-state';
    elements.editorForm.innerHTML =
      '<p>왼쪽에서 항목을 선택하면 여기에서 현재 값을 수정할 수 있습니다.</p>';
    return;
  }

  elements.editorForm.className = 'editor-form';
  if (state.selected.kind === 'level') {
    elements.editorTitle.textContent = `레벨 ${record.levelId} 편집`;
    elements.editorSubtitle.textContent =
      '레벨 모드에 실제로 반영될 목표, 보상, 적 연결, 배경을 조정합니다.';
    elements.editorForm.innerHTML = renderLevelEditor(record);
  } else if (
    state.selected.kind === 'raidNormal' ||
    state.selected.kind === 'raidBoss'
  ) {
    elements.editorTitle.textContent = `${
      state.selected.kind === 'raidNormal' ? '일반' : '보스'
    } 레이드 ${record.stage}단계 편집`;
    elements.editorSubtitle.textContent =
      '레이드 종류별 단계 정보와 보상, 시간 제한, 참가 규칙을 수정합니다.';
    elements.editorForm.innerHTML = renderRaidEditor(
      record,
      state.selected.kind === 'raidNormal' ? 'normal' : 'boss',
    );
  } else {
    elements.editorTitle.textContent = `적 템플릿 ${record.id}`;
    elements.editorSubtitle.textContent =
      '여기서 바꾼 값은 레벨/레이드가 공통으로 참조하며, 스테이지별 override보다 먼저 적용됩니다.';
    elements.editorForm.innerHTML = renderEncounterEditor(record);
  }
}

function renderAdminWorkspace() {
  elements.userEmail.textContent =
    state.profile?.email || state.session?.user?.email || '-';
  elements.draftVersion.textContent = state.manifest
    ? `v${getManifestVersion(state.manifest)}`
    : '-';
  elements.publishedVersion.textContent = state.publishedVersion
    ? `v${state.publishedVersion}`
    : '-';
  renderTree();
  renderEditor();
  renderAssets();
  renderReleaseHistory();
  updateManifestTextarea();
}

function renderAll() {
  if (state.visualManifest) {
    renderVisualEditor();
  } else {
    elements.visualDraftVersion.textContent = '-';
    elements.visualPublishedVersion.textContent = '-';
  }

  if (state.adminWorkspaceLoaded && state.manifest) {
    renderAdminWorkspace();
  } else {
    elements.draftVersion.textContent = '-';
    elements.publishedVersion.textContent = '-';
  }

  renderHistoryViews();
  renderSettingsView();
  updateAccessControls();
  updateViewVisibility();
  updateChromeSummary();
}

function parseInputValue(input) {
  if (input.tagName === 'SELECT') {
    if (input.value === 'true') return true;
    if (input.value === 'false') return false;
  }
  if (input.type === 'number') {
    return normalizeNumber(input.value, 0);
  }
  return input.value;
}

function bindDynamicEvents() {
  elements.contentTree.querySelectorAll('.tree-item').forEach(button => {
    button.addEventListener('click', () => {
      state.selected = { kind: button.dataset.kind, id: button.dataset.id };
      renderAll();
      bindDynamicEvents();
    });
  });

  elements.editorForm.querySelectorAll('[data-path]').forEach(input => {
    input.addEventListener('change', () => {
      writePath(state.manifest, input.dataset.path, parseInputValue(input));
      renderAll();
      bindDynamicEvents();
    });
  });

  elements.releaseHistory
    .querySelectorAll('.rollback-button')
    .forEach(button => {
      button.addEventListener('click', async () => {
        const version = Number(button.dataset.version);
        if (
          !window.confirm(
            `v${version} 릴리즈를 기준으로 새 롤백 릴리즈를 만들까요?`,
          )
        ) {
          return;
        }
        try {
          await rollbackRelease(version);
        } catch (error) {
          showToast(getErrorMessage(error, '롤백에 실패했습니다.'));
        }
      });
    });
}

function getViewLabel(view) {
  if (view === 'admin') {
    return '관리자 데이터';
  }
  if (view === 'history') {
    return '배포 이력';
  }
  if (view === 'settings') {
    return '환경 설정';
  }
  return '화면 편집기';
}

function updateViewVisibility() {
  const viewMap = {
    ui: elements.uiEditorView,
    admin: elements.adminDataView,
    history: elements.historyView,
    settings: elements.settingsView,
  };

  Object.entries(viewMap).forEach(([key, node]) => {
    if (!node) {
      return;
    }
    node.classList.toggle('active', key === state.activeView);
  });

  [
    elements.viewUiButton,
    elements.viewAdminButton,
    elements.viewHistoryButton,
    elements.viewSettingsButton,
  ]
    .filter(Boolean)
    .forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.view === state.activeView,
      );
    });
}

function updateChromeSummary() {
  if (elements.activeViewStatus) {
    elements.activeViewStatus.textContent = getViewLabel(state.activeView);
  }

  if (elements.userEmail) {
    elements.userEmail.textContent =
      state.profile?.email ||
      state.session?.user?.email ||
      elements.adminEmail.value.trim() ||
      '-';
  }

  const connectedPhone = state.visualConnectedDevices.find(
    device => device.serial === state.visualActiveDeviceSerial,
  );
  const deviceLabel =
    connectedPhone?.rawState === 'device' ? '기기 연결됨' : '기기 미연결';
  setStatus(elements.deviceConnectionStatus, deviceLabel);

  const uiVersion = state.visualManifest
    ? `화면 초안 v${state.visualManifest.version || 0}`
    : '화면 초안 대기';
  const adminVersion = state.manifest
    ? `관리자 초안 v${getManifestVersion(state.manifest)}`
    : '관리자 초안 대기';
  setStatus(
    elements.manifestStatus,
    state.activeView === 'admin' ? adminVersion : uiVersion,
  );

  if (elements.logoutButton) {
    elements.logoutButton.textContent = isAdminAuthenticated()
      ? '로그아웃'
      : '관리자 로그인';
  }

  if (elements.settingsSupabaseUrl) {
    elements.settingsSupabaseUrl.textContent =
      state.supabaseUrl || elements.supabaseUrl.value.trim() || '-';
  }
  if (elements.settingsAdminEmail) {
    elements.settingsAdminEmail.textContent =
      state.profile?.email ||
      state.session?.user?.email ||
      elements.adminEmail.value.trim() ||
      '-';
  }
}

function updateAccessControls() {
  const loggedIn = isAdminAuthenticated();
  [
    elements.visualSaveDraftButton,
    elements.visualPublishButton,
    elements.refreshButton,
    elements.saveDraftButton,
    elements.publishButton,
    elements.copyJsonButton,
    elements.applyJsonButton,
    elements.uploadAssetButton,
    elements.addLevelButton,
    elements.addNormalRaidButton,
    elements.addBossRaidButton,
    elements.addEncounterButton,
    elements.cloneButton,
    elements.deleteButton,
  ]
    .filter(Boolean)
    .forEach(button => {
      button.disabled = !loggedIn;
    });

  if (elements.viewAdminButton) {
    elements.viewAdminButton.disabled = !loggedIn;
  }
}

function toggleLoginCard(forceVisible) {
  if (!elements.loginCard) {
    return;
  }
  const nextVisible =
    typeof forceVisible === 'boolean'
      ? forceVisible
      : elements.loginCard.classList.contains('hidden');
  elements.loginCard.classList.toggle('hidden', !nextVisible);
}

function getVisualSelectedRule() {
  return getVisualRule(
    state.visualManifest,
    state.visualSelectedScreenId,
    state.visualSelectedElementId,
  );
}

function getVisualDeviceProfile() {
  return (
    DEVICE_PROFILES.find(
      profile => profile.id === state.visualDeviceProfileId,
    ) || DEVICE_PROFILES[0]
  );
}

function getVisualViewport() {
  if (state.visualDeviceSource === 'phone' && state.visualDeviceViewport) {
    return sanitizeViewport({
      width: state.visualDeviceViewport.widthDp,
      height: state.visualDeviceViewport.heightDp,
      safeTop: state.visualDeviceViewport.safeTopDp,
      safeBottom: state.visualDeviceViewport.safeBottomDp,
    });
  }

  if (state.visualDeviceSource === 'preset') {
    return cloneVisualValue(getVisualDeviceProfile().viewport);
  }

  return sanitizeViewport(state.visualCustomViewport);
}

function syncVisualViewportInputs() {
  const viewport = getVisualViewport();
  elements.visualViewportWidth.value = String(viewport.width);
  elements.visualViewportHeight.value = String(viewport.height);
  elements.visualSafeTop.value = String(viewport.safeTop);
  elements.visualSafeBottom.value = String(viewport.safeBottom);
  elements.visualCurrentViewport.textContent = `${viewport.width} x ${viewport.height} · 안전영역 ${viewport.safeTop} / ${viewport.safeBottom}`;
}

function pushVisualHistory() {
  if (!state.visualManifest) {
    return;
  }
  state.visualHistoryPast.push(JSON.stringify(state.visualManifest));
  if (state.visualHistoryPast.length > 80) {
    state.visualHistoryPast.shift();
  }
  state.visualHistoryFuture = [];
}

function applyVisualHistorySnapshot(raw) {
  state.visualManifest = ensureVisualManifest(JSON.parse(raw));
  state.visualDirty = true;
}

function markVisualDirty() {
  state.visualDirty = true;
  setInlineStatus(
    elements.uiEditorStatusLine,
    '화면 초안이 수정되었습니다.',
    'success',
  );
}

function getVisualSnapshot(screenId = state.visualSelectedScreenId) {
  if (!state.visualManifest) {
    return null;
  }
  return getStudioSnapshot(state.visualManifest, screenId);
}

function getVisualSnapshotAsset(screenId = state.visualSelectedScreenId) {
  const assetKey = getVisualSnapshot(screenId)?.assetKey;
  if (!assetKey) {
    return null;
  }
  return state.assets.find(asset => asset.asset_key === assetKey) ?? null;
}

function getVisualLayoutCoverage(screenId = state.visualSelectedScreenId) {
  const snapshot = getVisualSnapshot(screenId);
  const items = ELEMENT_DEFS[screenId] ?? [];
  const measuredCount = items.filter(
    item => snapshot?.elementFrames?.[item.id],
  ).length;
  return {
    snapshot,
    totalCount: items.length,
    measuredCount,
    hasMeasuredLayout: measuredCount > 0,
    isFullLayout: items.length > 0 && measuredCount === items.length,
  };
}

function getVisualStageBaseRects(
  screenId = state.visualSelectedScreenId,
  viewport = getVisualViewport(),
) {
  const items = ELEMENT_DEFS[screenId] ?? [];
  const coverage = getVisualLayoutCoverage(screenId);
  const runtimeLayout = getPreviewLayout(screenId, viewport) ?? {};
  const measuredRects = {};
  const requiredItems = items.filter(({ id }) => id !== 'skill_effect');

  const canUseMeasuredLayout =
    requiredItems.length > 0 &&
    requiredItems.every(({ id }) => {
      const rect = getMeasuredBaseRect(
        state.visualManifest,
        screenId,
        id,
        viewport,
      );
      if (!rect) {
        return false;
      }
      measuredRects[id] = rect;
      return true;
    });

  if (
    canUseMeasuredLayout &&
    !measuredRects.skill_effect &&
    measuredRects.board
  ) {
    measuredRects.skill_effect = measuredRects.board;
  }

  return {
    coverage,
    source: canUseMeasuredLayout
      ? 'measured'
      : coverage.hasMeasuredLayout
      ? 'partial'
      : 'runtime',
    rects: canUseMeasuredLayout ? measuredRects : runtimeLayout,
  };
}

function getVisualStageBackgroundSource(
  screenId = state.visualSelectedScreenId,
) {
  if (state.visualDeviceSource === 'phone' && state.visualFrameDataUrl) {
    return {
      kind: 'phone',
      src: state.visualFrameDataUrl,
    };
  }

  const snapshotAsset = getVisualSnapshotAsset(screenId);
  if (snapshotAsset?.data_url) {
    return {
      kind: 'snapshot',
      src: snapshotAsset.data_url,
    };
  }

  return null;
}

function getVisualStatusMessage() {
  const { measuredCount, totalCount, hasMeasuredLayout } =
    getVisualLayoutCoverage();
  const baseLayout = getVisualStageBaseRects();
  const background = getVisualStageBackgroundSource();
  const layoutSuffix =
    baseLayout.source === 'measured'
      ? ` 실기 기준 ${measuredCount}/${totalCount}개 요소를 그대로 사용 중입니다.`
      : hasMeasuredLayout
      ? ` 실기 태그는 ${measuredCount}/${totalCount}개만 감지되어, 혼합 오차를 막기 위해 화면 전체를 런타임 계산식으로 표시합니다.`
      : ' 저장된 실측이 없어 화면 전체를 런타임 계산식으로 표시합니다.';

  if (background?.kind === 'phone') {
    return `실제 폰 화면을 기준으로 편집 중입니다.${layoutSuffix}`;
  }
  if (background?.kind === 'snapshot') {
    return `저장된 런타임 스냅샷을 기준으로 편집 중입니다.${layoutSuffix}`;
  }
  if (state.visualDeviceSource === 'phone') {
    return `실제 폰 화면을 아직 가져오지 못했습니다. 연결 상태를 확인하세요.${layoutSuffix}`;
  }
  return `실제 폰 미연결 상태입니다. 현재는 기기 크기 기준 미리보기로 편집합니다.${layoutSuffix}`;
}

async function fetchVisualDraft() {
  const { data, error } = await state.supabase
    .from('ui_config_draft')
    .select('id, config_json, updated_at')
    .eq('id', DEFAULT_DRAFT_ID)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

async function fetchLatestVisualRelease() {
  const { data, error } = await state.supabase
    .from('ui_config_releases')
    .select('version, config_json, notes, created_at')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

async function fetchVisualReleaseHistory() {
  const { data, error } = await state.supabase
    .from('ui_config_releases')
    .select('version, config_json, notes, created_at')
    .order('version', { ascending: false })
    .limit(12);
  if (error) {
    throw error;
  }
  return data ?? [];
}

async function saveVisualDraft() {
  if (!state.visualManifest) {
    return;
  }
  state.visualManifest.referenceViewport = getVisualViewport();
  const { error } = await state.supabase.from('ui_config_draft').upsert(
    {
      id: DEFAULT_DRAFT_ID,
      config_json: cloneVisualValue(state.visualManifest),
      updated_by: state.session.user.id,
    },
    { onConflict: 'id' },
  );
  if (error) {
    throw error;
  }
  state.visualDirty = false;
  setInlineStatus(
    elements.uiEditorStatusLine,
    '화면 초안을 저장했습니다.',
    'success',
  );
}

async function publishVisualDraft() {
  if (!state.visualManifest) {
    return;
  }
  const latest = await fetchLatestVisualRelease();
  const nextVersion = Number(latest?.version || 0) + 1;
  const nextDraft = cloneVisualValue(state.visualManifest);
  nextDraft.version = nextVersion;
  nextDraft.referenceViewport = getVisualViewport();
  const payload = cloneVisualValue(nextDraft);
  payload.studioSnapshots = {};
  const notes = elements.visualPublishNotes.value.trim();
  const { error } = await state.supabase.from('ui_config_releases').insert({
    version: nextVersion,
    config_json: payload,
    notes: notes || null,
    created_by: state.session.user.id,
  });
  if (error) {
    throw error;
  }
  state.visualManifest = nextDraft;
  state.visualPublishedVersion = nextVersion;
  await saveVisualDraft();
  state.visualReleaseHistory = await fetchVisualReleaseHistory();
  elements.visualPublishNotes.value = '';
  setInlineStatus(
    elements.uiEditorStatusLine,
    `화면 배포본 v${nextVersion}을 배포했습니다.`,
    'success',
  );
}

async function loadVisualReleaseIntoEditor(version) {
  const release = state.visualReleaseHistory.find(
    item => item.version === version,
  );
  if (!release?.config_json) {
    throw new Error(`화면 배포본 v${version}을 찾지 못했습니다.`);
  }
  pushVisualHistory();
  state.visualManifest = ensureVisualManifest(release.config_json);
  state.visualDirty = true;
  renderAll();
}

async function loadVisualWorkspace() {
  const [draft, latestRelease, releaseHistory, assets] = await Promise.all([
    fetchVisualDraft(),
    fetchLatestVisualRelease(),
    fetchVisualReleaseHistory(),
    fetchAssets().catch(error => {
      console.error(error);
      return [];
    }),
  ]);

  state.assets = assets ?? [];
  state.visualReleaseHistory = releaseHistory;
  state.visualPublishedVersion = latestRelease?.version ?? null;
  if (draft?.config_json) {
    state.visualManifest = ensureVisualManifest(draft.config_json);
  } else if (latestRelease?.config_json) {
    state.visualManifest = ensureVisualManifest(latestRelease.config_json);
  } else {
    state.visualManifest = createDefaultVisualManifest();
    await saveVisualDraft();
  }

  state.visualWorkspaceLoaded = true;
  state.visualDirty = false;
  state.visualHistoryPast = [];
  state.visualHistoryFuture = [];
  state.visualSelectedScreenId = SCREEN_LABELS[state.visualSelectedScreenId]
    ? state.visualSelectedScreenId
    : 'level';
  if (
    !ELEMENT_DEFS[state.visualSelectedScreenId].some(
      item => item.id === state.visualSelectedElementId,
    )
  ) {
    state.visualSelectedElementId =
      ELEMENT_DEFS[state.visualSelectedScreenId][0].id;
  }

  await refreshConnectedDevices(false);
  renderAll();
}

async function refreshConnectedDevices(showFeedback = true) {
  if (!canUseDeviceBridge()) {
    state.visualConnectedDevices = [];
    state.visualDeviceViewport = null;
    setInlineStatus(
      elements.visualDeviceMeta,
      '데스크톱 기기 연결 기능을 사용할 수 없습니다.',
      'error',
    );
    renderVisualEditor();
    return;
  }

  const result = await desktopBridge.listDevices();
  if (!result?.ok) {
    throw new Error(result?.message || '기기 목록을 가져오지 못했습니다.');
  }

  state.visualConnectedDevices = result.devices ?? [];
  const activeDevices = state.visualConnectedDevices.filter(
    device => device.rawState === 'device',
  );
  if (!activeDevices.length) {
    state.visualActiveDeviceSerial = '';
    state.visualDeviceViewport = null;
    state.visualFrameDataUrl = '';
    if (showFeedback) {
      setInlineStatus(
        elements.visualDeviceMeta,
        '연결된 안드로이드 기기가 없습니다.',
        'error',
      );
    }
    stopVisualFrameLoop();
    renderVisualEditor();
    return;
  }

  if (
    !activeDevices.some(
      device => device.serial === state.visualActiveDeviceSerial,
    )
  ) {
    state.visualActiveDeviceSerial = activeDevices[0].serial;
  }

  await refreshDeviceViewport(false);
  await refreshVisualLiveLayout(false);
  if (showFeedback) {
    setInlineStatus(
      elements.visualDeviceMeta,
      '기기 목록을 새로 불러왔습니다.',
      'success',
    );
  }
  if (state.activeView === 'ui' && state.visualDeviceSource === 'phone') {
    startVisualFrameLoop();
  }
  renderVisualEditor();
}

async function refreshDeviceViewport(showFeedback = true) {
  if (!canUseDeviceBridge() || !state.visualActiveDeviceSerial) {
    return;
  }
  const result = await desktopBridge.getDeviceViewport(
    state.visualActiveDeviceSerial,
  );
  if (!result?.ok) {
    throw new Error(result?.message || '기기 화면 정보를 읽지 못했습니다.');
  }
  state.visualDeviceViewport = result.viewport ?? null;
  if (showFeedback) {
    setInlineStatus(
      elements.visualDeviceMeta,
      '기기 화면 정보를 업데이트했습니다.',
      'success',
    );
  }
}

function syncSelectedVisualScreen(screenId) {
  if (!SCREEN_LABELS[screenId]) {
    return;
  }
  state.visualSelectedScreenId = screenId;
  if (
    !ELEMENT_DEFS[screenId]?.some(
      item => item.id === state.visualSelectedElementId,
    )
  ) {
    state.visualSelectedElementId = ELEMENT_DEFS[screenId]?.[0]?.id || 'header';
  }
}

function applyMeasuredDeviceLayout(layout) {
  if (!state.visualManifest || !layout?.screens) {
    return { matchedCount: 0, syncedScreenIds: [] };
  }

  const nextManifest = cloneVisualValue(state.visualManifest);
  nextManifest.studioSnapshots = { ...(nextManifest.studioSnapshots ?? {}) };
  let matchedCount = 0;
  const syncedScreenIds = [];

  Object.entries(layout.screens).forEach(([screenId, snapshot]) => {
    if (!SCREEN_LABELS[screenId]) {
      return;
    }
    const elementFrames = snapshot?.elementFrames ?? {};
    const elementIds = Object.keys(elementFrames);
    if (!elementIds.length) {
      return;
    }

    matchedCount += elementIds.length;
    syncedScreenIds.push(screenId);
    const previousSnapshot = nextManifest.studioSnapshots[screenId] ?? {};
    const measuredElementRules = Object.fromEntries(
      elementIds.map(elementId => [
        elementId,
        cloneVisualValue(getVisualRule(nextManifest, screenId, elementId)),
      ]),
    );

    nextManifest.studioSnapshots[screenId] = {
      assetKey: previousSnapshot.assetKey ?? null,
      capturedAt: layout.capturedAt || new Date().toISOString(),
      viewport: sanitizeViewport(layout.viewport),
      referenceViewport: sanitizeViewport(
        previousSnapshot.referenceViewport ?? nextManifest.referenceViewport,
      ),
      elementFrames: cloneVisualValue(elementFrames),
      elementRules: measuredElementRules,
    };
  });

  if (!matchedCount) {
    return { matchedCount: 0, syncedScreenIds: [] };
  }

  state.visualManifest = ensureVisualManifest(nextManifest);
  if (
    layout.detectedScreenId &&
    syncedScreenIds.includes(layout.detectedScreenId)
  ) {
    syncSelectedVisualScreen(layout.detectedScreenId);
  }
  return { matchedCount, syncedScreenIds };
}

async function refreshVisualLiveLayout(showFeedback = true) {
  if (
    !canUseDeviceLayoutBridge() ||
    !state.visualActiveDeviceSerial ||
    !state.visualManifest
  ) {
    return { matchedCount: 0, syncedScreenIds: [] };
  }

  const result = await desktopBridge.getDeviceLayout(
    state.visualActiveDeviceSerial,
  );
  if (!result?.ok) {
    if (!showFeedback) {
      return { matchedCount: 0, syncedScreenIds: [] };
    }
    throw new Error(
      result?.message || '실제 기기 UI 레이아웃을 읽지 못했습니다.',
    );
  }

  const layout = result.layout ?? null;
  const applied = applyMeasuredDeviceLayout(layout);
  if (showFeedback) {
    if (applied.matchedCount > 0) {
      const screenLabel = layout?.detectedScreenId
        ? SCREEN_LABELS[layout.detectedScreenId]
        : '';
      const screenSuffix = screenLabel ? ` (${screenLabel})` : '';
      setInlineStatus(
        elements.visualDeviceMeta,
        `실제 기기 레이아웃 ${applied.matchedCount}개를 동기화했습니다.${screenSuffix}`,
        'success',
      );
    } else {
      setInlineStatus(
        elements.visualDeviceMeta,
        '현재 화면에서 편집용 UI 좌표 태그를 찾지 못했습니다. 실제 플레이 화면에서 다시 시도하세요.',
      );
    }
  }
  return applied;
}

async function refreshVisualFrame(showFeedback = true) {
  if (!canUseDeviceBridge() || !state.visualActiveDeviceSerial) {
    throw new Error('연결된 안드로이드 기기가 없습니다.');
  }
  if (state.visualFrameBusy) {
    return;
  }
  state.visualFrameBusy = true;
  try {
    const result = await desktopBridge.getDeviceFrame(
      state.visualActiveDeviceSerial,
    );
    if (!result?.ok) {
      throw new Error(result?.message || '실제 폰 화면을 가져오지 못했습니다.');
    }
    state.visualFrameDataUrl = result.frame?.dataUrl || '';
    if (showFeedback) {
      setInlineStatus(
        elements.visualStageStatus,
        '실제 폰 화면을 새로 가져왔습니다.',
        'success',
      );
    }
    renderVisualEditor();
  } finally {
    state.visualFrameBusy = false;
  }
}

function stopVisualFrameLoop() {
  if (state.visualFrameTimer) {
    clearTimeout(state.visualFrameTimer);
    state.visualFrameTimer = null;
  }
}

function startVisualFrameLoop() {
  stopVisualFrameLoop();
  if (
    state.activeView !== 'ui' ||
    state.visualDeviceSource !== 'phone' ||
    !state.visualActiveDeviceSerial ||
    !canUseDeviceBridge()
  ) {
    return;
  }

  const loop = async () => {
    try {
      await refreshVisualFrame(false);
    } catch (error) {
      setInlineStatus(
        elements.visualStageStatus,
        getErrorMessage(error, '실제 폰 화면을 가져오지 못했습니다.'),
        'error',
      );
      stopVisualFrameLoop();
      return;
    }
    state.visualFrameTimer = setTimeout(loop, 450);
  };

  void loop();
}

function renderVisualDeviceOptions() {
  elements.visualDeviceProfile.innerHTML = DEVICE_PROFILES.map(
    profile =>
      `<option value="${profile.id}" ${
        profile.id === state.visualDeviceProfileId ? 'selected' : ''
      }>${profile.label}</option>`,
  ).join('');

  const deviceOptions = ['<option value="">연결된 기기 없음</option>'];
  state.visualConnectedDevices.forEach(device => {
    const label = `${device.model || device.product || device.serial} · ${
      device.stateLabel
    }`;
    deviceOptions.push(
      `<option value="${device.serial}" ${
        device.serial === state.visualActiveDeviceSerial ? 'selected' : ''
      }>${label}</option>`,
    );
  });
  elements.visualDeviceSelect.innerHTML = deviceOptions.join('');
  elements.visualDeviceSource.value = state.visualDeviceSource;
  elements.visualDeviceSelect.disabled = state.visualDeviceSource !== 'phone';
  elements.visualDeviceProfile.disabled = state.visualDeviceSource !== 'preset';
  [
    elements.visualViewportWidth,
    elements.visualViewportHeight,
    elements.visualSafeTop,
    elements.visualSafeBottom,
  ]
    .filter(Boolean)
    .forEach(input => {
      input.disabled = state.visualDeviceSource !== 'custom';
    });
}

function renderVisualElementList() {
  if (!elements.visualElementList) {
    return;
  }
  const items = ELEMENT_DEFS[state.visualSelectedScreenId] ?? [];
  elements.visualElementList.innerHTML = items
    .map(({ id, label }) => {
      const rule = getVisualRule(
        state.visualManifest,
        state.visualSelectedScreenId,
        id,
      );
      const active = state.visualSelectedElementId === id ? ' active' : '';
      return `
        <div class="visual-element-row${active}">
          <input class="visual-visible-toggle" data-element-id="${id}" type="checkbox" ${
        rule.visible ? 'checked' : ''
      } />
          <button class="visual-element-button" data-element-id="${id}" type="button">
            <strong>${label}</strong>
            <small>${rule.safeAreaAware ? '안전영역 기준' : '기본 기준'}</small>
          </button>
          <small class="muted">z ${rule.zIndex}</small>
        </div>`;
    })
    .join('');

  elements.visualElementList
    .querySelectorAll('.visual-element-button')
    .forEach(button => {
      button.addEventListener('click', () => {
        state.visualSelectedElementId = button.dataset.elementId;
        renderVisualEditor();
      });
    });

  elements.visualElementList
    .querySelectorAll('.visual-visible-toggle')
    .forEach(input => {
      input.addEventListener('change', () => {
        pushVisualHistory();
        const rule = getVisualRule(
          state.visualManifest,
          state.visualSelectedScreenId,
          input.dataset.elementId,
        );
        rule.visible = input.checked;
        markVisualDirty();
        renderVisualEditor();
      });
    });
}

function renderVisualInspector() {
  const rule = getVisualSelectedRule();
  elements.visualCurrentScreen.textContent =
    SCREEN_LABELS[state.visualSelectedScreenId];
  elements.visualCurrentElement.textContent = formatVisualElementLabel(
    state.visualSelectedScreenId,
    state.visualSelectedElementId,
  );
  elements.visualInspectorTitle.textContent = formatVisualElementLabel(
    state.visualSelectedScreenId,
    state.visualSelectedElementId,
  );
  elements.visualInspectorHelp.textContent =
    ELEMENT_HELP[state.visualSelectedScreenId]?.[
      state.visualSelectedElementId
    ] || '좌우 패널과 드래그를 함께 사용해 1픽셀 단위로 맞추세요.';
  elements.visualOffsetX.value = String(rule.offsetX);
  elements.visualOffsetY.value = String(rule.offsetY);
  elements.visualScale.value = String(rule.scale);
  elements.visualWidthScale.value = String(rule.widthScale ?? 1);
  elements.visualHeightScale.value = String(rule.heightScale ?? 1);
  elements.visualOpacity.value = String(rule.opacity);
  elements.visualZIndex.value = String(rule.zIndex);
  elements.visualVisible.value = rule.visible ? 'true' : 'false';
  elements.visualSafeAware.checked = rule.safeAreaAware;
  syncVisualViewportInputs();
}

function getVisualDisplayScale(viewport) {
  const hostWidth = Math.max(260, elements.visualStageHost.clientWidth - 40);
  const hostHeight = Math.max(480, elements.visualStageHost.clientHeight - 40);
  state.visualFitScale = Math.min(
    hostWidth / viewport.width,
    hostHeight / viewport.height,
  );
  state.visualDisplayScale =
    state.visualZoomMode === 'actual' ? 1 : state.visualFitScale;
  return state.visualDisplayScale;
}

function renderVisualStage() {
  if (!state.visualManifest) {
    return;
  }
  const viewport = getVisualViewport();
  const displayScale = getVisualDisplayScale(viewport);
  const referenceViewport = state.visualManifest.referenceViewport || viewport;
  const stageBaseLayout = getVisualStageBaseRects(
    state.visualSelectedScreenId,
    viewport,
  );
  const stageBackground = getVisualStageBackgroundSource();
  const frameWidth = Math.round(viewport.width * displayScale);
  const frameHeight = Math.round(viewport.height * displayScale);
  elements.visualPhoneFrame.style.width = `${frameWidth}px`;
  elements.visualPhoneFrame.style.height = `${frameHeight}px`;
  elements.visualSafeTopOverlay.style.height = `${Math.round(
    viewport.safeTop * displayScale,
  )}px`;
  elements.visualSafeBottomOverlay.style.height = `${Math.round(
    viewport.safeBottom * displayScale,
  )}px`;
  elements.visualGridOverlay.style.display = state.visualShowGrid
    ? 'block'
    : 'none';
  elements.visualGridOverlay.style.backgroundImage = state.visualShowGrid
    ? 'linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)'
    : 'none';
  elements.visualGridOverlay.style.backgroundSize = `${
    state.visualGridSize * displayScale
  }px ${state.visualGridSize * displayScale}px`;

  if (stageBackground?.src) {
    elements.visualLiveImage.src = stageBackground.src;
    elements.visualLiveImage.classList.remove('hidden');
    elements.visualFrameFallback.classList.add('hidden');
  } else {
    elements.visualLiveImage.removeAttribute('src');
    elements.visualLiveImage.classList.add('hidden');
    elements.visualFrameFallback.classList.remove('hidden');
    elements.visualFrameFallback.textContent = getVisualStatusMessage();
  }

  elements.visualOverlay.innerHTML = '';
  ELEMENT_DEFS[state.visualSelectedScreenId].forEach(({ id, label }) => {
    const rule = getVisualRule(
      state.visualManifest,
      state.visualSelectedScreenId,
      id,
    );
    if (!rule.visible) {
      return;
    }
    let baseRect = stageBaseLayout.rects?.[id];
    if (id === 'skill_effect') {
      const boardRect = stageBaseLayout.rects?.board;
      if (boardRect) {
        baseRect = applyRuleToRect(
          boardRect,
          getVisualRule(
            state.visualManifest,
            state.visualSelectedScreenId,
            'board',
          ),
          viewport,
          referenceViewport,
        );
      }
    }
    if (!baseRect) {
      return;
    }
    const finalRect = applyRuleToRect(
      baseRect,
      rule,
      viewport,
      referenceViewport,
    );
    const box = document.createElement('div');
    box.className = `visual-box${
      state.visualSelectedElementId === id ? ' active' : ''
    }${state.visualDrag?.elementId === id ? ' dragging' : ''}`;
    box.dataset.elementId = id;
    box.style.left = `${Math.round(finalRect.left * displayScale)}px`;
    box.style.top = `${Math.round(finalRect.top * displayScale)}px`;
    box.style.width = `${Math.round(finalRect.width * displayScale)}px`;
    box.style.height = `${Math.round(finalRect.height * displayScale)}px`;
    box.style.opacity = String(rule.opacity);
    box.style.zIndex = String(20 + rule.zIndex);

    const header = document.createElement('div');
    header.className = 'visual-box-header';
    header.innerHTML = `<span>${label}</span><span>${rule.offsetX}, ${rule.offsetY}</span>`;
    box.appendChild(header);

    box.addEventListener('pointerdown', event => {
      if (event.button !== 0) {
        return;
      }
      state.visualSelectedElementId = id;
      const currentRule = getVisualSelectedRule();
      pushVisualHistory();
      state.visualDrag = {
        elementId: id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originalOffsetX: currentRule.offsetX,
        originalOffsetY: currentRule.offsetY,
      };
      document.body.classList.add('dragging-visual');
      box.setPointerCapture(event.pointerId);
      renderVisualEditor();
    });

    elements.visualOverlay.appendChild(box);
  });

  setInlineStatus(
    elements.visualStageStatus,
    getVisualStatusMessage(),
    stageBackground?.kind === 'phone' || stageBaseLayout.source === 'measured'
      ? 'success'
      : 'muted',
  );
}

function renderVisualReleaseHistory(host = elements.visualReleaseHistory) {
  if (!host) {
    return;
  }
  if (!state.visualReleaseHistory.length) {
    host.innerHTML =
      '<div class="release-card"><strong>화면 배포 이력이 없습니다.</strong><p>아직 화면 배포를 한 적이 없습니다.</p></div>';
    return;
  }

  host.innerHTML = state.visualReleaseHistory
    .map(
      release => `
        <div class="release-card">
          <strong>화면 v${release.version}</strong>
          <p>${release.notes || '메모 없음'}</p>
          <div class="release-meta">
            <span>${new Date(release.created_at).toLocaleString('ko-KR')}</span>
            <button class="ghost small visual-release-load" data-version="${
              release.version
            }">이 버전 열기</button>
          </div>
        </div>`,
    )
    .join('');

  host.querySelectorAll('.visual-release-load').forEach(button => {
    button.addEventListener('click', async () => {
      try {
        await loadVisualReleaseIntoEditor(Number(button.dataset.version));
      } catch (error) {
        showToast(getErrorMessage(error, '화면 배포본을 불러오지 못했습니다.'));
      }
    });
  });
}

function renderHistoryViews() {
  renderVisualReleaseHistory(elements.visualHistoryViewList);
  if (!state.adminWorkspaceLoaded) {
    elements.adminHistoryViewList.innerHTML =
      '<div class="release-card"><strong>관리자 데이터 대기 중</strong><p>관리자 데이터 탭을 열면 배포 이력을 함께 불러옵니다.</p></div>';
  } else if (!state.releaseHistory.length) {
    elements.adminHistoryViewList.innerHTML =
      '<div class="release-card"><strong>관리자 데이터 배포 이력이 없습니다.</strong><p>아직 관리자 데이터 배포를 한 적이 없습니다.</p></div>';
  } else {
    elements.adminHistoryViewList.innerHTML = state.releaseHistory
      .map(
        release => `
          <div class="release-card">
            <strong>관리자 v${release.version}</strong>
            <p>${release.notes || '메모 없음'}</p>
            <div class="release-meta"><span>${new Date(
              release.created_at,
            ).toLocaleString('ko-KR')}</span></div>
          </div>`,
      )
      .join('');
  }
}

function renderSettingsView() {
  if (!elements.settingsDeviceList) {
    return;
  }
  if (!state.visualConnectedDevices.length) {
    elements.settingsDeviceList.innerHTML =
      '<div class="device-card"><strong>연결된 기기 없음</strong><p>USB 디버깅이 켜진 안드로이드 폰을 연결하세요.</p></div>';
  } else {
    elements.settingsDeviceList.innerHTML = state.visualConnectedDevices
      .map(device => {
        const active =
          device.serial === state.visualActiveDeviceSerial
            ? '현재 사용 중'
            : device.stateLabel;
        return `
          <div class="device-card">
            <strong>${
              device.model || device.product || '기기 이름 없음'
            }</strong>
            <p>${device.serial}</p>
            <small class="inline-note">${active}</small>
          </div>`;
      })
      .join('');
  }

  if (state.visualDeviceViewport) {
    elements.settingsDeviceMeta.textContent = `${
      state.visualDeviceViewport.model || '연결 기기'
    } · ${state.visualDeviceViewport.widthDp} x ${
      state.visualDeviceViewport.heightDp
    } · 안전영역 ${state.visualDeviceViewport.safeTopDp} / ${
      state.visualDeviceViewport.safeBottomDp
    }`;
    elements.settingsDeviceMeta.className = 'inline-note success';
  } else {
    elements.settingsDeviceMeta.textContent =
      '기기 화면 정보를 아직 읽지 않았습니다.';
    elements.settingsDeviceMeta.className = 'inline-note';
  }
}

function renderVisualEditor() {
  elements.visualScreenId.value = state.visualSelectedScreenId;
  elements.visualShowGrid.checked = state.visualShowGrid;
  elements.visualSnapGrid.checked = state.visualSnapGrid;
  elements.visualGridSize.value = String(state.visualGridSize);
  renderVisualDeviceOptions();
  renderVisualInspector();
  renderVisualStage();
  renderVisualReleaseHistory();
  elements.visualDraftVersion.textContent = state.visualManifest
    ? `v${state.visualManifest.version || 0}`
    : '-';
  elements.visualPublishedVersion.textContent = state.visualPublishedVersion
    ? `v${state.visualPublishedVersion}`
    : '-';
  elements.visualUndoButton.disabled = state.visualHistoryPast.length === 0;
  elements.visualRedoButton.disabled = state.visualHistoryFuture.length === 0;
}

function updateVisualRuleFromInputs() {
  const rule = getVisualSelectedRule();
  const next = sanitizeRule({
    offsetX: elements.visualOffsetX.value,
    offsetY: elements.visualOffsetY.value,
    scale: elements.visualScale.value,
    widthScale: elements.visualWidthScale.value,
    heightScale: elements.visualHeightScale.value,
    opacity: elements.visualOpacity.value,
    zIndex: elements.visualZIndex.value,
    visible: elements.visualVisible.value === 'true',
    safeAreaAware: elements.visualSafeAware.checked,
  });
  Object.assign(rule, next);
}

function nudgeVisual(dx, dy) {
  pushVisualHistory();
  const rule = getVisualSelectedRule();
  rule.offsetX += dx;
  rule.offsetY += dy;
  markVisualDirty();
  renderVisualEditor();
}

function bindVisualPointerEvents() {
  window.addEventListener('pointermove', event => {
    if (!state.visualDrag || !state.visualManifest) {
      return;
    }
    const viewport = getVisualViewport();
    const displayScale = Math.max(state.visualDisplayScale, 0.01);
    const delta = convertViewportDeltaToReference(
      (event.clientX - state.visualDrag.startClientX) / displayScale,
      (event.clientY - state.visualDrag.startClientY) / displayScale,
      viewport,
      state.visualManifest.referenceViewport || viewport,
      getVisualSelectedRule().safeAreaAware,
    );
    const rule = getVisualSelectedRule();
    let nextX = Math.round(state.visualDrag.originalOffsetX + delta.x);
    let nextY = Math.round(state.visualDrag.originalOffsetY + delta.y);
    if (state.visualSnapGrid) {
      nextX = Math.round(nextX / state.visualGridSize) * state.visualGridSize;
      nextY = Math.round(nextY / state.visualGridSize) * state.visualGridSize;
    }
    rule.offsetX = nextX;
    rule.offsetY = nextY;
    markVisualDirty();
    renderVisualEditor();
  });

  window.addEventListener('pointerup', () => {
    if (!state.visualDrag) {
      return;
    }
    state.visualDrag = null;
    document.body.classList.remove('dragging-visual');
    renderVisualEditor();
  });
}

async function setActiveView(view) {
  if (view === 'admin' && !isAdminAuthenticated()) {
    showToast('관리자 데이터는 로그인 후 사용할 수 있습니다.');
    state.activeView = 'ui';
    renderAll();
    return;
  }
  state.activeView = view;
  if (view === 'admin' && !state.adminWorkspaceLoaded) {
    await loadWorkspace();
  }
  if (view === 'ui' && state.visualDeviceSource === 'phone') {
    startVisualFrameLoop();
  } else {
    stopVisualFrameLoop();
  }
  renderAll();
}
async function ensureClient() {
  const url = elements.supabaseUrl.value.trim() || DEFAULT_SUPABASE_URL;
  const key =
    elements.supabaseAnonKey.value.trim() || DEFAULT_SUPABASE_ANON_KEY;
  if (
    state.supabase &&
    state.supabaseUrl === url &&
    state.supabaseKey === key
  ) {
    return state.supabase;
  }
  state.supabase = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  state.supabaseUrl = url;
  state.supabaseKey = key;
  return state.supabase;
}

async function fetchProfile(userId) {
  const { data, error } = await state.supabase
    .from('profiles')
    .select('id, nickname, is_admin')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return { email: state.session?.user?.email, ...data };
}

async function loadDefaultManifest() {
  return deepClone(defaultCreatorManifest);
}

async function fetchDraft() {
  const { data, error } = await state.supabase
    .from('creator_draft')
    .select('id, manifest_json, updated_at')
    .eq('id', DEFAULT_DRAFT_ID)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchLatestRelease() {
  const { data, error } = await state.supabase
    .from('creator_releases')
    .select('version, manifest_json, notes, created_at')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchReleaseHistory() {
  const { data, error } = await state.supabase
    .from('creator_releases')
    .select('version, notes, created_at')
    .order('version', { ascending: false })
    .limit(12);
  if (error) throw error;
  return data ?? [];
}

async function fetchAssets() {
  const { data, error } = await state.supabase
    .from('ui_assets')
    .select('asset_key, data_url, mime_type, content_hash')
    .order('asset_key', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function saveDraft() {
  const { error } = await state.supabase.from('creator_draft').upsert(
    {
      id: DEFAULT_DRAFT_ID,
      manifest_json: deepClone(state.manifest),
      updated_by: state.session.user.id,
    },
    { onConflict: 'id' },
  );
  if (error) throw error;
}

async function publishDraft() {
  const latest = await fetchLatestRelease();
  const nextVersion = Number(latest?.version || 0) + 1;
  const payload = deepClone(state.manifest);
  payload.version = nextVersion;
  payload.meta = {
    ...(payload.meta || {}),
    generatedAt: new Date().toISOString(),
    seededFromCode: false,
    notes: elements.publishNotes.value.trim() || '',
  };
  const { error } = await state.supabase.from('creator_releases').insert({
    version: nextVersion,
    manifest_json: payload,
    notes: elements.publishNotes.value.trim() || null,
    created_by: state.session.user.id,
  });
  if (error) throw error;
  state.manifest = payload;
  await saveDraft();
  elements.publishNotes.value = '';
}

async function rollbackRelease(version) {
  const { data, error } = await state.supabase
    .from('creator_releases')
    .select('version, manifest_json')
    .eq('version', version)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`v${version} 릴리즈를 찾지 못했습니다.`);
  state.manifest = deepClone(data.manifest_json);
  await saveDraft();
  elements.publishNotes.value = `v${version} 기준 롤백`;
  await publishDraft();
  await loadWorkspace();
}

function createLevelEntry() {
  const nextLevelId =
    Math.max(
      0,
      ...Object.values(state.manifest.levels).map(level => level.levelId),
    ) + 1;
  const id = `level_${nextLevelId}`;
  state.manifest.levels[id] = {
    id,
    levelId: nextLevelId,
    worldId: Math.max(1, Math.ceil(nextLevelId / 30)),
    stageNumberInWorld: ((nextLevelId - 1) % 30) + 1,
    name: `새 레벨 ${nextLevelId}`,
    goalType: 'defeat_enemy',
    goalValue: 1000,
    enemyTemplateId: Object.keys(state.manifest.encounters)[0],
    enemyOverrides: {},
    reward: { repeatGold: 100, firstClearBonusGold: 200, characterExp: 300 },
    enabled: true,
    background: {
      assetKey: null,
      tintColor: '#000000',
      tintOpacity: 0,
      removeImage: false,
    },
  };
  state.selected = { kind: 'level', id };
}

function createRaidEntry(kind) {
  const scope =
    kind === 'raidNormal'
      ? state.manifest.raids.normal
      : state.manifest.raids.boss;
  const nextStage =
    Math.max(0, ...Object.values(scope).map(raid => raid.stage)) + 1;
  const id = `${kind === 'raidNormal' ? 'normal' : 'boss'}_${nextStage}`;
  scope[id] = {
    id,
    raidType: kind === 'raidNormal' ? 'normal' : 'boss',
    stage: nextStage,
    worldId: kind === 'raidBoss' ? nextStage : null,
    name: `${
      kind === 'raidNormal' ? '일반 레이드' : '보스 레이드'
    } ${nextStage}`,
    encounterTemplateId: Object.keys(state.manifest.encounters)[0],
    encounterOverrides: {},
    reward: { firstClearDiamondReward: 20, repeatDiamondReward: 2 },
    timeLimitMs: kind === 'raidNormal' ? 900000 : 600000,
    raidWindowHours: 4,
    joinWindowMinutes: 10,
    maxParticipants: 4,
    enabled: true,
    background: {
      assetKey: null,
      tintColor: '#000000',
      tintOpacity: 0,
      removeImage: false,
    },
  };
  state.selected = { kind, id };
}

function createEncounterEntry() {
  const nextId = slugify(
    window.prompt('새 적 템플릿 id를 입력하세요.', 'encounter_new') || '',
  );
  if (!nextId) return;
  if (state.manifest.encounters[nextId]) {
    showToast('이미 같은 id의 템플릿이 있습니다.');
    return;
  }
  state.manifest.encounters[nextId] = {
    id: nextId,
    kind: 'level',
    displayName: '새 적',
    tier: 'normal',
    monsterName: '새 적',
    monsterEmoji: '👾',
    monsterColor: '#60a5fa',
    baseHp: 1000,
    baseAttack: 20,
    attackIntervalMs: 5000,
    attackPattern: 'basic_auto',
    enabled: true,
  };
  state.selected = { kind: 'encounter', id: nextId };
}
function cloneSelected() {
  const record = getSelectedRecord();
  if (!record || !state.selected) return;
  if (state.selected.kind === 'level') {
    const nextLevelId =
      Math.max(
        0,
        ...Object.values(state.manifest.levels).map(level => level.levelId),
      ) + 1;
    const id = `level_${nextLevelId}`;
    state.manifest.levels[id] = {
      ...deepClone(record),
      id,
      levelId: nextLevelId,
      name: `${record.name} 복사본`,
    };
    state.selected = { kind: 'level', id };
    return;
  }
  if (
    state.selected.kind === 'raidNormal' ||
    state.selected.kind === 'raidBoss'
  ) {
    const scope =
      state.selected.kind === 'raidNormal'
        ? state.manifest.raids.normal
        : state.manifest.raids.boss;
    const nextStage =
      Math.max(0, ...Object.values(scope).map(raid => raid.stage)) + 1;
    const id = `${
      state.selected.kind === 'raidNormal' ? 'normal' : 'boss'
    }_${nextStage}`;
    scope[id] = {
      ...deepClone(record),
      id,
      stage: nextStage,
      name: `${record.name} 복사본`,
    };
    state.selected = { kind: state.selected.kind, id };
    return;
  }
  const nextId = `${record.id}_copy`;
  state.manifest.encounters[nextId] = {
    ...deepClone(record),
    id: nextId,
    displayName: `${record.displayName} 복사본`,
  };
  state.selected = { kind: 'encounter', id: nextId };
}

function deleteSelected() {
  if (!state.selected || !window.confirm('선택한 항목을 삭제할까요?')) return;
  if (state.selected.kind === 'level')
    delete state.manifest.levels[state.selected.id];
  else if (state.selected.kind === 'raidNormal')
    delete state.manifest.raids.normal[state.selected.id];
  else if (state.selected.kind === 'raidBoss')
    delete state.manifest.raids.boss[state.selected.id];
  else delete state.manifest.encounters[state.selected.id];
  state.selected = null;
}

async function uploadAsset() {
  const file = elements.assetFileInput.files?.[0];
  if (!file) {
    showToast('업로드할 이미지를 먼저 선택하세요.');
    return;
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new Error('이미지를 읽는 중 오류가 발생했습니다.'));
    reader.readAsDataURL(file);
  });
  const assetKey =
    elements.assetKeyInput.value.trim() ||
    slugify(file.name.replace(/\.[^.]+$/, '')) ||
    `asset_${Date.now()}`;
  const { error } = await state.supabase.from('ui_assets').upsert(
    {
      asset_key: assetKey,
      data_url: dataUrl,
      mime_type: file.type || null,
      content_hash: String(file.lastModified),
      updated_by: state.session.user.id,
    },
    { onConflict: 'asset_key' },
  );
  if (error) throw error;
  elements.assetKeyInput.value = assetKey;
  elements.assetFileInput.value = '';
  state.assets = await fetchAssets();
  renderAssets();
}

async function loadWorkspace() {
  const [draft, latestRelease, releaseHistory, assets] = await Promise.all([
    fetchDraft(),
    fetchLatestRelease(),
    fetchReleaseHistory(),
    fetchAssets(),
  ]);
  state.assets = assets;
  state.releaseHistory = releaseHistory;
  state.publishedVersion = latestRelease?.version ?? null;
  if (draft?.manifest_json) state.manifest = deepClone(draft.manifest_json);
  else if (latestRelease?.manifest_json)
    state.manifest = deepClone(latestRelease.manifest_json);
  else {
    state.manifest = await loadDefaultManifest();
    await saveDraft();
  }
  state.adminWorkspaceLoaded = true;
  if (!state.selected || !getSelectedRecord()) {
    const firstLevel = Object.values(state.manifest.levels).sort(
      (a, b) => a.levelId - b.levelId,
    )[0];
    if (firstLevel) state.selected = { kind: 'level', id: firstLevel.id };
  }
  renderAll();
  bindDynamicEvents();
}

async function login(mode) {
  await ensureClient();
  if (mode === 'restore') {
    const { data } = await state.supabase.auth.getSession();
    if (!data.session) throw new Error('저장된 세션이 없습니다.');
    state.session = data.session;
  } else {
    const { data, error } = await state.supabase.auth.signInWithPassword({
      email: elements.adminEmail.value.trim(),
      password: elements.adminPassword.value,
    });
    if (error) throw error;
    state.session = data.session;
  }
  if (state.session?.user?.email) {
    elements.adminEmail.value = state.session.user.email;
  }
  state.profile = await fetchProfile(state.session.user.id);
  if (!state.profile?.is_admin)
    throw new Error('관리자 권한이 있는 계정으로 로그인해야 합니다.');
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      url: elements.supabaseUrl.value.trim(),
      key: elements.supabaseAnonKey.value.trim(),
      email: state.session.user.email || elements.adminEmail.value.trim(),
    }),
  );
}

function resetWorkspaceState() {
  stopVisualFrameLoop();
  state.activeView = 'ui';
  state.visualManifest = null;
  state.visualPublishedVersion = null;
  state.visualReleaseHistory = [];
  state.visualSelectedScreenId = 'level';
  state.visualSelectedElementId = 'header';
  state.visualConnectedDevices = [];
  state.visualActiveDeviceSerial = '';
  state.visualDeviceViewport = null;
  state.visualFrameDataUrl = '';
  state.visualHistoryPast = [];
  state.visualHistoryFuture = [];
  state.visualDirty = false;
  state.visualWorkspaceLoaded = false;
  state.adminWorkspaceLoaded = false;
  state.manifest = null;
  state.publishedVersion = null;
  state.releaseHistory = [];
  state.assets = [];
  state.selected = null;
}

async function enterWorkspace() {
  resetWorkspaceState();
  toggleLoginCard(false);
  elements.workspace.classList.remove('hidden');
  updateViewVisibility();
  setInlineStatus(
    elements.uiEditorStatusLine,
    '화면 초안을 불러오는 중입니다.',
  );
  setGlobalStatus('화면 편집기를 준비하는 중입니다.');
  renderAll();
  await loadVisualWorkspace();
  await setActiveView('ui');
  setStatus(elements.connectionStatus, '로그인됨');
  setGlobalStatus('화면 편집기를 불러왔습니다.', 'success');
}

async function initializeWorkspace(mode) {
  try {
    setStatus(elements.connectionStatus, '로그인 중...');
    await login(mode);
    await enterWorkspace();
  } catch (error) {
    console.error(error);
    setStatus(
      elements.connectionStatus,
      state.session?.user && state.profile?.is_admin
        ? '불러오기 실패'
        : '로그인 실패',
    );
    showToast(
      getErrorMessage(error, '로그인 또는 초기 불러오기에 실패했습니다.'),
    );
  }
}

async function restoreWorkspaceIfPossible(showFeedback = false) {
  try {
    await login('restore');
    await enterWorkspace();
    setStatus(elements.connectionStatus, '세션 복원됨');
    return true;
  } catch (error) {
    const message = getErrorMessage(error, '세션 복원에 실패했습니다.');
    if (message === '저장된 세션이 없습니다.') {
      setStatus(elements.connectionStatus, '미리보기 모드');
      if (showFeedback) {
        showToast('복원할 로그인 세션이 없습니다.');
      }
      return false;
    }
    console.error(error);
    setStatus(
      elements.connectionStatus,
      state.session?.user && state.profile?.is_admin
        ? '불러오기 실패'
        : '세션 복원 실패',
    );
    if (showFeedback) {
      showToast(message);
    }
    return false;
  }
}

function applyManifestJson() {
  try {
    state.manifest = JSON.parse(elements.manifestJson.value);
    state.adminWorkspaceLoaded = true;
    renderAll();
    bindDynamicEvents();
  } catch (_error) {
    showToast('JSON 형식이 올바르지 않습니다.');
  }
}

function syncCustomViewportFromInputs() {
  state.visualCustomViewport = sanitizeViewport({
    width: elements.visualViewportWidth.value,
    height: elements.visualViewportHeight.value,
    safeTop: elements.visualSafeTop.value,
    safeBottom: elements.visualSafeBottom.value,
  });
}

function commitVisualInspectorChange() {
  if (!state.visualManifest) {
    return;
  }
  pushVisualHistory();
  updateVisualRuleFromInputs();
  markVisualDirty();
  renderAll();
}

async function refreshPhoneFrameWithFeedback() {
  if (state.visualDeviceSource !== 'phone') {
    setInlineStatus(
      elements.visualStageStatus,
      '실제 폰 화면 모드에서만 새로 가져올 수 있습니다.',
    );
    return;
  }
  await refreshDeviceViewport(false);
  await refreshVisualLiveLayout(false);
  await refreshVisualFrame(true);
  renderAll();
}

async function initializePreviewWorkspace() {
  toggleLoginCard(false);
  elements.workspace.classList.remove('hidden');
  state.activeView = 'ui';
  state.visualManifest = createDefaultVisualManifest();
  state.visualPublishedVersion = null;
  state.visualReleaseHistory = [];
  state.visualSelectedScreenId = 'level';
  state.visualSelectedElementId = 'header';
  state.visualHistoryPast = [];
  state.visualHistoryFuture = [];
  state.visualDirty = false;
  state.visualWorkspaceLoaded = false;
  state.adminWorkspaceLoaded = false;
  state.manifest = null;
  state.publishedVersion = null;
  state.releaseHistory = [];
  state.assets = [];
  state.selected = null;
  setStatus(elements.connectionStatus, '미리보기 모드');
  setGlobalStatus(
    '로그인 없이 폰 화면 미리보기만 사용할 수 있습니다. 저장과 배포는 로그인 후 가능합니다.',
  );
  setInlineStatus(
    elements.uiEditorStatusLine,
    '미리보기 전용 모드입니다. 화면 확인과 위치 조정만 가능합니다.',
  );
  renderAll();

  try {
    await refreshConnectedDevices(false);
    if (
      state.visualDeviceSource === 'phone' &&
      state.visualActiveDeviceSerial
    ) {
      await refreshVisualFrame(false);
    }
  } catch (error) {
    setInlineStatus(
      elements.visualDeviceMeta,
      getErrorMessage(error, '기기 연결 상태를 확인하지 못했습니다.'),
      'error',
    );
  }

  renderAll();
}

function bindNavigationEvents() {
  elements.viewUiButton.addEventListener(
    'click',
    () => void setActiveView('ui'),
  );
  elements.viewAdminButton.addEventListener(
    'click',
    () => void setActiveView('admin'),
  );
  elements.viewHistoryButton.addEventListener(
    'click',
    () => void setActiveView('history'),
  );
  elements.viewSettingsButton.addEventListener(
    'click',
    () => void setActiveView('settings'),
  );
}

function bindVisualEvents() {
  elements.visualScreenId.addEventListener('change', async () => {
    state.visualSelectedScreenId = elements.visualScreenId.value;
    const screenElements = ELEMENT_DEFS[state.visualSelectedScreenId] ?? [];
    if (
      !screenElements.some(item => item.id === state.visualSelectedElementId)
    ) {
      state.visualSelectedElementId = screenElements[0]?.id || 'header';
    }
    if (
      state.visualDeviceSource === 'phone' &&
      state.visualActiveDeviceSerial
    ) {
      try {
        await refreshDeviceViewport(false);
        await refreshVisualLiveLayout(false);
        await refreshVisualFrame(false);
      } catch (error) {
        setInlineStatus(
          elements.visualDeviceMeta,
          getErrorMessage(
            error,
            '실제 기기 화면을 다시 동기화하지 못했습니다.',
          ),
          'error',
        );
      }
    }
    renderAll();
  });

  elements.visualDeviceSource.addEventListener('change', async () => {
    state.visualDeviceSource = elements.visualDeviceSource.value;
    if (state.visualDeviceSource === 'phone') {
      try {
        await refreshConnectedDevices(false);
        if (state.visualActiveDeviceSerial) {
          await refreshVisualFrame(false);
        }
      } catch (error) {
        setInlineStatus(
          elements.visualDeviceMeta,
          getErrorMessage(error, '실제 폰 연결을 확인하지 못했습니다.'),
          'error',
        );
      }
    } else {
      stopVisualFrameLoop();
    }
    renderAll();
  });

  elements.visualDeviceSelect.addEventListener('change', async () => {
    state.visualActiveDeviceSerial = elements.visualDeviceSelect.value;
    state.visualFrameDataUrl = '';
    try {
      await refreshDeviceViewport(false);
      await refreshVisualLiveLayout(false);
      if (
        state.visualDeviceSource === 'phone' &&
        state.visualActiveDeviceSerial
      ) {
        await refreshVisualFrame(false);
      }
    } catch (error) {
      setInlineStatus(
        elements.visualDeviceMeta,
        getErrorMessage(error, '기기 화면 정보를 업데이트하지 못했습니다.'),
        'error',
      );
    }
    renderAll();
  });

  elements.visualDeviceProfile.addEventListener('change', () => {
    state.visualDeviceProfileId = elements.visualDeviceProfile.value;
    renderAll();
  });

  [
    elements.visualViewportWidth,
    elements.visualViewportHeight,
    elements.visualSafeTop,
    elements.visualSafeBottom,
  ].forEach(input => {
    input.addEventListener('change', () => {
      syncCustomViewportFromInputs();
      renderAll();
    });
  });

  elements.visualRefreshDeviceButton.addEventListener('click', async () => {
    try {
      await refreshConnectedDevices(true);
      renderAll();
    } catch (error) {
      showToast(getErrorMessage(error, '기기 목록을 불러오지 못했습니다.'));
    }
  });

  elements.visualRefreshFrameButton.addEventListener('click', async () => {
    try {
      await refreshPhoneFrameWithFeedback();
    } catch (error) {
      showToast(getErrorMessage(error, '실제 폰 화면을 가져오지 못했습니다.'));
    }
  });

  elements.visualShowGrid.addEventListener('change', () => {
    state.visualShowGrid = elements.visualShowGrid.checked;
    renderAll();
  });

  elements.visualSnapGrid.addEventListener('change', () => {
    state.visualSnapGrid = elements.visualSnapGrid.checked;
    renderAll();
  });

  elements.visualGridSize.addEventListener('change', () => {
    state.visualGridSize = Math.max(
      1,
      Number(elements.visualGridSize.value) || 16,
    );
    renderAll();
  });

  elements.visualFitButton.addEventListener('click', () => {
    state.visualZoomMode = 'fit';
    renderAll();
  });

  elements.visualActualButton.addEventListener('click', () => {
    state.visualZoomMode = 'actual';
    renderAll();
  });

  window.addEventListener('focus', async () => {
    if (
      state.activeView !== 'ui' ||
      state.visualDeviceSource !== 'phone' ||
      !state.visualActiveDeviceSerial
    ) {
      return;
    }

    try {
      await refreshDeviceViewport(false);
      await refreshVisualLiveLayout(false);
      await refreshVisualFrame(false);
      renderVisualEditor();
    } catch {}
  });

  [
    elements.visualOffsetX,
    elements.visualOffsetY,
    elements.visualScale,
    elements.visualWidthScale,
    elements.visualHeightScale,
    elements.visualOpacity,
    elements.visualZIndex,
    elements.visualVisible,
  ].forEach(input => {
    input.addEventListener('change', commitVisualInspectorChange);
  });

  elements.visualSafeAware.addEventListener(
    'change',
    commitVisualInspectorChange,
  );

  elements.visualNudgeUp.addEventListener('click', () => nudgeVisual(0, -1));
  elements.visualNudgeDown.addEventListener('click', () => nudgeVisual(0, 1));
  elements.visualNudgeLeft.addEventListener('click', () => nudgeVisual(-1, 0));
  elements.visualNudgeRight.addEventListener('click', () => nudgeVisual(1, 0));
  elements.visualNudgeUpLarge.addEventListener('click', () =>
    nudgeVisual(0, -10),
  );
  elements.visualNudgeDownLarge.addEventListener('click', () =>
    nudgeVisual(0, 10),
  );
  elements.visualNudgeLeftLarge.addEventListener('click', () =>
    nudgeVisual(-10, 0),
  );
  elements.visualNudgeRightLarge.addEventListener('click', () =>
    nudgeVisual(10, 0),
  );

  elements.visualUndoButton.addEventListener('click', () => {
    const previous = state.visualHistoryPast.pop();
    if (!previous || !state.visualManifest) {
      return;
    }
    state.visualHistoryFuture.push(JSON.stringify(state.visualManifest));
    applyVisualHistorySnapshot(previous);
    renderAll();
  });

  elements.visualRedoButton.addEventListener('click', () => {
    const next = state.visualHistoryFuture.pop();
    if (!next || !state.visualManifest) {
      return;
    }
    state.visualHistoryPast.push(JSON.stringify(state.visualManifest));
    applyVisualHistorySnapshot(next);
    renderAll();
  });

  elements.visualResetButton.addEventListener('click', () => {
    if (!state.visualManifest) {
      return;
    }
    pushVisualHistory();
    const rule = getVisualSelectedRule();
    Object.assign(rule, cloneVisualValue(DEFAULT_RULE));
    markVisualDirty();
    renderAll();
  });

  elements.visualSaveDraftButton.addEventListener('click', async () => {
    if (!requireAdminAccess('화면 초안 저장')) {
      return;
    }
    try {
      await saveVisualDraft();
      renderAll();
      showToast('화면 초안을 저장했습니다.');
    } catch (error) {
      showToast(getErrorMessage(error, '화면 초안 저장에 실패했습니다.'));
    }
  });

  elements.visualPublishButton.addEventListener('click', async () => {
    if (!requireAdminAccess('화면 배포')) {
      return;
    }
    try {
      await publishVisualDraft();
      renderAll();
      showToast('화면 배포를 완료했습니다.');
    } catch (error) {
      showToast(getErrorMessage(error, '화면 배포에 실패했습니다.'));
    }
  });
}

function bindAdminEvents() {
  elements.refreshButton.addEventListener('click', async () => {
    if (!requireAdminAccess('관리자 데이터 새로고침')) {
      return;
    }
    try {
      await loadWorkspace();
      setGlobalStatus('관리자 데이터를 새로 불러왔습니다.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, '관리자 데이터를 불러오지 못했습니다.'));
    }
  });

  elements.saveDraftButton.addEventListener('click', async () => {
    if (!requireAdminAccess('관리자 초안 저장')) {
      return;
    }
    try {
      await saveDraft();
      await loadWorkspace();
      showToast('관리자 초안을 저장했습니다.');
    } catch (error) {
      showToast(getErrorMessage(error, '관리자 초안 저장에 실패했습니다.'));
    }
  });

  elements.publishButton.addEventListener('click', async () => {
    if (!requireAdminAccess('관리자 데이터 배포')) {
      return;
    }
    try {
      await publishDraft();
      await loadWorkspace();
      showToast('관리자 데이터 배포를 완료했습니다.');
    } catch (error) {
      showToast(getErrorMessage(error, '관리자 데이터 배포에 실패했습니다.'));
    }
  });

  elements.copyJsonButton.addEventListener('click', async () => {
    if (!requireAdminAccess('설정 JSON 복사')) {
      return;
    }
    await navigator.clipboard.writeText(elements.manifestJson.value);
    showToast('설정 JSON을 복사했습니다.');
  });

  elements.applyJsonButton.addEventListener('click', () => {
    if (!requireAdminAccess('설정 JSON 적용')) {
      return;
    }
    applyManifestJson();
  });

  elements.uploadAssetButton.addEventListener('click', async () => {
    if (!requireAdminAccess('이미지 업로드')) {
      return;
    }
    try {
      await uploadAsset();
      renderAll();
      bindDynamicEvents();
      showToast('이미지를 업로드했습니다.');
    } catch (error) {
      showToast(getErrorMessage(error, '이미지 업로드에 실패했습니다.'));
    }
  });

  elements.addLevelButton.addEventListener('click', () => {
    if (!requireAdminAccess('레벨 추가')) {
      return;
    }
    createLevelEntry();
    renderAll();
    bindDynamicEvents();
  });

  elements.addNormalRaidButton.addEventListener('click', () => {
    if (!requireAdminAccess('일반 레이드 추가')) {
      return;
    }
    createRaidEntry('raidNormal');
    renderAll();
    bindDynamicEvents();
  });

  elements.addBossRaidButton.addEventListener('click', () => {
    if (!requireAdminAccess('보스 레이드 추가')) {
      return;
    }
    createRaidEntry('raidBoss');
    renderAll();
    bindDynamicEvents();
  });

  elements.addEncounterButton.addEventListener('click', () => {
    if (!requireAdminAccess('적 템플릿 추가')) {
      return;
    }
    createEncounterEntry();
    renderAll();
    bindDynamicEvents();
  });

  elements.cloneButton.addEventListener('click', () => {
    if (!requireAdminAccess('항목 복제')) {
      return;
    }
    cloneSelected();
    renderAll();
    bindDynamicEvents();
  });

  elements.deleteButton.addEventListener('click', () => {
    if (!requireAdminAccess('항목 삭제')) {
      return;
    }
    deleteSelected();
    renderAll();
    bindDynamicEvents();
  });
}

function bindSharedEvents() {
  elements.logoutButton.addEventListener('click', async () => {
    if (!state.session?.user) {
      toggleLoginCard();
      return;
    }
    try {
      if (state.supabase) {
        await state.supabase.auth.signOut();
      }
    } finally {
      state.session = null;
      state.profile = null;
      resetWorkspaceState();
      void initializePreviewWorkspace();
    }
  });

  elements.settingsRefreshDevicesButton.addEventListener('click', async () => {
    try {
      await refreshConnectedDevices(true);
      renderAll();
    } catch (error) {
      showToast(getErrorMessage(error, '기기 목록을 불러오지 못했습니다.'));
    }
  });

  elements.settingsRefreshFrameButton.addEventListener('click', async () => {
    try {
      await refreshPhoneFrameWithFeedback();
    } catch (error) {
      showToast(getErrorMessage(error, '실제 폰 화면을 가져오지 못했습니다.'));
    }
  });

  window.addEventListener('keydown', event => {
    if (!state.visualManifest || state.activeView !== 'ui') {
      return;
    }
    const tagName = document.activeElement?.tagName || '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) {
      return;
    }
    const step = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      nudgeVisual(0, -step);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      nudgeVisual(0, step);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      nudgeVisual(-step, 0);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      nudgeVisual(step, 0);
    }
  });

  window.addEventListener('resize', () => {
    if (state.visualManifest) {
      renderAll();
    }
  });
}

async function launchLiveWorkTools() {
  if (!canLaunchLiveTool()) {
    throw new Error('데스크톱 EXE 환경에서만 사용할 수 있습니다.');
  }
  const result = await desktopBridge.launchUiStudioLive();
  if (!result?.ok) {
    throw new Error(result?.message || '실기 작업 도구 실행에 실패했습니다.');
  }
  return result.message || '실기 작업 도구를 실행했습니다.';
}

async function openUiStudioUrl() {
  if (desktopBridge && typeof desktopBridge.openExternal === 'function') {
    const result = await desktopBridge.openExternal('http://localhost:4173/');
    if (result?.ok === false) {
      throw new Error(result.message || 'UI Studio 주소를 열지 못했습니다.');
    }
    return;
  }
  window.open('http://localhost:4173/', '_blank', 'noopener,noreferrer');
}

async function bootstrap() {
  elements.supabaseUrl.value = DEFAULT_SUPABASE_URL;
  elements.supabaseAnonKey.value = DEFAULT_SUPABASE_ANON_KEY;
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved?.url) elements.supabaseUrl.value = saved.url;
  if (saved?.key) elements.supabaseAnonKey.value = saved.key;
  if (saved?.email) elements.adminEmail.value = saved.email;
  if (localDesktopConfig?.supabaseUrl)
    elements.supabaseUrl.value = localDesktopConfig.supabaseUrl;
  if (localDesktopConfig?.supabaseAnonKey)
    elements.supabaseAnonKey.value = localDesktopConfig.supabaseAnonKey;
  if (localDesktopConfig?.email)
    elements.adminEmail.value = localDesktopConfig.email;
  if (localDesktopConfig?.password)
    elements.adminPassword.value = localDesktopConfig.password;

  elements.visualScreenId.innerHTML = Object.entries(SCREEN_LABELS)
    .map(
      ([value, label]) =>
        `<option value="${value}" ${
          value === state.visualSelectedScreenId ? 'selected' : ''
        }>${label}</option>`,
    )
    .join('');
  elements.visualGridSize.value = String(state.visualGridSize);
  elements.visualShowGrid.checked = state.visualShowGrid;
  elements.visualSnapGrid.checked = state.visualSnapGrid;
  elements.visualDeviceSource.value = state.visualDeviceSource;
  syncCustomViewportFromInputs();
  updateViewVisibility();
  renderAll();
  bindVisualPointerEvents();
  bindNavigationEvents();
  bindVisualEvents();
  bindAdminEvents();
  bindSharedEvents();
  await initializePreviewWorkspace();

  elements.loginButton.addEventListener(
    'click',
    () => void initializeWorkspace('login'),
  );
  elements.restoreButton.addEventListener(
    'click',
    () => void restoreWorkspaceIfPossible(true),
  );

  const restored = await restoreWorkspaceIfPossible(false);
  if (
    !restored &&
    localDesktopConfig?.autoLogin !== false &&
    elements.adminEmail.value &&
    elements.adminPassword.value
  ) {
    await initializeWorkspace('login');
  }
}

void bootstrap();
