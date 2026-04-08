const DEFAULT_REFERENCE_VIEWPORT = {
  width: 412,
  height: 915,
  safeTop: 34,
  safeBottom: 34,
};

const DEVICE_PROFILES = [
  {id: 'current-shape', label: 'Current Shape (manual)', viewport: DEFAULT_REFERENCE_VIEWPORT},
  {id: 'galaxy-s23-ultra', label: 'Galaxy S23 Ultra', viewport: {width: 412, height: 915, safeTop: 34, safeBottom: 34}},
  {id: 'galaxy-a54', label: 'Galaxy A54', viewport: {width: 411, height: 891, safeTop: 32, safeBottom: 24}},
  {id: 'galaxy-fold-cover', label: 'Galaxy Fold Cover', viewport: {width: 360, height: 780, safeTop: 30, safeBottom: 24}},
  {id: 'iphone-15-pro', label: 'iPhone 15 Pro', viewport: {width: 393, height: 852, safeTop: 59, safeBottom: 34}},
  {id: 'iphone-15-pro-max', label: 'iPhone 15 Pro Max', viewport: {width: 430, height: 932, safeTop: 59, safeBottom: 34}},
  {id: 'custom', label: 'Custom', viewport: DEFAULT_REFERENCE_VIEWPORT},
];

const SCREEN_LABELS = {
  level: '레벨 모드',
  endless: '무한 모드',
  battle: '대전 모드',
  raid: '레이드 모드',
};

const ELEMENTS = {
  level: ['header', 'battle_lane', 'board', 'piece_tray', 'item_bar', 'combo_gauge'],
  endless: ['header', 'status_bar', 'summon_panel', 'next_preview', 'board', 'piece_tray', 'item_bar', 'combo_gauge'],
  battle: ['back_button', 'opponent_panel', 'attack_bar', 'board', 'piece_tray'],
  raid: ['top_panel', 'skill_bar', 'info_bar', 'board', 'piece_tray', 'combo_gauge'],
};

const DEFAULT_RULE = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  opacity: 1,
  visible: true,
  zIndex: 0,
  safeAreaAware: false,
};

const DEFAULT_MANIFEST = {
  version: 0,
  referenceViewport: {...DEFAULT_REFERENCE_VIEWPORT},
  screens: {
    level: {
      elements: Object.fromEntries(ELEMENTS.level.map(id => [id, {...DEFAULT_RULE}])),
      backgrounds: {byWorld: {}, byLevel: {}},
    },
    endless: {
      elements: Object.fromEntries(ELEMENTS.endless.map(id => [id, {...DEFAULT_RULE}])),
    },
    battle: {
      elements: Object.fromEntries(ELEMENTS.battle.map(id => [id, {...DEFAULT_RULE}])),
    },
    raid: {
      elements: Object.fromEntries(ELEMENTS.raid.map(id => [id, {...DEFAULT_RULE}])),
      backgrounds: {byBossStage: {}},
    },
  },
};

const PREVIEW_LAYOUT = {
  level: {
    header: {left: 14, top: 54, width: 384, height: 72},
    battle_lane: {left: 18, top: 132, width: 376, height: 112},
    board: {left: 34, top: 260, width: 344, height: 344},
    piece_tray: {left: 18, top: 682, width: 376, height: 120},
    item_bar: {left: 30, top: 814, width: 352, height: 68},
    combo_gauge: {left: 106, top: 274, width: 200, height: 48},
  },
  endless: {
    header: {left: 14, top: 42, width: 384, height: 96},
    status_bar: {left: 22, top: 148, width: 366, height: 52},
    summon_panel: {left: 22, top: 208, width: 366, height: 64},
    next_preview: {left: 22, top: 280, width: 366, height: 72},
    board: {left: 34, top: 360, width: 344, height: 344},
    piece_tray: {left: 18, top: 724, width: 376, height: 120},
    item_bar: {left: 30, top: 850, width: 352, height: 48},
    combo_gauge: {left: 106, top: 374, width: 200, height: 48},
  },
  battle: {
    back_button: {left: 16, top: 48, width: 70, height: 60},
    opponent_panel: {left: 98, top: 54, width: 220, height: 178},
    attack_bar: {left: 22, top: 244, width: 368, height: 82},
    board: {left: 34, top: 344, width: 344, height: 344},
    piece_tray: {left: 18, top: 716, width: 376, height: 120},
  },
  raid: {
    top_panel: {left: 12, top: 36, width: 388, height: 208},
    skill_bar: {left: 20, top: 254, width: 372, height: 56},
    info_bar: {left: 20, top: 318, width: 372, height: 54},
    board: {left: 34, top: 392, width: 344, height: 344},
    piece_tray: {left: 18, top: 760, width: 376, height: 120},
    combo_gauge: {left: 106, top: 406, width: 200, height: 48},
  },
};

const state = {
  manifest: clone(DEFAULT_MANIFEST),
  screenId: 'level',
  elementId: 'header',
  profileId: 'current-shape',
};

const $ = selector => document.querySelector(selector);
const byId = id => document.getElementById(id);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getRule(screenId, elementId) {
  return state.manifest.screens[screenId].elements[elementId];
}

function getViewport() {
  if (state.profileId === 'custom') {
    return {
      width: Number(byId('viewport-width').value) || DEFAULT_REFERENCE_VIEWPORT.width,
      height: Number(byId('viewport-height').value) || DEFAULT_REFERENCE_VIEWPORT.height,
      safeTop: Number(byId('safe-top').value) || 0,
      safeBottom: Number(byId('safe-bottom').value) || 0,
    };
  }
  return DEVICE_PROFILES.find(profile => profile.id === state.profileId)?.viewport ?? DEFAULT_REFERENCE_VIEWPORT;
}

function syncViewportInputs(viewport) {
  byId('viewport-width').value = String(viewport.width);
  byId('viewport-height').value = String(viewport.height);
  byId('safe-top').value = String(viewport.safeTop);
  byId('safe-bottom').value = String(viewport.safeBottom);
  byId('viewport-meta').textContent = `${viewport.width} x ${viewport.height} · safe ${viewport.safeTop}/${viewport.safeBottom}`;
}

function applyElementFields() {
  const rule = getRule(state.screenId, state.elementId);
  byId('offset-x').value = String(rule.offsetX);
  byId('offset-y').value = String(rule.offsetY);
  byId('scale').value = String(rule.scale);
  byId('opacity').value = String(rule.opacity);
  byId('z-index').value = String(rule.zIndex);
  byId('visible').checked = rule.visible;
  byId('safe-aware').checked = !!rule.safeAreaAware;
  byId('workspace-title').textContent = `${SCREEN_LABELS[state.screenId]} / ${state.elementId}`;
}

function renderPreview() {
  const viewport = getViewport();
  const canvas = byId('preview-canvas');
  const frame = byId('device-frame');
  const scale = Math.min(1, (window.innerHeight - 160) / viewport.height, (window.innerWidth - 520) / viewport.width);

  frame.style.width = `${viewport.width * scale}px`;
  frame.style.height = `${viewport.height * scale}px`;
  canvas.style.transform = `scale(${scale})`;
  canvas.style.transformOrigin = 'top left';
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  byId('safe-top-overlay').style.height = `${viewport.safeTop * scale}px`;
  byId('safe-bottom-overlay').style.height = `${viewport.safeBottom * scale}px`;

  canvas.innerHTML = '';

  Object.entries(PREVIEW_LAYOUT[state.screenId]).forEach(([elementId, bounds]) => {
    const rule = getRule(state.screenId, elementId);
    if (!rule.visible) {
      return;
    }

    const card = document.createElement('div');
    card.className = `preview-element${state.elementId === elementId ? ' selected' : ''}`;
    card.style.left = `${bounds.left + rule.offsetX}px`;
    card.style.top = `${bounds.top + rule.offsetY}px`;
    card.style.width = `${bounds.width}px`;
    card.style.height = `${bounds.height}px`;
    card.style.opacity = String(rule.opacity);
    card.style.zIndex = String(10 + rule.zIndex);
    card.style.transform = `scale(${rule.scale})`;
    card.style.transformOrigin = 'top left';

    const header = document.createElement('header');
    header.innerHTML = `<span>${elementId}</span><span>${rule.offsetX}, ${rule.offsetY}</span>`;
    const body = document.createElement('div');
    body.className = 'body';
    body.appendChild(renderElementBody(elementId));
    card.appendChild(header);
    card.appendChild(body);
    card.addEventListener('click', () => {
      state.elementId = elementId;
      byId('element-id').value = elementId;
      applyElementFields();
      renderPreview();
    });
    canvas.appendChild(card);
  });

  byId('manifest-json').value = JSON.stringify(state.manifest, null, 2);
  syncViewportInputs(viewport);
}

function renderElementBody(elementId) {
  const wrapper = document.createElement('div');
  if (elementId === 'board') {
    const grid = document.createElement('div');
    grid.className = 'preview-grid';
    for (let index = 0; index < 64; index += 1) {
      const cell = document.createElement('div');
      cell.className = `preview-cell${index % 5 === 0 ? ' filled' : ''}`;
      grid.appendChild(cell);
    }
    wrapper.appendChild(grid);
    return wrapper;
  }

  const copy = document.createElement('p');
  copy.textContent = {
    header: '헤더 / 상단 정보 영역',
    battle_lane: '플레이어와 몬스터 HP 패널',
    piece_tray: '하단 조각 선택 트레이',
    item_bar: '소비 아이템 바',
    combo_gauge: '콤보 / 피버 반투명 게이지',
    status_bar: '무한 모드 상태 요약',
    summon_panel: '소환 정보 카드',
    next_preview: '다음 블록 패널',
    back_button: '뒤로가기 버튼',
    opponent_panel: '상대 패널',
    attack_bar: '대전 공격 바',
    top_panel: '레이드 보스 패널',
    skill_bar: '레이드 스킬 바',
    info_bar: '레이드 정보 요약',
  }[elementId] ?? 'UI Element';
  wrapper.appendChild(copy);

  const track = document.createElement('div');
  track.className = 'preview-track';
  const fill = document.createElement('div');
  fill.className = 'preview-fill';
  fill.style.width = `${elementId === 'combo_gauge' ? 64 : 72}%`;
  track.appendChild(fill);
  wrapper.appendChild(track);
  return wrapper;
}

function refreshElementOptions() {
  const elementSelect = byId('element-id');
  elementSelect.innerHTML = '';
  ELEMENTS[state.screenId].forEach(elementId => {
    const option = document.createElement('option');
    option.value = elementId;
    option.textContent = elementId;
    elementSelect.appendChild(option);
  });
  if (!ELEMENTS[state.screenId].includes(state.elementId)) {
    state.elementId = ELEMENTS[state.screenId][0];
  }
  elementSelect.value = state.elementId;
  applyElementFields();
}

function updateRuleFromFields() {
  const rule = getRule(state.screenId, state.elementId);
  rule.offsetX = Number(byId('offset-x').value) || 0;
  rule.offsetY = Number(byId('offset-y').value) || 0;
  rule.scale = Number(byId('scale').value) || 1;
  rule.opacity = Number(byId('opacity').value) || 1;
  rule.zIndex = Number(byId('z-index').value) || 0;
  rule.visible = byId('visible').checked;
  rule.safeAreaAware = byId('safe-aware').checked;
  state.manifest.referenceViewport = clone(getViewport());
}

async function fetchJson(path, options = {}) {
  const url = byId('supabase-url').value.trim().replace(/\/$/, '');
  const anonKey = byId('supabase-anon').value.trim();
  const jwt = byId('supabase-jwt').value.trim();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  return response.json();
}

async function loadDraft() {
  const rows = await fetchJson('ui_config_draft?id=eq.1&select=*');
  if (rows?.[0]?.config_json) {
    state.manifest = rows[0].config_json;
    syncViewportInputs(state.manifest.referenceViewport || DEFAULT_REFERENCE_VIEWPORT);
    renderPreview();
  }
}

async function loadLatestRelease() {
  const rows = await fetchJson('ui_config_releases?select=version,config_json,created_at,notes&order=version.desc&limit=1');
  if (rows?.[0]?.config_json) {
    state.manifest = rows[0].config_json;
    renderPreview();
  }
}

async function saveDraft() {
  updateRuleFromFields();
  await fetchJson('ui_config_draft', {
    method: 'POST',
    body: JSON.stringify([{id: 1, config_json: state.manifest}]),
  });
}

async function publishRelease() {
  updateRuleFromFields();
  const latest = await fetchJson('ui_config_releases?select=version&order=version.desc&limit=1');
  const nextVersion = (latest?.[0]?.version || 0) + 1;
  state.manifest.version = nextVersion;
  await saveDraft();
  await fetchJson('ui_config_releases', {
    method: 'POST',
    body: JSON.stringify([
      {
        version: nextVersion,
        config_json: state.manifest,
        notes: `PC studio publish ${new Date().toISOString()}`,
      },
    ]),
  });
  byId('server-status').textContent = `v${nextVersion} published`;
}

function bootstrapSelectors() {
  const screenSelect = byId('screen-id');
  const deviceSelect = byId('device-profile');

  Object.entries(SCREEN_LABELS).forEach(([screenId, label]) => {
    const option = document.createElement('option');
    option.value = screenId;
    option.textContent = label;
    screenSelect.appendChild(option);
  });

  DEVICE_PROFILES.forEach(profile => {
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = profile.label;
    deviceSelect.appendChild(option);
  });

  screenSelect.value = state.screenId;
  deviceSelect.value = state.profileId;
  refreshElementOptions();
}

function bindEvents() {
  byId('screen-id').addEventListener('change', event => {
    state.screenId = event.target.value;
    refreshElementOptions();
    renderPreview();
  });

  byId('element-id').addEventListener('change', event => {
    state.elementId = event.target.value;
    applyElementFields();
    renderPreview();
  });

  byId('device-profile').addEventListener('change', event => {
    state.profileId = event.target.value;
    const viewport = getViewport();
    state.manifest.referenceViewport = clone(viewport);
    syncViewportInputs(viewport);
    renderPreview();
  });

  ['viewport-width', 'viewport-height', 'safe-top', 'safe-bottom'].forEach(id => {
    byId(id).addEventListener('input', () => {
      if (state.profileId === 'custom') {
        state.manifest.referenceViewport = clone(getViewport());
        renderPreview();
      }
    });
  });

  byId('apply-element').addEventListener('click', () => {
    updateRuleFromFields();
    renderPreview();
  });

  byId('reset-element').addEventListener('click', () => {
    state.manifest.screens[state.screenId].elements[state.elementId] = {...DEFAULT_RULE};
    applyElementFields();
    renderPreview();
  });

  byId('apply-json').addEventListener('click', () => {
    state.manifest = JSON.parse(byId('manifest-json').value);
    renderPreview();
  });

  byId('copy-json').addEventListener('click', async () => {
    await navigator.clipboard.writeText(byId('manifest-json').value);
    byId('server-status').textContent = 'JSON copied';
  });

  byId('load-draft').addEventListener('click', async () => {
    try {
      await loadDraft();
      byId('server-status').textContent = 'Draft loaded';
    } catch (error) {
      byId('server-status').textContent = `Draft load failed: ${error.message}`;
    }
  });

  byId('load-latest').addEventListener('click', async () => {
    try {
      await loadLatestRelease();
      byId('server-status').textContent = 'Latest release loaded';
    } catch (error) {
      byId('server-status').textContent = `Latest load failed: ${error.message}`;
    }
  });

  byId('save-draft').addEventListener('click', async () => {
    try {
      await saveDraft();
      byId('server-status').textContent = 'Draft saved';
    } catch (error) {
      byId('server-status').textContent = `Draft save failed: ${error.message}`;
    }
  });

  byId('publish-release').addEventListener('click', async () => {
    try {
      await publishRelease();
    } catch (error) {
      byId('server-status').textContent = `Publish failed: ${error.message}`;
    }
  });
}

bootstrapSelectors();
bindEvents();
applyElementFields();
renderPreview();
