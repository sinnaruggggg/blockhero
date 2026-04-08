const LOCAL_STORAGE_KEY = 'blockhero-ui-studio-v3';

const DEFAULT_REFERENCE_VIEWPORT = {
  width: 412,
  height: 915,
  safeTop: 34,
  safeBottom: 34,
};

const DEFAULT_BACKGROUND_URL = '../../src/assets/ui/grassland_bg.jpg';

const DEVICE_PROFILES = [
  {
    id: 'galaxy-s23-ultra',
    label: 'Galaxy S23 Ultra',
    viewport: {width: 412, height: 915, safeTop: 34, safeBottom: 34},
  },
  {
    id: 'galaxy-a54',
    label: 'Galaxy A54',
    viewport: {width: 411, height: 891, safeTop: 32, safeBottom: 24},
  },
  {
    id: 'galaxy-fold-cover',
    label: 'Galaxy Fold Cover',
    viewport: {width: 360, height: 780, safeTop: 30, safeBottom: 24},
  },
  {
    id: 'iphone-15-pro',
    label: 'iPhone 15 Pro',
    viewport: {width: 393, height: 852, safeTop: 59, safeBottom: 34},
  },
  {
    id: 'iphone-15-pro-max',
    label: 'iPhone 15 Pro Max',
    viewport: {width: 430, height: 932, safeTop: 59, safeBottom: 34},
  },
  {
    id: 'tablet-portrait',
    label: 'Tablet Portrait',
    viewport: {width: 800, height: 1280, safeTop: 24, safeBottom: 20},
  },
  {
    id: 'custom',
    label: 'Custom',
    viewport: DEFAULT_REFERENCE_VIEWPORT,
  },
];

const SCREEN_LABELS = {
  level: 'Level',
  endless: 'Endless',
  battle: 'Battle',
  raid: 'Raid',
};

const ELEMENT_DEFS = {
  level: [
    {id: 'header', label: 'Header'},
    {id: 'battle_lane', label: 'Combat HUD'},
    {id: 'board', label: 'Board'},
    {id: 'piece_tray', label: 'Piece Tray'},
    {id: 'item_bar', label: 'Item Bar'},
    {id: 'combo_gauge', label: 'Combo Gauge'},
  ],
  endless: [
    {id: 'header', label: 'Header'},
    {id: 'status_bar', label: 'Status Bar'},
    {id: 'summon_panel', label: 'Summon Panel'},
    {id: 'next_preview', label: 'Next Preview'},
    {id: 'board', label: 'Board'},
    {id: 'piece_tray', label: 'Piece Tray'},
    {id: 'item_bar', label: 'Item Bar'},
    {id: 'combo_gauge', label: 'Combo Gauge'},
  ],
  battle: [
    {id: 'back_button', label: 'Back Button'},
    {id: 'opponent_panel', label: 'Opponent Panel'},
    {id: 'attack_bar', label: 'Attack Bar'},
    {id: 'board', label: 'Board'},
    {id: 'piece_tray', label: 'Piece Tray'},
  ],
  raid: [
    {id: 'top_panel', label: 'Boss Panel'},
    {id: 'skill_bar', label: 'Skill Bar'},
    {id: 'info_bar', label: 'Info Bar'},
    {id: 'board', label: 'Board'},
    {id: 'piece_tray', label: 'Piece Tray'},
    {id: 'combo_gauge', label: 'Combo Gauge'},
  ],
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

const DEFAULT_BACKGROUND_RULE = {
  assetKey: null,
  tintColor: '#000000',
  tintOpacity: 0,
  removeImage: false,
};

const PREVIEW_LAYOUT = {
  level: {
    header: {left: 12, top: 52, width: 388, height: 70},
    battle_lane: {left: 16, top: 132, width: 380, height: 116},
    board: {left: 34, top: 270, width: 344, height: 344},
    piece_tray: {left: 16, top: 704, width: 380, height: 130},
    item_bar: {left: 28, top: 844, width: 356, height: 62},
    combo_gauge: {left: 106, top: 278, width: 200, height: 42},
  },
  endless: {
    header: {left: 12, top: 48, width: 388, height: 88},
    status_bar: {left: 20, top: 150, width: 372, height: 52},
    summon_panel: {left: 20, top: 210, width: 372, height: 64},
    next_preview: {left: 20, top: 284, width: 372, height: 70},
    board: {left: 34, top: 366, width: 344, height: 344},
    piece_tray: {left: 16, top: 732, width: 380, height: 128},
    item_bar: {left: 26, top: 870, width: 360, height: 44},
    combo_gauge: {left: 106, top: 374, width: 200, height: 42},
  },
  battle: {
    back_button: {left: 16, top: 48, width: 74, height: 56},
    opponent_panel: {left: 102, top: 56, width: 208, height: 168},
    attack_bar: {left: 20, top: 236, width: 372, height: 80},
    board: {left: 34, top: 344, width: 344, height: 344},
    piece_tray: {left: 16, top: 714, width: 380, height: 126},
  },
  raid: {
    top_panel: {left: 12, top: 34, width: 388, height: 188},
    skill_bar: {left: 20, top: 232, width: 372, height: 54},
    info_bar: {left: 20, top: 294, width: 372, height: 50},
    board: {left: 34, top: 372, width: 344, height: 344},
    piece_tray: {left: 16, top: 746, width: 380, height: 126},
    combo_gauge: {left: 106, top: 380, width: 200, height: 42},
  },
};

const state = {
  manifest: createDefaultManifest(),
  screenId: 'level',
  elementId: 'header',
  profileId: 'galaxy-s23-ultra',
  zoom: 1,
  fitScale: 1,
  displayScale: 1,
  showGrid: true,
  snapGrid: true,
  gridSize: 16,
  assetCache: new Map(),
  releaseRows: [],
  drag: null,
  renderPending: false,
  previewWorld: 1,
  previewLevel: 1,
  previewRaidStage: 1,
};

const byId = id => document.getElementById(id);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createDefaultManifest() {
  return {
    version: 0,
    referenceViewport: clone(DEFAULT_REFERENCE_VIEWPORT),
    screens: {
      level: {
        elements: Object.fromEntries(ELEMENT_DEFS.level.map(({id}) => [id, clone(DEFAULT_RULE)])),
        backgrounds: {byWorld: {}, byLevel: {}},
      },
      endless: {
        elements: Object.fromEntries(ELEMENT_DEFS.endless.map(({id}) => [id, clone(DEFAULT_RULE)])),
      },
      battle: {
        elements: Object.fromEntries(ELEMENT_DEFS.battle.map(({id}) => [id, clone(DEFAULT_RULE)])),
      },
      raid: {
        elements: Object.fromEntries(ELEMENT_DEFS.raid.map(({id}) => [id, clone(DEFAULT_RULE)])),
        backgrounds: {byBossStage: {}},
      },
    },
  };
}

function sanitizeRule(rule) {
  const merged = {...DEFAULT_RULE, ...(rule ?? {})};
  return {
    offsetX: Math.round(clamp(numberOr(merged.offsetX, 0), -800, 800)),
    offsetY: Math.round(clamp(numberOr(merged.offsetY, 0), -1200, 1200)),
    scale: clamp(numberOr(merged.scale, 1), 0.3, 3),
    opacity: clamp(numberOr(merged.opacity, 1), 0, 1),
    visible: merged.visible !== false,
    zIndex: Math.round(clamp(numberOr(merged.zIndex, 0), -50, 100)),
    safeAreaAware: merged.safeAreaAware === true,
  };
}

function sanitizeViewport(viewport) {
  const merged = {...DEFAULT_REFERENCE_VIEWPORT, ...(viewport ?? {})};
  return {
    width: Math.round(clamp(numberOr(merged.width, DEFAULT_REFERENCE_VIEWPORT.width), 280, 1600)),
    height: Math.round(clamp(numberOr(merged.height, DEFAULT_REFERENCE_VIEWPORT.height), 480, 3200)),
    safeTop: Math.round(clamp(numberOr(merged.safeTop, 0), 0, 240)),
    safeBottom: Math.round(clamp(numberOr(merged.safeBottom, 0), 0, 240)),
  };
}

function sanitizeBackgroundRule(rule) {
  const merged = {...DEFAULT_BACKGROUND_RULE, ...(rule ?? {})};
  return {
    assetKey:
      typeof merged.assetKey === 'string' && merged.assetKey.trim().length > 0
        ? merged.assetKey.trim()
        : null,
    tintColor:
      typeof merged.tintColor === 'string' && merged.tintColor.trim().length > 0
        ? merged.tintColor.trim()
        : DEFAULT_BACKGROUND_RULE.tintColor,
    tintOpacity: clamp(numberOr(merged.tintOpacity, 0), 0, 1),
    removeImage: merged.removeImage === true,
  };
}

function ensureManifest(raw) {
  const next = createDefaultManifest();
  const value = raw ?? {};
  next.version = Math.max(0, Math.round(numberOr(value.version, 0)));
  next.referenceViewport = sanitizeViewport(value.referenceViewport);

  Object.keys(ELEMENT_DEFS).forEach(screenId => {
    ELEMENT_DEFS[screenId].forEach(({id}) => {
      next.screens[screenId].elements[id] = sanitizeRule(
        value?.screens?.[screenId]?.elements?.[id],
      );
    });
  });

  const worldBackgrounds = value?.screens?.level?.backgrounds?.byWorld ?? {};
  const levelBackgrounds = value?.screens?.level?.backgrounds?.byLevel ?? {};
  Object.entries(worldBackgrounds).forEach(([key, background]) => {
    next.screens.level.backgrounds.byWorld[key] = sanitizeBackgroundRule(background);
  });
  Object.entries(levelBackgrounds).forEach(([key, background]) => {
    next.screens.level.backgrounds.byLevel[key] = sanitizeBackgroundRule(background);
  });

  const raidBackgrounds = value?.screens?.raid?.backgrounds?.byBossStage ?? {};
  Object.entries(raidBackgrounds).forEach(([key, background]) => {
    next.screens.raid.backgrounds.byBossStage[key] = sanitizeBackgroundRule(background);
  });

  return next;
}

function getViewport() {
  const profile = DEVICE_PROFILES.find(item => item.id === state.profileId);
  if (profile && profile.id !== 'custom') {
    return clone(profile.viewport);
  }

  return sanitizeViewport({
    width: byId('viewport-width').value,
    height: byId('viewport-height').value,
    safeTop: byId('safe-top').value,
    safeBottom: byId('safe-bottom').value,
  });
}

function syncViewportFields(viewport) {
  byId('viewport-width').value = String(viewport.width);
  byId('viewport-height').value = String(viewport.height);
  byId('safe-top').value = String(viewport.safeTop);
  byId('safe-bottom').value = String(viewport.safeBottom);
  byId('viewport-meta').textContent =
    `${viewport.width} x ${viewport.height}, safe ${viewport.safeTop} / ${viewport.safeBottom}`;
}

function resolveVisualOffset(offsetX, offsetY, currentViewport, referenceViewport, safeAreaAware) {
  const safeWidthCurrent = Math.max(1, currentViewport.width);
  const safeWidthReference = Math.max(1, referenceViewport.width);
  const safeHeightCurrent = Math.max(
    1,
    currentViewport.height - (safeAreaAware ? currentViewport.safeTop + currentViewport.safeBottom : 0),
  );
  const safeHeightReference = Math.max(
    1,
    referenceViewport.height -
      (safeAreaAware ? referenceViewport.safeTop + referenceViewport.safeBottom : 0),
  );

  return {
    x: Math.round(offsetX * (safeWidthCurrent / safeWidthReference)),
    y: Math.round(offsetY * (safeHeightCurrent / safeHeightReference)),
  };
}

function scaleRect(rect, viewport) {
  const widthRatio = viewport.width / DEFAULT_REFERENCE_VIEWPORT.width;
  const heightRatio = viewport.height / DEFAULT_REFERENCE_VIEWPORT.height;
  return {
    left: Math.round(rect.left * widthRatio),
    top: Math.round(rect.top * heightRatio),
    width: Math.round(rect.width * widthRatio),
    height: Math.round(rect.height * heightRatio),
  };
}

function getRule(screenId, elementId) {
  return state.manifest.screens[screenId].elements[elementId];
}

function getBackgroundMode() {
  return state.screenId === 'level' ? byId('background-scope').value : 'bossStage';
}

function getBackgroundKeyForCurrentContext() {
  if (state.screenId === 'level') {
    return getBackgroundMode() === 'level'
      ? String(state.previewLevel)
      : String(state.previewWorld);
  }

  if (state.screenId === 'raid') {
    return String(state.previewRaidStage);
  }

  return '';
}

function getBackgroundStore() {
  if (state.screenId === 'level') {
    return getBackgroundMode() === 'level'
      ? state.manifest.screens.level.backgrounds.byLevel
      : state.manifest.screens.level.backgrounds.byWorld;
  }

  if (state.screenId === 'raid') {
    return state.manifest.screens.raid.backgrounds.byBossStage;
  }

  return null;
}

function getActiveBackgroundRule() {
  if (state.screenId === 'level') {
    const levelKey = String(state.previewLevel);
    const worldKey = String(state.previewWorld);
    return (
      state.manifest.screens.level.backgrounds.byLevel[levelKey] ??
      state.manifest.screens.level.backgrounds.byWorld[worldKey] ??
      null
    );
  }

  if (state.screenId === 'raid') {
    return state.manifest.screens.raid.backgrounds.byBossStage[String(state.previewRaidStage)] ?? null;
  }

  return null;
}

function collectManifestAssetKeys(manifest) {
  const keys = new Set();
  Object.values(manifest.screens.level.backgrounds.byWorld).forEach(rule => {
    if (rule.assetKey) {
      keys.add(rule.assetKey);
    }
  });
  Object.values(manifest.screens.level.backgrounds.byLevel).forEach(rule => {
    if (rule.assetKey) {
      keys.add(rule.assetKey);
    }
  });
  Object.values(manifest.screens.raid.backgrounds.byBossStage).forEach(rule => {
    if (rule.assetKey) {
      keys.add(rule.assetKey);
    }
  });
  return Array.from(keys);
}

function getServerConfig() {
  return {
    url: byId('supabase-url').value.trim().replace(/\/$/, ''),
    anonKey: byId('supabase-anon').value.trim(),
    jwt: byId('supabase-jwt').value.trim(),
  };
}

async function fetchJson(path, options = {}) {
  const {url, anonKey, jwt} = getServerConfig();
  if (!url || !anonKey || !jwt) {
    throw new Error('Supabase URL, anon key, and admin JWT are required.');
  }

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

async function ensureAssetLoaded(assetKey) {
  if (!assetKey) {
    return null;
  }

  if (state.assetCache.has(assetKey)) {
    return state.assetCache.get(assetKey);
  }

  const encoded = encodeURIComponent(assetKey);
  const rows = await fetchJson(
    `ui_assets?select=asset_key,data_url,mime_type,content_hash&asset_key=eq.${encoded}&limit=1`,
  );
  const asset = rows?.[0] ?? null;
  if (asset) {
    state.assetCache.set(asset.asset_key, asset);
  }
  return asset;
}

async function preloadManifestAssets() {
  const keys = collectManifestAssetKeys(state.manifest);
  await Promise.all(keys.map(key => ensureAssetLoaded(key).catch(() => null)));
}

function persistEditorPrefs() {
  const payload = {
    supabaseUrl: byId('supabase-url').value,
    supabaseAnon: byId('supabase-anon').value,
    supabaseJwt: byId('supabase-jwt').value,
    screenId: state.screenId,
    elementId: state.elementId,
    profileId: state.profileId,
    zoom: state.zoom,
    showGrid: state.showGrid,
    snapGrid: state.snapGrid,
    gridSize: state.gridSize,
    previewWorld: state.previewWorld,
    previewLevel: state.previewLevel,
    previewRaidStage: state.previewRaidStage,
    viewport: getViewport(),
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
}

function restoreEditorPrefs() {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const saved = JSON.parse(raw);
    byId('supabase-url').value = saved.supabaseUrl ?? '';
    byId('supabase-anon').value = saved.supabaseAnon ?? '';
    byId('supabase-jwt').value = saved.supabaseJwt ?? '';
    state.screenId = saved.screenId && SCREEN_LABELS[saved.screenId] ? saved.screenId : 'level';
    state.elementId = saved.elementId || ELEMENT_DEFS[state.screenId][0].id;
    state.profileId = saved.profileId || 'galaxy-s23-ultra';
    state.zoom = clamp(numberOr(saved.zoom, 1), 0.35, 3);
    state.showGrid = saved.showGrid !== false;
    state.snapGrid = saved.snapGrid !== false;
    state.gridSize = clamp(Math.round(numberOr(saved.gridSize, 16)), 4, 32);
    state.previewWorld = Math.max(1, Math.round(numberOr(saved.previewWorld, 1)));
    state.previewLevel = Math.max(1, Math.round(numberOr(saved.previewLevel, 1)));
    state.previewRaidStage = Math.max(1, Math.round(numberOr(saved.previewRaidStage, 1)));

    if (saved.viewport) {
      const viewport = sanitizeViewport(saved.viewport);
      byId('viewport-width').value = String(viewport.width);
      byId('viewport-height').value = String(viewport.height);
      byId('safe-top').value = String(viewport.safeTop);
      byId('safe-bottom').value = String(viewport.safeBottom);
    }
  } catch (error) {
    console.warn('Failed to restore UI studio prefs', error);
  }
}

function setStatus(message, tone = 'muted') {
  const status = byId('server-status');
  const line = byId('status-line');
  status.textContent = message;
  line.textContent = message;
  status.style.color =
    tone === 'error' ? 'var(--danger)' : tone === 'success' ? 'var(--success)' : 'var(--muted)';
  line.style.color = status.style.color;
}

function updateTopbar() {
  const viewport = getViewport();
  const rule = getRule(state.screenId, state.elementId);
  byId('topbar-screen-label').textContent = SCREEN_LABELS[state.screenId];
  byId('topbar-selection-label').textContent = state.elementId;
  byId('topbar-reference-label').textContent =
    `${state.manifest.referenceViewport.width} x ${state.manifest.referenceViewport.height}`;
  byId('stage-screen-pill').textContent = state.screenId;
  byId('stage-selection-pill').textContent = state.elementId;
  byId('stage-offset-pill').textContent = `${rule.offsetX}, ${rule.offsetY}`;
  byId('stage-scale-pill').textContent = `${rule.scale.toFixed(2)}x`;
  byId('stage-grid-pill').textContent = `${state.gridSize} px`;
  byId('zoom-range').value = String(state.zoom);
  byId('zoom-value').value = String(state.zoom.toFixed(2));
  byId('preview-world').value = String(state.previewWorld);
  byId('preview-level').value = String(state.previewLevel);
  byId('preview-raid-stage').value = String(state.previewRaidStage);
  syncViewportFields(viewport);
}

function refreshScreenOptions() {
  const screenSelect = byId('screen-id');
  if (!screenSelect.childElementCount) {
    Object.entries(SCREEN_LABELS).forEach(([screenId, label]) => {
      const option = document.createElement('option');
      option.value = screenId;
      option.textContent = label;
      screenSelect.appendChild(option);
    });
  }
  screenSelect.value = state.screenId;
}

function refreshDeviceOptions() {
  const select = byId('device-profile');
  if (!select.childElementCount) {
    DEVICE_PROFILES.forEach(profile => {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.label;
      select.appendChild(option);
    });
  }
  select.value = state.profileId;
}

function refreshElementOptions() {
  const elementSelect = byId('element-id');
  elementSelect.innerHTML = '';
  ELEMENT_DEFS[state.screenId].forEach(({id, label}) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = `${label} (${id})`;
    elementSelect.appendChild(option);
  });

  if (!ELEMENT_DEFS[state.screenId].some(item => item.id === state.elementId)) {
    state.elementId = ELEMENT_DEFS[state.screenId][0].id;
  }
  elementSelect.value = state.elementId;
}

function refreshInspectorFields() {
  const rule = getRule(state.screenId, state.elementId);
  byId('offset-x').value = String(rule.offsetX);
  byId('offset-y').value = String(rule.offsetY);
  byId('scale').value = String(rule.scale);
  byId('opacity').value = String(rule.opacity);
  byId('z-index').value = String(rule.zIndex);
  byId('visible').checked = rule.visible;
  byId('safe-aware').checked = !!rule.safeAreaAware;
}

function updateRuleFromInspector() {
  const rule = getRule(state.screenId, state.elementId);
  const updated = sanitizeRule({
    offsetX: byId('offset-x').value,
    offsetY: byId('offset-y').value,
    scale: byId('scale').value,
    opacity: byId('opacity').value,
    zIndex: byId('z-index').value,
    visible: byId('visible').checked,
    safeAreaAware: byId('safe-aware').checked,
  });
  Object.assign(rule, updated);
  state.manifest.referenceViewport = getViewport();
}

function updateBackgroundScopeOptions() {
  const select = byId('background-scope');
  const previous = select.value;
  select.innerHTML = '';

  const options =
    state.screenId === 'level'
      ? [
          {value: 'world', label: 'Level World'},
          {value: 'level', label: 'Specific Level'},
        ]
      : state.screenId === 'raid'
        ? [{value: 'bossStage', label: 'Raid Stage'}]
        : [];

  if (!options.length) {
    const option = document.createElement('option');
    option.value = 'none';
    option.textContent = 'No background override for this screen';
    select.appendChild(option);
    select.disabled = true;
    byId('background-key').value = '';
    return;
  }

  select.disabled = false;
  options.forEach(entry => {
    const option = document.createElement('option');
    option.value = entry.value;
    option.textContent = entry.label;
    select.appendChild(option);
  });
  if (options.some(entry => entry.value === previous)) {
    select.value = previous;
  }
}

function syncBackgroundForm() {
  updateBackgroundScopeOptions();

  if (state.screenId !== 'level' && state.screenId !== 'raid') {
    byId('background-key').value = '';
    byId('background-asset-key').value = '';
    byId('background-tint-color').value = '#000000';
    byId('background-tint-opacity').value = '0';
    byId('background-remove-image').checked = false;
    renderBackgroundPreviewCard(null);
    return;
  }

  const key = getBackgroundKeyForCurrentContext();
  byId('background-key').value = key;
  const store = getBackgroundStore();
  const rule = sanitizeBackgroundRule(store?.[key]);
  byId('background-asset-key').value = rule.assetKey ?? '';
  byId('background-tint-color').value = rule.tintColor;
  byId('background-tint-opacity').value = String(rule.tintOpacity);
  byId('background-remove-image').checked = rule.removeImage;
  renderBackgroundPreviewCard(rule.assetKey ? state.assetCache.get(rule.assetKey) ?? null : null);
}

function updateManifestJson() {
  byId('manifest-json').value = JSON.stringify(state.manifest, null, 2);
}

function createTrack(fillClass, widthPercent) {
  const track = document.createElement('div');
  track.className = 'preview-track';
  const fill = document.createElement('div');
  fill.className = `preview-fill ${fillClass}`;
  fill.style.width = `${widthPercent}%`;
  track.appendChild(fill);
  return track;
}

function createPieceTrayBody() {
  const wrapper = document.createElement('div');
  wrapper.className = 'preview-piece-row';

  ['layout-line', 'layout-l', 'layout-z'].forEach(className => {
    const slot = document.createElement('div');
    slot.className = 'preview-piece-slot';
    const piece = document.createElement('div');
    piece.className = `preview-piece ${className}`;
    const count = className === 'layout-line' ? 4 : className === 'layout-l' ? 3 : 4;
    for (let index = 0; index < count; index += 1) {
      const cell = document.createElement('div');
      cell.className = 'preview-piece-block';
      piece.appendChild(cell);
    }
    slot.appendChild(piece);
    wrapper.appendChild(slot);
  });

  return wrapper;
}

function createBoardBody() {
  const wrapper = document.createElement('div');
  const grid = document.createElement('div');
  grid.className = 'preview-grid';
  for (let index = 0; index < 64; index += 1) {
    const cell = document.createElement('div');
    cell.className = `preview-cell${index % 7 === 0 || index % 11 === 0 ? ' filled' : ''}`;
    grid.appendChild(cell);
  }
  wrapper.appendChild(grid);
  return wrapper;
}

function renderElementBody(screenId, elementId) {
  const wrapper = document.createElement('div');
  wrapper.className = 'preview-element-body';

  if (elementId === 'board') {
    wrapper.appendChild(createBoardBody());
    return wrapper;
  }

  if (elementId === 'piece_tray') {
    wrapper.appendChild(createPieceTrayBody());
    return wrapper;
  }

  if (elementId === 'battle_lane' || elementId === 'top_panel' || elementId === 'opponent_panel') {
    const chips = document.createElement('div');
    chips.className = 'preview-chip-row';
    ['HP', 'ATK', 'Combo'].forEach(label => {
      const chip = document.createElement('div');
      chip.className = 'preview-chip';
      chip.textContent = label;
      chips.appendChild(chip);
    });
    wrapper.appendChild(chips);
    wrapper.appendChild(createTrack('health', 78));
    wrapper.appendChild(createTrack('combo', 46));
    return wrapper;
  }

  if (elementId === 'header' || elementId === 'status_bar' || elementId === 'info_bar') {
    const chips = document.createElement('div');
    chips.className = 'preview-chip-row';
    ['Gold', 'Dia', 'Heart'].forEach(label => {
      const chip = document.createElement('div');
      chip.className = 'preview-chip';
      chip.textContent = label;
      chips.appendChild(chip);
    });
    wrapper.appendChild(chips);
    wrapper.appendChild(createTrack('combo', 58));
    return wrapper;
  }

  if (elementId === 'item_bar' || elementId === 'skill_bar') {
    const chips = document.createElement('div');
    chips.className = 'preview-chip-row';
    ['A', 'B', 'C', 'D'].forEach(label => {
      const chip = document.createElement('div');
      chip.className = 'preview-chip';
      chip.textContent = label;
      chips.appendChild(chip);
    });
    wrapper.appendChild(chips);
    return wrapper;
  }

  if (elementId === 'combo_gauge' || elementId === 'attack_bar') {
    wrapper.appendChild(createTrack('combo', 64));
    wrapper.appendChild(createTrack('health', 34));
    return wrapper;
  }

  if (elementId === 'summon_panel' || elementId === 'next_preview') {
    wrapper.appendChild(createTrack('combo', 72));
    wrapper.appendChild(createTrack('health', 48));
    return wrapper;
  }

  if (elementId === 'back_button') {
    const chip = document.createElement('div');
    chip.className = 'preview-chip';
    chip.textContent = 'Back';
    wrapper.appendChild(chip);
    return wrapper;
  }

  wrapper.appendChild(createTrack('combo', 56));
  return wrapper;
}

function renderRulers(viewport, displayScale) {
  const rulerX = byId('ruler-x');
  const rulerY = byId('ruler-y');
  rulerX.innerHTML = '';
  rulerY.innerHTML = '';

  const tickStep = 50;
  for (let value = 0; value <= viewport.width; value += tickStep) {
    const tick = document.createElement('div');
    tick.className = 'ruler-tick';
    tick.style.left = `${Math.round(value * displayScale)}px`;
    tick.style.height = value % 100 === 0 ? '20px' : '12px';
    rulerX.appendChild(tick);

    if (value % 100 === 0) {
      const label = document.createElement('div');
      label.className = 'ruler-label';
      label.style.left = `${Math.round(value * displayScale + 4)}px`;
      label.style.top = '4px';
      label.textContent = String(value);
      rulerX.appendChild(label);
    }
  }

  for (let value = 0; value <= viewport.height; value += tickStep) {
    const tick = document.createElement('div');
    tick.className = 'ruler-tick';
    tick.style.top = `${Math.round(value * displayScale)}px`;
    tick.style.width = value % 100 === 0 ? '20px' : '12px';
    rulerY.appendChild(tick);

    if (value % 100 === 0) {
      const label = document.createElement('div');
      label.className = 'ruler-label';
      label.style.top = `${Math.round(value * displayScale + 4)}px`;
      label.style.left = '4px';
      label.textContent = String(value);
      rulerY.appendChild(label);
    }
  }
}

function renderLayerList() {
  const layerList = byId('layer-list');
  layerList.innerHTML = '';

  const items = [...ELEMENT_DEFS[state.screenId]].sort((left, right) => {
    const leftRule = getRule(state.screenId, left.id);
    const rightRule = getRule(state.screenId, right.id);
    return rightRule.zIndex - leftRule.zIndex;
  });

  items.forEach(({id, label}) => {
    const row = document.createElement('div');
    row.className = `layer-row${state.elementId === id ? ' selected' : ''}`;

    const visible = document.createElement('input');
    visible.type = 'checkbox';
    visible.checked = getRule(state.screenId, id).visible;
    visible.addEventListener('change', event => {
      getRule(state.screenId, id).visible = event.target.checked;
      updateManifestJson();
      scheduleRender();
    });

    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<strong>${label}</strong><br /><small class="muted">${id}</small>`;
    button.addEventListener('click', () => {
      state.elementId = id;
      refreshElementOptions();
      refreshInspectorFields();
      updateTopbar();
      scheduleRender();
    });

    const zInfo = document.createElement('small');
    zInfo.className = 'muted';
    zInfo.textContent = `z ${getRule(state.screenId, id).zIndex}`;

    row.appendChild(visible);
    row.appendChild(button);
    row.appendChild(zInfo);
    layerList.appendChild(row);
  });
}

async function resolveBackgroundImage() {
  const rule = getActiveBackgroundRule();
  if (!rule || !rule.assetKey || rule.removeImage) {
    return DEFAULT_BACKGROUND_URL;
  }

  const asset = await ensureAssetLoaded(rule.assetKey).catch(() => null);
  return asset?.data_url ?? DEFAULT_BACKGROUND_URL;
}

function renderBackgroundPreviewCard(asset) {
  const previewImage = byId('background-preview-image');
  const title = byId('background-preview-title');
  const meta = byId('background-preview-meta');
  if (!asset) {
    previewImage.style.backgroundImage = `linear-gradient(180deg, rgba(4, 9, 18, 0.16), rgba(4, 9, 18, 0.54)), url("${DEFAULT_BACKGROUND_URL}")`;
    title.textContent = 'No asset preview';
    meta.textContent = 'Select a saved asset key or upload a new background.';
    return;
  }

  previewImage.style.backgroundImage = `linear-gradient(180deg, rgba(4, 9, 18, 0.16), rgba(4, 9, 18, 0.48)), url("${asset.data_url}")`;
  title.textContent = asset.asset_key;
  meta.textContent = `${asset.mime_type || 'image/*'}${asset.content_hash ? ` | ${asset.content_hash}` : ''}`;
}

async function renderPreview() {
  const viewport = getViewport();
  const stageHost = byId('stage-host');
  const frame = byId('device-frame');
  const canvas = byId('preview-canvas');
  const gridOverlay = byId('grid-overlay');

  const hostWidth = Math.max(280, stageHost.clientWidth - 24);
  const hostHeight = Math.max(480, stageHost.clientHeight - 24);
  state.fitScale = Math.min(hostWidth / viewport.width, hostHeight / viewport.height);
  state.displayScale = state.fitScale * state.zoom;

  frame.style.width = `${Math.round(viewport.width * state.displayScale)}px`;
  frame.style.height = `${Math.round(viewport.height * state.displayScale)}px`;

  [canvas, gridOverlay].forEach(node => {
    node.style.width = `${viewport.width}px`;
    node.style.height = `${viewport.height}px`;
    node.style.transform = `scale(${state.displayScale})`;
    node.style.transformOrigin = 'top left';
  });

  byId('safe-top-overlay').style.height = `${Math.round(viewport.safeTop * state.displayScale)}px`;
  byId('safe-bottom-overlay').style.height = `${Math.round(viewport.safeBottom * state.displayScale)}px`;

  const backgroundImage = await resolveBackgroundImage();
  canvas.style.background =
    `linear-gradient(180deg, rgba(6, 10, 19, 0.14), rgba(6, 10, 19, 0.54)), url("${backgroundImage}") center/cover no-repeat`;

  const activeBackground = getActiveBackgroundRule();
  const tintColor = activeBackground?.tintColor || '#000000';
  const tintOpacity = activeBackground?.tintOpacity || 0;

  canvas.innerHTML = '';
  const tint = document.createElement('div');
  tint.style.position = 'absolute';
  tint.style.inset = '0';
  tint.style.background = tintOpacity > 0 ? tintColor : 'transparent';
  tint.style.opacity = String(tintOpacity);
  tint.style.pointerEvents = 'none';
  canvas.appendChild(tint);

  const gridStep = state.gridSize * state.displayScale;
  gridOverlay.style.display = state.showGrid ? 'block' : 'none';
  gridOverlay.style.backgroundImage = state.showGrid
    ? `linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)`
    : 'none';
  gridOverlay.style.backgroundSize = `${gridStep}px ${gridStep}px`;

  const referenceViewport = state.manifest.referenceViewport || viewport;

  ELEMENT_DEFS[state.screenId].forEach(({id, label}) => {
    const rule = getRule(state.screenId, id);
    if (!rule.visible) {
      return;
    }

    const baseRect = scaleRect(PREVIEW_LAYOUT[state.screenId][id], viewport);
    const offset = resolveVisualOffset(
      rule.offsetX,
      rule.offsetY,
      viewport,
      referenceViewport,
      rule.safeAreaAware,
    );

    const card = document.createElement('div');
    card.className = `preview-element${state.elementId === id ? ' selected' : ''}${
      state.drag?.elementId === id ? ' dragging' : ''
    }`;
    card.dataset.elementId = id;
    card.style.left = `${baseRect.left + offset.x}px`;
    card.style.top = `${baseRect.top + offset.y}px`;
    card.style.width = `${baseRect.width}px`;
    card.style.height = `${baseRect.height}px`;
    card.style.opacity = String(rule.opacity);
    card.style.zIndex = String(20 + rule.zIndex);
    card.style.transform = `scale(${rule.scale})`;
    card.style.transformOrigin = 'top left';

    const header = document.createElement('div');
    header.className = 'preview-element-header';
    header.innerHTML = `<span>${label}</span><span>${rule.offsetX}, ${rule.offsetY}</span>`;
    card.appendChild(header);
    card.appendChild(renderElementBody(state.screenId, id));

    if (state.elementId === id) {
      ['tl', 'tr', 'bl', 'br'].forEach(handleId => {
        const handle = document.createElement('div');
        handle.className = `selection-handle ${handleId}`;
        card.appendChild(handle);
      });
    }

    card.addEventListener('pointerdown', event => {
      beginDrag(event, id);
    });
    card.addEventListener('click', event => {
      event.stopPropagation();
      state.elementId = id;
      refreshElementOptions();
      refreshInspectorFields();
      updateTopbar();
      scheduleRender();
    });

    canvas.appendChild(card);
  });

  renderRulers(viewport, state.displayScale);
  renderLayerList();
  refreshInspectorFields();
  updateTopbar();
  updateManifestJson();
  persistEditorPrefs();
}

function scheduleRender() {
  if (state.renderPending) {
    return;
  }
  state.renderPending = true;
  requestAnimationFrame(async () => {
    state.renderPending = false;
    await renderPreview();
  });
}

function beginDrag(event, elementId) {
  if (event.button !== 0) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();

  state.elementId = elementId;
  refreshElementOptions();
  refreshInspectorFields();

  const rule = getRule(state.screenId, elementId);
  state.drag = {
    elementId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalOffsetX: rule.offsetX,
    originalOffsetY: rule.offsetY,
  };

  document.body.classList.add('dragging-stage');
  setStatus(`Dragging ${elementId}`, 'success');
  scheduleRender();
}

function handlePointerMove(event) {
  if (!state.drag) {
    return;
  }

  const rule = getRule(state.screenId, state.drag.elementId);
  const deltaX = (event.clientX - state.drag.startClientX) / Math.max(state.displayScale, 0.01);
  const deltaY = (event.clientY - state.drag.startClientY) / Math.max(state.displayScale, 0.01);

  let nextX = state.drag.originalOffsetX + deltaX;
  let nextY = state.drag.originalOffsetY + deltaY;

  if (state.snapGrid) {
    nextX = Math.round(nextX / state.gridSize) * state.gridSize;
    nextY = Math.round(nextY / state.gridSize) * state.gridSize;
  }

  rule.offsetX = Math.round(nextX);
  rule.offsetY = Math.round(nextY);
  refreshInspectorFields();
  updateTopbar();
  updateManifestJson();
  scheduleRender();
}

function handlePointerUp() {
  if (!state.drag) {
    return;
  }
  document.body.classList.remove('dragging-stage');
  setStatus(`Placed ${state.drag.elementId}`, 'success');
  state.drag = null;
  persistEditorPrefs();
  scheduleRender();
}

function nudgeSelected(dx, dy) {
  const rule = getRule(state.screenId, state.elementId);
  rule.offsetX += dx;
  rule.offsetY += dy;
  refreshInspectorFields();
  updateTopbar();
  updateManifestJson();
  persistEditorPrefs();
  scheduleRender();
}

async function loadDraft() {
  const rows = await fetchJson('ui_config_draft?id=eq.1&select=*');
  if (!rows?.[0]?.config_json) {
    throw new Error('No draft row found.');
  }

  state.manifest = ensureManifest(rows[0].config_json);
  await preloadManifestAssets();
  syncBackgroundForm();
  setStatus('Draft loaded.', 'success');
  scheduleRender();
}

async function loadLatestRelease() {
  const rows = await fetchJson(
    'ui_config_releases?select=version,config_json,created_at,notes&order=version.desc&limit=1',
  );
  if (!rows?.[0]?.config_json) {
    throw new Error('No release rows found.');
  }

  state.manifest = ensureManifest(rows[0].config_json);
  byId('publish-notes').value = rows[0].notes || '';
  await preloadManifestAssets();
  syncBackgroundForm();
  setStatus(`Loaded release v${rows[0].version}.`, 'success');
  scheduleRender();
}

async function saveDraft() {
  updateRuleFromInspector();
  state.manifest.referenceViewport = getViewport();
  await fetchJson('ui_config_draft', {
    method: 'POST',
    body: JSON.stringify([{id: 1, config_json: state.manifest}]),
  });
  persistEditorPrefs();
  setStatus('Draft saved.', 'success');
}

async function publishManifestWithNotes(manifest, notes) {
  const latest = await fetchJson('ui_config_releases?select=version&order=version.desc&limit=1');
  const nextVersion = (latest?.[0]?.version || 0) + 1;
  manifest.version = nextVersion;
  await fetchJson('ui_config_releases', {
    method: 'POST',
    body: JSON.stringify([
      {
        version: nextVersion,
        config_json: manifest,
        notes: notes || `PC studio publish ${new Date().toISOString()}`,
      },
    ]),
  });
  state.manifest = ensureManifest(manifest);
  setStatus(`Published visual config v${nextVersion}.`, 'success');
  await refreshReleaseHistory();
  scheduleRender();
}

async function publishRelease() {
  updateRuleFromInspector();
  state.manifest.referenceViewport = getViewport();
  await saveDraft();
  await publishManifestWithNotes(clone(state.manifest), byId('publish-notes').value.trim());
}

async function refreshReleaseHistory() {
  const rows = await fetchJson(
    'ui_config_releases?select=version,config_json,created_at,notes&order=version.desc&limit=12',
  );
  state.releaseRows = rows ?? [];
  renderReleaseHistory();
}

function renderReleaseHistory() {
  const host = byId('release-history');
  host.innerHTML = '';

  if (!state.releaseRows.length) {
    const empty = document.createElement('div');
    empty.className = 'release-empty';
    empty.textContent = 'No release history loaded yet.';
    host.appendChild(empty);
    return;
  }

  state.releaseRows.forEach(row => {
    const card = document.createElement('div');
    card.className = 'release-row';

    const top = document.createElement('div');
    top.className = 'release-row-top';
    top.innerHTML = `<strong>v${row.version}</strong><small class="muted">${new Date(
      row.created_at,
    ).toLocaleString()}</small>`;
    card.appendChild(top);

    const notes = document.createElement('p');
    notes.className = 'muted';
    notes.textContent = row.notes || 'No notes';
    card.appendChild(notes);

    const actions = document.createElement('div');
    actions.className = 'release-actions';

    const loadButton = document.createElement('button');
    loadButton.className = 'secondary';
    loadButton.textContent = 'Load';
    loadButton.addEventListener('click', async () => {
      state.manifest = ensureManifest(row.config_json);
      await preloadManifestAssets();
      byId('publish-notes').value = row.notes || '';
      syncBackgroundForm();
      setStatus(`Loaded release v${row.version}.`, 'success');
      scheduleRender();
    });

    const rollbackButton = document.createElement('button');
    rollbackButton.className = 'secondary';
    rollbackButton.textContent = 'Rollback -> Publish';
    rollbackButton.addEventListener('click', async () => {
      const approved = window.confirm(
        `Create a new published release by copying v${row.version}?`,
      );
      if (!approved) {
        return;
      }

      try {
        await publishManifestWithNotes(
          ensureManifest(row.config_json),
          `Rollback to v${row.version} on ${new Date().toISOString()}`,
        );
      } catch (error) {
        setStatus(`Rollback failed: ${error.message}`, 'error');
      }
    });

    actions.appendChild(loadButton);
    actions.appendChild(rollbackButton);
    card.appendChild(actions);
    host.appendChild(card);
  });
}

async function loadAssetPreviewByInput() {
  const assetKey = byId('background-asset-key').value.trim();
  if (!assetKey) {
    renderBackgroundPreviewCard(null);
    setStatus('Enter an asset key to preview.', 'error');
    return;
  }

  try {
    const asset = await ensureAssetLoaded(assetKey);
    renderBackgroundPreviewCard(asset);
    setStatus(
      asset ? `Loaded asset ${assetKey}.` : `Asset ${assetKey} not found.`,
      asset ? 'success' : 'error',
    );
  } catch (error) {
    renderBackgroundPreviewCard(null);
    setStatus(`Asset preview failed: ${error.message}`, 'error');
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

async function uploadAsset() {
  const assetKey = byId('background-asset-key').value.trim();
  const file = byId('asset-file').files?.[0] ?? null;

  if (!assetKey || !file) {
    throw new Error('Asset key and image file are required.');
  }

  const dataUrl = await readFileAsDataUrl(file);
  const payload = {
    asset_key: assetKey,
    data_url: dataUrl,
    mime_type: file.type || 'image/png',
    content_hash: `${file.name}:${file.size}:${file.lastModified}`,
  };

  const rows = await fetchJson('ui_assets', {
    method: 'POST',
    body: JSON.stringify([payload]),
  });

  const stored = rows?.[0] ?? payload;
  state.assetCache.set(assetKey, stored);
  renderBackgroundPreviewCard(stored);
  setStatus(`Uploaded asset ${assetKey}.`, 'success');
}

function applyBackgroundRuleFromForm() {
  const store = getBackgroundStore();
  if (!store) {
    setStatus('This screen does not support background overrides.', 'error');
    return;
  }

  const key = byId('background-key').value.trim();
  if (!key) {
    setStatus('Background key is required.', 'error');
    return;
  }

  store[key] = sanitizeBackgroundRule({
    assetKey: byId('background-asset-key').value.trim(),
    tintColor: byId('background-tint-color').value,
    tintOpacity: byId('background-tint-opacity').value,
    removeImage: byId('background-remove-image').checked,
  });

  updateManifestJson();
  persistEditorPrefs();
  scheduleRender();
  setStatus(`Background override saved for key ${key}.`, 'success');
}

function clearBackgroundRuleFromForm() {
  const store = getBackgroundStore();
  if (!store) {
    return;
  }

  const key = byId('background-key').value.trim();
  if (!key) {
    return;
  }

  delete store[key];
  syncBackgroundForm();
  updateManifestJson();
  persistEditorPrefs();
  scheduleRender();
  setStatus(`Background override cleared for key ${key}.`, 'success');
}

async function applyManifestJson() {
  state.manifest = ensureManifest(JSON.parse(byId('manifest-json').value));
  await preloadManifestAssets();
  syncBackgroundForm();
  setStatus('Applied raw JSON to editor state.', 'success');
  scheduleRender();
}

async function copyManifestJson() {
  await navigator.clipboard.writeText(byId('manifest-json').value);
  setStatus('Manifest JSON copied.', 'success');
}

function setProfileFromManualViewport() {
  state.profileId = 'custom';
  byId('device-profile').value = 'custom';
}

function applyZoom(nextZoom) {
  state.zoom = clamp(numberOr(nextZoom, 1), 0.35, 3);
  byId('zoom-range').value = String(state.zoom);
  byId('zoom-value').value = String(state.zoom.toFixed(2));
  scheduleRender();
}

function bindEvents() {
  byId('screen-id').addEventListener('change', event => {
    state.screenId = event.target.value;
    if (!ELEMENT_DEFS[state.screenId].some(item => item.id === state.elementId)) {
      state.elementId = ELEMENT_DEFS[state.screenId][0].id;
    }
    refreshElementOptions();
    syncBackgroundForm();
    scheduleRender();
  });

  byId('element-id').addEventListener('change', event => {
    state.elementId = event.target.value;
    refreshInspectorFields();
    scheduleRender();
  });

  byId('device-profile').addEventListener('change', event => {
    state.profileId = event.target.value;
    syncViewportFields(getViewport());
    scheduleRender();
  });

  ['viewport-width', 'viewport-height', 'safe-top', 'safe-bottom'].forEach(id => {
    byId(id).addEventListener('input', () => {
      setProfileFromManualViewport();
      scheduleRender();
    });
  });

  byId('zoom-range').addEventListener('input', event => {
    applyZoom(event.target.value);
  });

  byId('zoom-value').addEventListener('change', event => {
    applyZoom(event.target.value);
  });

  byId('grid-size').addEventListener('change', event => {
    state.gridSize = clamp(Math.round(numberOr(event.target.value, 16)), 4, 32);
    scheduleRender();
  });

  byId('show-grid').addEventListener('change', event => {
    state.showGrid = event.target.checked;
    scheduleRender();
  });

  byId('snap-grid').addEventListener('change', event => {
    state.snapGrid = event.target.checked;
    persistEditorPrefs();
  });

  byId('preview-world').addEventListener('change', event => {
    state.previewWorld = Math.max(1, Math.round(numberOr(event.target.value, 1)));
    syncBackgroundForm();
    scheduleRender();
  });

  byId('preview-level').addEventListener('change', event => {
    state.previewLevel = Math.max(1, Math.round(numberOr(event.target.value, 1)));
    syncBackgroundForm();
    scheduleRender();
  });

  byId('preview-raid-stage').addEventListener('change', event => {
    state.previewRaidStage = Math.max(1, Math.round(numberOr(event.target.value, 1)));
    syncBackgroundForm();
    scheduleRender();
  });

  byId('background-scope').addEventListener('change', () => {
    syncBackgroundForm();
  });

  byId('apply-element').addEventListener('click', () => {
    updateRuleFromInspector();
    setStatus(`Applied inspector values to ${state.elementId}.`, 'success');
    scheduleRender();
  });

  byId('reset-element').addEventListener('click', () => {
    state.manifest.screens[state.screenId].elements[state.elementId] = clone(DEFAULT_RULE);
    refreshInspectorFields();
    setStatus(`Reset ${state.elementId}.`, 'success');
    scheduleRender();
  });

  byId('fit-stage').addEventListener('click', () => {
    applyZoom(1);
  });

  byId('actual-size').addEventListener('click', () => {
    const target = clamp(1 / Math.max(state.fitScale, 0.01), 0.35, 3);
    applyZoom(target);
  });

  byId('apply-background').addEventListener('click', () => {
    applyBackgroundRuleFromForm();
  });

  byId('clear-background').addEventListener('click', () => {
    clearBackgroundRuleFromForm();
  });

  byId('load-asset-preview').addEventListener('click', async () => {
    await loadAssetPreviewByInput();
  });

  byId('upload-asset').addEventListener('click', async () => {
    try {
      await uploadAsset();
    } catch (error) {
      setStatus(`Asset upload failed: ${error.message}`, 'error');
    }
  });

  byId('copy-json').addEventListener('click', async () => {
    try {
      await copyManifestJson();
    } catch (error) {
      setStatus(`Copy failed: ${error.message}`, 'error');
    }
  });

  byId('apply-json').addEventListener('click', () => {
    applyManifestJson().catch(error => {
      setStatus(`Apply JSON failed: ${error.message}`, 'error');
    });
  });

  byId('load-draft').addEventListener('click', async () => {
    try {
      await loadDraft();
    } catch (error) {
      setStatus(`Draft load failed: ${error.message}`, 'error');
    }
  });

  byId('load-latest').addEventListener('click', async () => {
    try {
      await loadLatestRelease();
    } catch (error) {
      setStatus(`Latest load failed: ${error.message}`, 'error');
    }
  });

  byId('save-draft').addEventListener('click', async () => {
    try {
      await saveDraft();
    } catch (error) {
      setStatus(`Draft save failed: ${error.message}`, 'error');
    }
  });

  byId('publish-release').addEventListener('click', async () => {
    try {
      await publishRelease();
    } catch (error) {
      setStatus(`Publish failed: ${error.message}`, 'error');
    }
  });

  byId('refresh-history').addEventListener('click', async () => {
    try {
      await refreshReleaseHistory();
      setStatus('Release history refreshed.', 'success');
    } catch (error) {
      setStatus(`History refresh failed: ${error.message}`, 'error');
    }
  });

  byId('nudge-up').addEventListener('click', () => nudgeSelected(0, -1));
  byId('nudge-down').addEventListener('click', () => nudgeSelected(0, 1));
  byId('nudge-left').addEventListener('click', () => nudgeSelected(-1, 0));
  byId('nudge-right').addEventListener('click', () => nudgeSelected(1, 0));

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('resize', () => scheduleRender());

  window.addEventListener('keydown', async event => {
    const tagName = document.activeElement?.tagName?.toLowerCase();
    const editingText = tagName === 'input' || tagName === 'textarea' || tagName === 'select';

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      try {
        await saveDraft();
      } catch (error) {
        setStatus(`Draft save failed: ${error.message}`, 'error');
      }
      return;
    }

    if (editingText) {
      return;
    }

    const step = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      nudgeSelected(0, -step);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      nudgeSelected(0, step);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      nudgeSelected(-step, 0);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      nudgeSelected(step, 0);
    } else if (event.key === 'g' || event.key === 'G') {
      state.showGrid = !state.showGrid;
      byId('show-grid').checked = state.showGrid;
      scheduleRender();
    }
  });

  ['supabase-url', 'supabase-anon', 'supabase-jwt'].forEach(id => {
    byId(id).addEventListener('change', persistEditorPrefs);
  });
}

async function bootstrap() {
  restoreEditorPrefs();
  refreshScreenOptions();
  refreshDeviceOptions();
  refreshElementOptions();
  refreshInspectorFields();
  byId('grid-size').value = String(state.gridSize);
  byId('show-grid').checked = state.showGrid;
  byId('snap-grid').checked = state.snapGrid;
  syncBackgroundForm();
  bindEvents();
  updateTopbar();
  updateManifestJson();
  renderReleaseHistory();
  scheduleRender();
}

bootstrap();
