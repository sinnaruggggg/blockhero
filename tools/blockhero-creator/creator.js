import {createClient} from '@supabase/supabase-js';
import defaultCreatorManifest from './default-creator-manifest.json';

const DEFAULT_SUPABASE_URL = 'https://alhlmdhixmlmsdvgzhdu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImFsaGxtZGhpeG1sbXNkdmd6aGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTY4NTQsImV4cCI6MjA4ODYzMjg1NH0.lkTNn1jeXzkQdCRnmtNAjejezJN_RfC1n5HEhCbV_n8';
const STORAGE_KEY = 'blockhero-creator-auth-v1';
const DEFAULT_DRAFT_ID = 1;
const PATTERN_OPTIONS = ['basic_auto', 'burst_every_n', 'phase_hp_threshold', 'rage_after_time'];

const HELP_TEXT = {
  level: {
    title: '���� ��������',
    description: '���� ����� ��ǥ, �� ����, ���/����ġ ����, ����� �����մϴ�.',
    tips: [
      'enemyTemplateId�� �� ���ø� id�� ����˴ϴ�.',
      'firstClearBonusGold�� repeatGold�� �и��ؼ� ù Ŭ����� �ݺ� ������ �����ϴ�.',
      '��� assetKey�� ���� �ڻ� ���̺귯������ ���ε��� Ű�� �״�� ����մϴ�.',
    ],
  },
  raidNormal: {
    title: '�Ϲ� ���̵�',
    description: '��� ���� ������ �Ϲ� ���̵��� �̸�, ����, �ð� ����, ����� �����մϴ�.',
    tips: [
      'timeLimitMs�� ���� ���� �� ���� ���� �ð� ��꿡 ���˴ϴ�.',
      'repeatDiamondReward�� �Ϲ� ���̵� �ݺ� óġ �����Դϴ�.',
      'encounterOverrides�� Ư�� �ܰ踸 ü��/���ݷ�/������ ���� �ٲ� �� �ֽ��ϴ�.',
    ],
  },
  raidBoss: {
    title: '���� ���̵�',
    description: '���� ���̵� �ܰ躰 ���� �̸�, ���� �ο�, ���� â, �ð� ������ �����մϴ�.',
    tips: [
      'joinWindowMinutes�� ���� ���̵尡 ���� �� ���� ������ �ð��Դϴ�.',
      'maxParticipants�� ���� ���� ���̵� ���� ���ѿ� ����˴ϴ�.',
      'raidWindowHours�� UI �ȳ��� � �������� ���� ���˴ϴ�.',
    ],
  },
  encounter: {
    title: '�� ���ø�',
    description: '����/���̵尡 �������� �����ϴ� �� ���� �������Դϴ�.',
    tips: [
      '���������� override���� ���� ����Ǵ� �⺻���Դϴ�.',
      'attackPattern�� ���� ���ѵ� enum�� ����մϴ�.',
      'id�� ����⺸�� �� ���ø��� ����� ���Ḹ �ٲٴ� ���� �����մϴ�.',
    ],
  },
};

const $ = selector => document.querySelector(selector);

const elements = {
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
  manifestStatus: $('#manifestStatus'),
  userEmail: $('#userEmail'),
  draftVersion: $('#draftVersion'),
  publishedVersion: $('#publishedVersion'),
  assetCount: $('#assetCount'),
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
  supabase: null,
  session: null,
  profile: null,
  manifest: null,
  publishedVersion: null,
  releaseHistory: [],
  assets: [],
  selected: null,
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function showToast(message) {
  window.alert(message);
}

function setStatus(target, message) {
  target.textContent = message;
}

function slugify(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
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

function writePath(target, path, value) {
  const segments = path.split('.');
  let cursor = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (!Object.prototype.hasOwnProperty.call(cursor, segment) || cursor[segment] == null) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }
  cursor[segments[segments.length - 1]] = value;
}

function getAssetOptions(selectedKey = '') {
  const items = ['<option value="">����</option>'];
  state.assets.slice().sort((a, b) => a.asset_key.localeCompare(b.asset_key)).forEach(asset => {
    items.push(`<option value="${asset.asset_key}" ${selectedKey === asset.asset_key ? 'selected' : ''}>${asset.asset_key}</option>`);
  });
  return items.join('');
}
function renderHelpPanel() {
  const help = state.selected ? HELP_TEXT[state.selected.kind] ?? null : null;
  if (!help) {
    elements.helpPanel.innerHTML = `<div class="help-card"><strong>�޴� ���� ��� ��</strong><p>���� Ʈ������ �׸��� �����ϸ� �ش� �޴��� ���Ұ� ���� ���� ���⿡ ǥ�õ˴ϴ�.</p></div>`;
    return;
  }
  elements.helpPanel.innerHTML = `<div class="help-card"><strong>${help.title}</strong><p>${help.description}</p><ul>${help.tips.map(item => `<li>${item}</li>`).join('')}</ul></div>`;
}

function renderSummary(record) {
  if (!record || !state.selected) {
    elements.selectionSummary.innerHTML = `<div class="summary-card"><span>���� ����</span><strong>���� ��� �̼���</strong></div>`;
    return;
  }
  if (state.selected.kind === 'level') {
    elements.selectionSummary.innerHTML = `
      <div class="summary-card"><span>���� ID</span><strong>${record.levelId}</strong></div>
      <div class="summary-card"><span>���� / ��������</span><strong>${record.worldId}-${record.stageNumberInWorld}</strong></div>
      <div class="summary-card"><span>�� ���ø�</span><strong>${record.enemyTemplateId}</strong></div>
      <div class="summary-card"><span>��� ����</span><strong>${record.enabled ? 'Ȱ��' : '��Ȱ��'}</strong></div>`;
    return;
  }
  if (state.selected.kind === 'raidNormal' || state.selected.kind === 'raidBoss') {
    elements.selectionSummary.innerHTML = `
      <div class="summary-card"><span>���̵� ����</span><strong>${state.selected.kind === 'raidNormal' ? '�Ϲ�' : '����'}</strong></div>
      <div class="summary-card"><span>�ܰ�</span><strong>${record.stage}</strong></div>
      <div class="summary-card"><span>���ø�</span><strong>${record.encounterTemplateId}</strong></div>
      <div class="summary-card"><span>�ð� ����</span><strong>${Math.round(record.timeLimitMs / 1000)}��</strong></div>`;
    return;
  }
  elements.selectionSummary.innerHTML = `
    <div class="summary-card"><span>���ø� ID</span><strong>${record.id}</strong></div>
    <div class="summary-card"><span>����</span><strong>${record.kind === 'level' ? '���� ��' : '���̵� ��'}</strong></div>
    <div class="summary-card"><span>���� �ֱ�</span><strong>${record.attackIntervalMs}ms</strong></div>
    <div class="summary-card"><span>��� ����</span><strong>${record.enabled ? 'Ȱ��' : '��Ȱ��'}</strong></div>`;
}

function backgroundFields(path, value = {}) {
  return `
    <div class="section-card">
      <div><h3>���</h3><p>��� �̹����� ui_assets�� assetKey�� �����մϴ�. removeImage�� �Ѹ� tint�� ���� �� �ֽ��ϴ�.</p></div>
      <div class="field-grid">
        <label><span>assetKey</span><select data-path="${path}.background.assetKey">${getAssetOptions(value.assetKey ?? '')}</select></label>
        <label><span>tintColor</span><input data-path="${path}.background.tintColor" type="text" value="${value.tintColor ?? '#000000'}" /></label>
        <label><span>tintOpacity</span><input data-path="${path}.background.tintOpacity" type="number" step="0.05" min="0" max="1" value="${value.tintOpacity ?? 0}" /></label>
        <label><span>�̹��� ����</span><select data-path="${path}.background.removeImage"><option value="false" ${value.removeImage ? '' : 'selected'}>�ƴϿ�</option><option value="true" ${value.removeImage ? 'selected' : ''}>��</option></select></label>
      </div>
    </div>`;
}

function overrideFields(path, value = {}) {
  return `
    <div class="section-card">
      <div><h3>���������� �������̵�</h3><p>���ø��� �ǵ帮�� �ʰ� �� �������������� �ٸ��� ������ ���� �ֽ��ϴ�. �� ���� �⺻ ���ø��� �״�� ����մϴ�.</p></div>
      <div class="field-grid three">
        <label><span>ǥ�� �̸�</span><input data-path="${path}.encounterOverrides.displayName" type="text" value="${value.displayName ?? ''}" /></label>
        <label><span>���� �̸�</span><input data-path="${path}.encounterOverrides.monsterName" type="text" value="${value.monsterName ?? ''}" /></label>
        <label><span>�̸���</span><input data-path="${path}.encounterOverrides.monsterEmoji" type="text" value="${value.monsterEmoji ?? ''}" /></label>
        <label><span>����</span><input data-path="${path}.encounterOverrides.monsterColor" type="text" value="${value.monsterColor ?? ''}" /></label>
        <label><span>HP</span><input data-path="${path}.encounterOverrides.baseHp" type="number" value="${value.baseHp ?? ''}" /></label>
        <label><span>���ݷ�</span><input data-path="${path}.encounterOverrides.baseAttack" type="number" value="${value.baseAttack ?? ''}" /></label>
        <label><span>���� �ֱ�(ms)</span><input data-path="${path}.encounterOverrides.attackIntervalMs" type="number" value="${value.attackIntervalMs ?? ''}" /></label>
        <label><span>����</span><select data-path="${path}.encounterOverrides.attackPattern"><option value="" ${(value.attackPattern ?? '') === '' ? 'selected' : ''}>�⺻�� ���</option>${PATTERN_OPTIONS.map(option => `<option value="${option}" ${value.attackPattern === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
      </div>
    </div>`;
}

function renderLevelEditor(level) {
  const path = `levels.${level.id}`;
  return `
    <div class="section-card">
      <div><h3>�⺻ ����</h3><p>������, ����, �������� ��ȣ, �� ����, ��� ���θ� �����մϴ�.</p></div>
      <div class="field-grid three">
        <label><span>id</span><input type="text" value="${level.id}" disabled /></label>
        <label><span>levelId</span><input data-path="${path}.levelId" type="number" value="${level.levelId}" /></label>
        <label><span>�̸�</span><input data-path="${path}.name" type="text" value="${level.name}" /></label>
        <label><span>worldId</span><input data-path="${path}.worldId" type="number" value="${level.worldId}" /></label>
        <label><span>���� �� ��ȣ</span><input data-path="${path}.stageNumberInWorld" type="number" value="${level.stageNumberInWorld}" /></label>
        <label><span>goalValue</span><input data-path="${path}.goalValue" type="number" value="${level.goalValue}" /></label>
        <label><span>enemyTemplateId</span><select data-path="${path}.enemyTemplateId">${Object.values(state.manifest.encounters).sort((a, b) => a.id.localeCompare(b.id)).map(encounter => `<option value="${encounter.id}" ${encounter.id === level.enemyTemplateId ? 'selected' : ''}>${encounter.id}</option>`).join('')}</select></label>
        <label><span>���� ���̵� �ر� �ܰ�</span><input data-path="${path}.unlocksBossRaidStage" type="number" value="${level.unlocksBossRaidStage ?? ''}" /></label>
        <label><span>Ȱ��ȭ</span><select data-path="${path}.enabled"><option value="true" ${level.enabled ? 'selected' : ''}>Ȱ��</option><option value="false" ${level.enabled ? '' : 'selected'}>��Ȱ��</option></select></label>
      </div>
    </div>
    <div class="section-card"><div><h3>����</h3><p>ù Ŭ����� �ݺ� Ŭ���� ������ �и��ؼ� �����մϴ�.</p></div><div class="field-grid three"><label><span>repeatGold</span><input data-path="${path}.reward.repeatGold" type="number" value="${level.reward.repeatGold}" /></label><label><span>firstClearBonusGold</span><input data-path="${path}.reward.firstClearBonusGold" type="number" value="${level.reward.firstClearBonusGold}" /></label><label><span>characterExp</span><input data-path="${path}.reward.characterExp" type="number" value="${level.reward.characterExp}" /></label></div></div>
    ${overrideFields(path, level.enemyOverrides)}
    ${backgroundFields(path, level.background)}
    <div class="section-card"><div><h3>� �޸�</h3><p>�� ������������ ����� �޸��Դϴ�.</p></div><label><span>notes</span><textarea data-path="${path}.notes" rows="4">${level.notes ?? ''}</textarea></label></div>`;
}

function renderRaidEditor(raid, scope) {
  const path = `raids.${scope}.${raid.id}`;
  return `
    <div class="section-card">
      <div><h3>�⺻ ����</h3><p>���̵� �̸�, �ܰ�, ���� ���ø�, ����/�ð� ��Ģ�� �����մϴ�.</p></div>
      <div class="field-grid three">
        <label><span>id</span><input type="text" value="${raid.id}" disabled /></label>
        <label><span>�̸�</span><input data-path="${path}.name" type="text" value="${raid.name}" /></label>
        <label><span>stage</span><input data-path="${path}.stage" type="number" value="${raid.stage}" /></label>
        <label><span>worldId</span><input data-path="${path}.worldId" type="number" value="${raid.worldId ?? ''}" /></label>
        <label><span>timeLimitMs</span><input data-path="${path}.timeLimitMs" type="number" value="${raid.timeLimitMs}" /></label>
        <label><span>raidWindowHours</span><input data-path="${path}.raidWindowHours" type="number" value="${raid.raidWindowHours}" /></label>
        <label><span>joinWindowMinutes</span><input data-path="${path}.joinWindowMinutes" type="number" value="${raid.joinWindowMinutes}" /></label>
        <label><span>maxParticipants</span><input data-path="${path}.maxParticipants" type="number" value="${raid.maxParticipants}" /></label>
        <label><span>encounterTemplateId</span><select data-path="${path}.encounterTemplateId">${Object.values(state.manifest.encounters).sort((a, b) => a.id.localeCompare(b.id)).map(encounter => `<option value="${encounter.id}" ${encounter.id === raid.encounterTemplateId ? 'selected' : ''}>${encounter.id}</option>`).join('')}</select></label>
        <label><span>Ȱ��ȭ</span><select data-path="${path}.enabled"><option value="true" ${raid.enabled ? 'selected' : ''}>Ȱ��</option><option value="false" ${raid.enabled ? '' : 'selected'}>��Ȱ��</option></select></label>
      </div>
    </div>
    <div class="section-card"><div><h3>����</h3><p>ù Ŭ����� �ݺ� ������ ���� �����մϴ�.</p></div><div class="field-grid"><label><span>firstClearDiamondReward</span><input data-path="${path}.reward.firstClearDiamondReward" type="number" value="${raid.reward.firstClearDiamondReward}" /></label><label><span>repeatDiamondReward</span><input data-path="${path}.reward.repeatDiamondReward" type="number" value="${raid.reward.repeatDiamondReward}" /></label></div></div>
    ${overrideFields(path, raid.encounterOverrides)}
    ${backgroundFields(path, raid.background)}
    <div class="section-card"><div><h3>� �޸�</h3><p>���̵� ��ȹ �޸� ����ϴ�.</p></div><label><span>notes</span><textarea data-path="${path}.notes" rows="4">${raid.notes ?? ''}</textarea></label></div>`;
}

function renderEncounterEditor(encounter) {
  const path = `encounters.${encounter.id}`;
  return `
    <div class="section-card">
      <div><h3>���ø� ����</h3><p>����/���̵尡 �������� �����ϴ� �� ���� �������Դϴ�.</p></div>
      <div class="field-grid three">
        <label><span>id</span><input type="text" value="${encounter.id}" disabled /></label>
        <label><span>ǥ�� �̸�</span><input data-path="${path}.displayName" type="text" value="${encounter.displayName}" /></label>
        <label><span>���� �̸�</span><input data-path="${path}.monsterName" type="text" value="${encounter.monsterName}" /></label>
        <label><span>�̸���</span><input data-path="${path}.monsterEmoji" type="text" value="${encounter.monsterEmoji}" /></label>
        <label><span>����</span><input data-path="${path}.monsterColor" type="text" value="${encounter.monsterColor}" /></label>
        <label><span>tier</span><select data-path="${path}.tier">${['normal', 'elite', 'boss'].map(value => `<option value="${value}" ${encounter.tier === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
        <label><span>baseHp</span><input data-path="${path}.baseHp" type="number" value="${encounter.baseHp}" /></label>
        <label><span>baseAttack</span><input data-path="${path}.baseAttack" type="number" value="${encounter.baseAttack}" /></label>
        <label><span>attackIntervalMs</span><input data-path="${path}.attackIntervalMs" type="number" value="${encounter.attackIntervalMs}" /></label>
        <label><span>attackPattern</span><select data-path="${path}.attackPattern">${PATTERN_OPTIONS.map(option => `<option value="${option}" ${encounter.attackPattern === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
        <label><span>kind</span><select data-path="${path}.kind"><option value="level" ${encounter.kind === 'level' ? 'selected' : ''}>level</option><option value="raid" ${encounter.kind === 'raid' ? 'selected' : ''}>raid</option></select></label>
        <label><span>Ȱ��ȭ</span><select data-path="${path}.enabled"><option value="true" ${encounter.enabled ? 'selected' : ''}>Ȱ��</option><option value="false" ${encounter.enabled ? '' : 'selected'}>��Ȱ��</option></select></label>
      </div>
    </div>
    <div class="section-card"><div><h3>� �޸�</h3><p>���� ���� �ǵ��� ����� �������� �޸� ����ϴ�.</p></div><label><span>notes</span><textarea data-path="${path}.notes" rows="4">${encounter.notes ?? ''}</textarea></label></div>`;
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
        ${items.map(item => {
          const active = state.selected?.kind === kind && state.selected?.id === item.id ? 'active' : '';
          const label = kind === 'level' ? `${item.levelId}. ${item.name}` : kind === 'encounter' ? `${item.displayName} (${item.id})` : `${item.stage}�ܰ� ${item.name}`;
          return `<button class="tree-item ${active}" data-kind="${kind}" data-id="${item.id}">${label}</button>`;
        }).join('')}
      </div>
    </section>`;

  elements.contentTree.innerHTML = [
    buildGroup('���� ��������', Object.values(state.manifest.levels).sort((a, b) => a.levelId - b.levelId), 'level'),
    buildGroup('�Ϲ� ���̵�', Object.values(state.manifest.raids.normal).sort((a, b) => a.stage - b.stage), 'raidNormal'),
    buildGroup('���� ���̵�', Object.values(state.manifest.raids.boss).sort((a, b) => a.stage - b.stage), 'raidBoss'),
    buildGroup('�� ���ø�', Object.values(state.manifest.encounters).sort((a, b) => a.id.localeCompare(b.id)), 'encounter'),
  ].join('');
}

function renderAssets() {
  elements.assetCount.textContent = String(state.assets.length);
  if (!state.assets.length) {
    elements.assetLibrary.innerHTML = `<div class="asset-card"><strong>��ϵ� �ڻ��� �����ϴ�.</strong><p>��� �̹����� ���ε��ϸ� ���⼭ assetKey�� Ȯ���ϰ� ����/���̵� ��濡 ������ �� �ֽ��ϴ�.</p></div>`;
    return;
  }
  elements.assetLibrary.innerHTML = state.assets.slice().sort((a, b) => a.asset_key.localeCompare(b.asset_key)).map(asset => `
    <div class="asset-card">
      <strong class="mono">${asset.asset_key}</strong>
      <img class="asset-preview" src="${asset.data_url}" alt="${asset.asset_key}" />
      <div class="asset-meta"><span>${asset.mime_type || 'image/*'}</span><span>${asset.content_hash || '-'}</span></div>
    </div>`).join('');
}

function renderReleaseHistory() {
  if (!state.releaseHistory.length) {
    elements.releaseHistory.innerHTML = `<div class="release-card"><strong>������ �̷��� �����ϴ�.</strong><p>���� creator publish�� �� ���� �̷����� �ʾҽ��ϴ�.</p></div>`;
    return;
  }
  elements.releaseHistory.innerHTML = state.releaseHistory.map(release => `
    <div class="release-card">
      <strong>v${release.version}</strong>
      <p>${release.notes || '�޸� ����'}</p>
      <div class="release-meta"><span>${new Date(release.created_at).toLocaleString('ko-KR')}</span><button class="ghost small rollback-button" data-version="${release.version}">�� �������� �ѹ�</button></div>
    </div>`).join('');
}

function updateManifestTextarea() {
  elements.manifestJson.value = state.manifest ? JSON.stringify(state.manifest, null, 2) : '';
}

function renderEditor() {
  const record = getSelectedRecord();
  renderSummary(record);
  renderHelpPanel();
  if (!record || !state.selected) {
    elements.editorTitle.textContent = '�׸��� �����ϼ���';
    elements.editorSubtitle.textContent = '���� Ʈ������ ����, ���̵�, �� ���ø� �� �ϳ��� ����� �� �����Ⱑ �����ϴ�.';
    elements.editorForm.className = 'editor-form empty-state';
    elements.editorForm.innerHTML = '<p>���ʿ��� �׸��� �����ϸ� ���⿡�� ���� ��ġ�� ������ �� �ֽ��ϴ�.</p>';
    return;
  }

  elements.editorForm.className = 'editor-form';
  if (state.selected.kind === 'level') {
    elements.editorTitle.textContent = `���� ${record.levelId} ����`;
    elements.editorSubtitle.textContent = '���� �ڵ� ��� ���������� draft�� ������ �� ��� ��ġ�� �����մϴ�.';
    elements.editorForm.innerHTML = renderLevelEditor(record);
  } else if (state.selected.kind === 'raidNormal' || state.selected.kind === 'raidBoss') {
    elements.editorTitle.textContent = `${state.selected.kind === 'raidNormal' ? '�Ϲ�' : '����'} ���̵� ${record.stage}�ܰ� ����`;
    elements.editorSubtitle.textContent = '���̵� �κ�� ���� ȭ���� �� �����͸� �������� �̸�, HP, ���, ���� ������ �н��ϴ�.';
    elements.editorForm.innerHTML = renderRaidEditor(record, state.selected.kind === 'raidNormal' ? 'normal' : 'boss');
  } else {
    elements.editorTitle.textContent = `�� ���ø� ${record.id}`;
    elements.editorSubtitle.textContent = '���⼭ �ٲ� ���� ����� ����/���̵尡 �������� ����ϰ�, ���������� override�� ������ �� ���� �켱�մϴ�.';
    elements.editorForm.innerHTML = renderEncounterEditor(record);
  }
}

function renderAll() {
  setStatus(elements.manifestStatus, state.manifest ? `draft v${getManifestVersion(state.manifest)}` : 'manifest ����');
  elements.userEmail.textContent = state.profile?.email || state.session?.user?.email || '-';
  elements.draftVersion.textContent = state.manifest ? `v${getManifestVersion(state.manifest)}` : '-';
  elements.publishedVersion.textContent = state.publishedVersion ? `v${state.publishedVersion}` : '-';
  renderTree();
  renderEditor();
  renderAssets();
  renderReleaseHistory();
  updateManifestTextarea();
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
      state.selected = {kind: button.dataset.kind, id: button.dataset.id};
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

  elements.releaseHistory.querySelectorAll('.rollback-button').forEach(button => {
    button.addEventListener('click', async () => {
      const version = Number(button.dataset.version);
      if (!window.confirm(`v${version} ������� �� ����� ����� �ѹ��ұ��?`)) {
        return;
      }
      try {
        await rollbackRelease(version);
      } catch (error) {
        showToast(error.message || '�ѹ鿡 �����߽��ϴ�.');
      }
    });
  });
}
async function ensureClient() {
  if (state.supabase) {
    return state.supabase;
  }
  const url = elements.supabaseUrl.value.trim() || DEFAULT_SUPABASE_URL;
  const key = elements.supabaseAnonKey.value.trim() || DEFAULT_SUPABASE_ANON_KEY;
  state.supabase = createClient(url, key, {auth: {persistSession: true, autoRefreshToken: true}});
  return state.supabase;
}

async function fetchProfile(userId) {
  const {data, error} = await state.supabase.from('profiles').select('id, nickname, is_admin').eq('id', userId).maybeSingle();
  if (error) throw error;
  return {email: state.session?.user?.email, ...data};
}

async function loadDefaultManifest() {
  return deepClone(defaultCreatorManifest);
}

async function fetchDraft() {
  const {data, error} = await state.supabase.from('creator_draft').select('id, manifest_json, updated_at').eq('id', DEFAULT_DRAFT_ID).maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchLatestRelease() {
  const {data, error} = await state.supabase.from('creator_releases').select('version, manifest_json, notes, created_at').order('version', {ascending: false}).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchReleaseHistory() {
  const {data, error} = await state.supabase.from('creator_releases').select('version, notes, created_at').order('version', {ascending: false}).limit(12);
  if (error) throw error;
  return data ?? [];
}

async function fetchAssets() {
  const {data, error} = await state.supabase.from('ui_assets').select('asset_key, data_url, mime_type, content_hash').order('asset_key', {ascending: true});
  if (error) throw error;
  return data ?? [];
}

async function saveDraft() {
  const {error} = await state.supabase.from('creator_draft').upsert({id: DEFAULT_DRAFT_ID, manifest_json: deepClone(state.manifest), updated_by: state.session.user.id}, {onConflict: 'id'});
  if (error) throw error;
}

async function publishDraft() {
  const latest = await fetchLatestRelease();
  const nextVersion = Number(latest?.version || 0) + 1;
  const payload = deepClone(state.manifest);
  payload.version = nextVersion;
  payload.meta = {...(payload.meta || {}), generatedAt: new Date().toISOString(), seededFromCode: false, notes: elements.publishNotes.value.trim() || ''};
  const {error} = await state.supabase.from('creator_releases').insert({version: nextVersion, manifest_json: payload, notes: elements.publishNotes.value.trim() || null, created_by: state.session.user.id});
  if (error) throw error;
  state.manifest = payload;
  await saveDraft();
  elements.publishNotes.value = '';
}

async function rollbackRelease(version) {
  const {data, error} = await state.supabase.from('creator_releases').select('version, manifest_json').eq('version', version).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`v${version} ����� ã�� ���߽��ϴ�.`);
  state.manifest = deepClone(data.manifest_json);
  await saveDraft();
  elements.publishNotes.value = `Rollback to v${version}`;
  await publishDraft();
  await loadWorkspace();
}

function createLevelEntry() {
  const nextLevelId = Math.max(0, ...Object.values(state.manifest.levels).map(level => level.levelId)) + 1;
  const id = `level_${nextLevelId}`;
  state.manifest.levels[id] = {
    id,
    levelId: nextLevelId,
    worldId: Math.max(1, Math.ceil(nextLevelId / 30)),
    stageNumberInWorld: ((nextLevelId - 1) % 30) + 1,
    name: `�� ���� ${nextLevelId}`,
    goalType: 'defeat_enemy',
    goalValue: 1000,
    enemyTemplateId: Object.keys(state.manifest.encounters)[0],
    enemyOverrides: {},
    reward: {repeatGold: 100, firstClearBonusGold: 200, characterExp: 300},
    enabled: true,
    background: {assetKey: null, tintColor: '#000000', tintOpacity: 0, removeImage: false},
  };
  state.selected = {kind: 'level', id};
}

function createRaidEntry(kind) {
  const scope = kind === 'raidNormal' ? state.manifest.raids.normal : state.manifest.raids.boss;
  const nextStage = Math.max(0, ...Object.values(scope).map(raid => raid.stage)) + 1;
  const id = `${kind === 'raidNormal' ? 'normal' : 'boss'}_${nextStage}`;
  scope[id] = {
    id,
    raidType: kind === 'raidNormal' ? 'normal' : 'boss',
    stage: nextStage,
    worldId: kind === 'raidBoss' ? nextStage : null,
    name: `${kind === 'raidNormal' ? '�Ϲ� ���̵�' : '���� ���̵�'} ${nextStage}`,
    encounterTemplateId: Object.keys(state.manifest.encounters)[0],
    encounterOverrides: {},
    reward: {firstClearDiamondReward: 20, repeatDiamondReward: 2},
    timeLimitMs: kind === 'raidNormal' ? 900000 : 600000,
    raidWindowHours: 4,
    joinWindowMinutes: 10,
    maxParticipants: 4,
    enabled: true,
    background: {assetKey: null, tintColor: '#000000', tintOpacity: 0, removeImage: false},
  };
  state.selected = {kind, id};
}

function createEncounterEntry() {
  const nextId = slugify(window.prompt('�� �� ���ø� id�� �Է��ϼ���.', 'encounter_new') || '');
  if (!nextId) return;
  if (state.manifest.encounters[nextId]) {
    showToast('�̹� ���� id�� ���ø��� �ֽ��ϴ�.');
    return;
  }
  state.manifest.encounters[nextId] = {
    id: nextId,
    kind: 'level',
    displayName: '�� ��',
    tier: 'normal',
    monsterName: '�� ��',
    monsterEmoji: '??',
    monsterColor: '#60a5fa',
    baseHp: 1000,
    baseAttack: 20,
    attackIntervalMs: 5000,
    attackPattern: 'basic_auto',
    enabled: true,
  };
  state.selected = {kind: 'encounter', id: nextId};
}
function cloneSelected() {
  const record = getSelectedRecord();
  if (!record || !state.selected) return;
  if (state.selected.kind === 'level') {
    const nextLevelId = Math.max(0, ...Object.values(state.manifest.levels).map(level => level.levelId)) + 1;
    const id = `level_${nextLevelId}`;
    state.manifest.levels[id] = {...deepClone(record), id, levelId: nextLevelId, name: `${record.name} ���纻`};
    state.selected = {kind: 'level', id};
    return;
  }
  if (state.selected.kind === 'raidNormal' || state.selected.kind === 'raidBoss') {
    const scope = state.selected.kind === 'raidNormal' ? state.manifest.raids.normal : state.manifest.raids.boss;
    const nextStage = Math.max(0, ...Object.values(scope).map(raid => raid.stage)) + 1;
    const id = `${state.selected.kind === 'raidNormal' ? 'normal' : 'boss'}_${nextStage}`;
    scope[id] = {...deepClone(record), id, stage: nextStage, name: `${record.name} ���纻`};
    state.selected = {kind: state.selected.kind, id};
    return;
  }
  const nextId = `${record.id}_copy`;
  state.manifest.encounters[nextId] = {...deepClone(record), id: nextId, displayName: `${record.displayName} ���纻`};
  state.selected = {kind: 'encounter', id: nextId};
}

function deleteSelected() {
  if (!state.selected || !window.confirm('������ �׸��� �����ұ��?')) return;
  if (state.selected.kind === 'level') delete state.manifest.levels[state.selected.id];
  else if (state.selected.kind === 'raidNormal') delete state.manifest.raids.normal[state.selected.id];
  else if (state.selected.kind === 'raidBoss') delete state.manifest.raids.boss[state.selected.id];
  else delete state.manifest.encounters[state.selected.id];
  state.selected = null;
}

async function uploadAsset() {
  const file = elements.assetFileInput.files?.[0];
  if (!file) {
    showToast('���ε��� �̹����� ���� �����ϼ���.');
    return;
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('�̹��� �б⿡ �����߽��ϴ�.'));
    reader.readAsDataURL(file);
  });
  const assetKey = elements.assetKeyInput.value.trim() || slugify(file.name.replace(/\.[^.]+$/, '')) || `asset_${Date.now()}`;
  const {error} = await state.supabase.from('ui_assets').upsert({asset_key: assetKey, data_url: dataUrl, mime_type: file.type || null, content_hash: String(file.lastModified), updated_by: state.session.user.id}, {onConflict: 'asset_key'});
  if (error) throw error;
  elements.assetKeyInput.value = assetKey;
  elements.assetFileInput.value = '';
  state.assets = await fetchAssets();
  renderAssets();
}

async function loadWorkspace() {
  const [draft, latestRelease, releaseHistory, assets] = await Promise.all([fetchDraft(), fetchLatestRelease(), fetchReleaseHistory(), fetchAssets()]);
  state.assets = assets;
  state.releaseHistory = releaseHistory;
  state.publishedVersion = latestRelease?.version ?? null;
  if (draft?.manifest_json) state.manifest = deepClone(draft.manifest_json);
  else if (latestRelease?.manifest_json) state.manifest = deepClone(latestRelease.manifest_json);
  else {
    state.manifest = await loadDefaultManifest();
    await saveDraft();
  }
  if (!state.selected) {
    const firstLevel = Object.values(state.manifest.levels).sort((a, b) => a.levelId - b.levelId)[0];
    if (firstLevel) state.selected = {kind: 'level', id: firstLevel.id};
  }
  renderAll();
  bindDynamicEvents();
}

async function login(mode) {
  await ensureClient();
  if (mode === 'restore') {
    const {data} = await state.supabase.auth.getSession();
    if (!data.session) throw new Error('���� ������ ������ �����ϴ�.');
    state.session = data.session;
  } else {
    const {data, error} = await state.supabase.auth.signInWithPassword({email: elements.adminEmail.value.trim(), password: elements.adminPassword.value});
    if (error) throw error;
    state.session = data.session;
  }
  state.profile = await fetchProfile(state.session.user.id);
  if (!state.profile?.is_admin) throw new Error('������ ������ ���� �����Դϴ�.');
  localStorage.setItem(STORAGE_KEY, JSON.stringify({url: elements.supabaseUrl.value.trim(), key: elements.supabaseAnonKey.value.trim(), email: elements.adminEmail.value.trim()}));
}

async function initializeWorkspace(mode) {
  try {
    setStatus(elements.connectionStatus, '���� ��...');
    await login(mode);
    elements.loginCard.classList.add('hidden');
    elements.workspace.classList.remove('hidden');
    setStatus(elements.connectionStatus, '�����');
    await loadWorkspace();
  } catch (error) {
    console.error(error);
    setStatus(elements.connectionStatus, '���� ����');
    showToast(error.message || '�α��� �Ǵ� �ҷ����⿡ �����߽��ϴ�.');
  }
}

function applyManifestJson() {
  try {
    state.manifest = JSON.parse(elements.manifestJson.value);
    renderAll();
    bindDynamicEvents();
  } catch (error) {
    showToast(`JSON �Ľ� ����: ${error.message}`);
  }
}

async function bootstrap() {
  elements.supabaseUrl.value = DEFAULT_SUPABASE_URL;
  elements.supabaseAnonKey.value = DEFAULT_SUPABASE_ANON_KEY;
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved?.url) elements.supabaseUrl.value = saved.url;
  if (saved?.key) elements.supabaseAnonKey.value = saved.key;
  if (saved?.email) elements.adminEmail.value = saved.email;

  elements.loginButton.addEventListener('click', () => void initializeWorkspace('login'));
  elements.restoreButton.addEventListener('click', () => void initializeWorkspace('restore'));
  elements.refreshButton.addEventListener('click', () => void loadWorkspace());
  elements.saveDraftButton.addEventListener('click', async () => { try { await saveDraft(); showToast('Draft�� �����߽��ϴ�.'); await loadWorkspace(); } catch (error) { showToast(error.message || 'Draft ���忡 �����߽��ϴ�.'); } });
  elements.publishButton.addEventListener('click', async () => { try { await publishDraft(); showToast('�� creator release�� publish�߽��ϴ�.'); await loadWorkspace(); } catch (error) { showToast(error.message || 'Publish�� �����߽��ϴ�.'); } });
  elements.logoutButton.addEventListener('click', async () => { if (state.supabase) await state.supabase.auth.signOut(); state.session = null; state.profile = null; state.manifest = null; state.selected = null; elements.workspace.classList.add('hidden'); elements.loginCard.classList.remove('hidden'); setStatus(elements.connectionStatus, '���� �� ��'); });
  elements.copyJsonButton.addEventListener('click', async () => { await navigator.clipboard.writeText(elements.manifestJson.value); showToast('Manifest JSON�� �����߽��ϴ�.'); });
  elements.applyJsonButton.addEventListener('click', applyManifestJson);
  elements.uploadAssetButton.addEventListener('click', async () => { try { await uploadAsset(); showToast('�̹����� ���ε��߽��ϴ�.'); renderAll(); bindDynamicEvents(); } catch (error) { showToast(error.message || '�̹��� ���ε忡 �����߽��ϴ�.'); } });
  elements.addLevelButton.addEventListener('click', () => { createLevelEntry(); renderAll(); bindDynamicEvents(); });
  elements.addNormalRaidButton.addEventListener('click', () => { createRaidEntry('raidNormal'); renderAll(); bindDynamicEvents(); });
  elements.addBossRaidButton.addEventListener('click', () => { createRaidEntry('raidBoss'); renderAll(); bindDynamicEvents(); });
  elements.addEncounterButton.addEventListener('click', () => { createEncounterEntry(); renderAll(); bindDynamicEvents(); });
  elements.cloneButton.addEventListener('click', () => { cloneSelected(); renderAll(); bindDynamicEvents(); });
  elements.deleteButton.addEventListener('click', () => { deleteSelected(); renderAll(); bindDynamicEvents(); });

  await initializeWorkspace('restore');
}

void bootstrap();


