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
    label: '갤럭시 S23 울트라',
    viewport: {width: 412, height: 915, safeTop: 34, safeBottom: 34},
  },
  {
    id: 'galaxy-a54',
    label: '갤럭시 A54',
    viewport: {width: 411, height: 891, safeTop: 32, safeBottom: 24},
  },
  {
    id: 'galaxy-fold-cover',
    label: '갤럭시 폴드 커버',
    viewport: {width: 360, height: 780, safeTop: 30, safeBottom: 24},
  },
  {
    id: 'iphone-15-pro',
    label: '아이폰 15 Pro',
    viewport: {width: 393, height: 852, safeTop: 59, safeBottom: 34},
  },
  {
    id: 'iphone-15-pro-max',
    label: '아이폰 15 Pro Max',
    viewport: {width: 430, height: 932, safeTop: 59, safeBottom: 34},
  },
  {
    id: 'tablet-portrait',
    label: '태블릿 세로',
    viewport: {width: 800, height: 1280, safeTop: 24, safeBottom: 20},
  },
  {
    id: 'custom',
    label: '직접 입력',
    viewport: DEFAULT_REFERENCE_VIEWPORT,
  },
];

const SCREEN_LABELS = {
  level: '레벨 모드',
  endless: '무한 모드',
  battle: '대전 모드',
  raid: '레이드 모드',
};

const ELEMENT_DEFS = {
  level: [
    {id: 'header', label: '상단 헤더'},
    {id: 'battle_lane', label: '전투 HUD'},
    {id: 'board', label: '블록 보드'},
    {id: 'piece_tray', label: '블록 트레이'},
    {id: 'item_bar', label: '아이템 바'},
    {id: 'combo_gauge', label: '콤보 게이지'},
  ],
  endless: [
    {id: 'header', label: '상단 헤더'},
    {id: 'status_bar', label: '상태 바'},
    {id: 'summon_panel', label: '소환 패널'},
    {id: 'next_preview', label: '다음 블록 패널'},
    {id: 'board', label: '블록 보드'},
    {id: 'piece_tray', label: '블록 트레이'},
    {id: 'item_bar', label: '아이템 바'},
    {id: 'combo_gauge', label: '콤보 게이지'},
  ],
  battle: [
    {id: 'back_button', label: '뒤로 버튼'},
    {id: 'opponent_panel', label: '상대 패널'},
    {id: 'attack_bar', label: '공격 바'},
    {id: 'board', label: '블록 보드'},
    {id: 'piece_tray', label: '블록 트레이'},
  ],
  raid: [
    {id: 'top_panel', label: '보스 패널'},
    {id: 'skill_bar', label: '스킬 바'},
    {id: 'info_bar', label: '정보 바'},
    {id: 'board', label: '블록 보드'},
    {id: 'piece_tray', label: '블록 트레이'},
    {id: 'combo_gauge', label: '콤보 게이지'},
  ],
};

const ELEMENT_HELP = {
  level: {
    header: {
      title: '상단 헤더',
      description: '하트, 골드, 다이아처럼 플레이 시작 전후 항상 눈에 보여야 하는 정보 묶음입니다.',
      tips: [
        '상단 안전영역을 켠 상태에서 노치와 겹치지 않게 맞추세요.',
        '보드와 가까우면 답답해 보이니 세로 간격을 조금 남겨두는 편이 안전합니다.',
      ],
    },
    battle_lane: {
      title: '전투 HUD',
      description: '내 캐릭터, 몬스터, 체력 바가 들어가는 전투 핵심 영역입니다.',
      tips: [
        '블록 보드와 겹치면 전투 연출이 답답해집니다.',
        '캐릭터와 몬스터가 잘리지 않게 좌우 여백을 함께 확인하세요.',
      ],
    },
    board: {
      title: '블록 보드',
      description: '실제 조작이 이루어지는 8x8 보드입니다. 가장 중요한 기준 요소입니다.',
      tips: [
        '보드는 가능하면 중앙 기준으로 두고, 다른 UI를 여기에 맞춰 배치하세요.',
        '상단 HUD와 하단 트레이를 동시에 침범하지 않도록 확인하세요.',
      ],
    },
    piece_tray: {
      title: '블록 트레이',
      description: '새 블록 3개가 놓이는 하단 선택 영역입니다.',
      tips: [
        '엄지손가락 조작을 고려해 하단 안전영역과 너무 붙지 않게 두세요.',
        '큰 조각이 나와도 보드가 밀리지 않는지 함께 확인하세요.',
      ],
    },
    item_bar: {
      title: '아이템 바',
      description: '폭탄, 새로고침 같은 아이템을 빠르게 누르는 버튼 영역입니다.',
      tips: [
        '트레이와 너무 가까우면 오터치가 납니다.',
        '전투 HUD보다 시선 우선순위가 낮으므로 크기를 과하게 키울 필요는 없습니다.',
      ],
    },
    combo_gauge: {
      title: '콤보 게이지',
      description: '콤보 유지 시간을 얇게 보여주는 보조 오버레이입니다.',
      tips: [
        '보드 내부 상단에 반투명하게 두는 구성이 가장 안정적입니다.',
        '대미지 숫자나 전투 연출과 겹치지 않는지 꼭 확인하세요.',
      ],
    },
  },
  endless: {
    header: {
      title: '상단 헤더',
      description: '점수와 재화처럼 무한 모드 전반 정보를 보여주는 상단 요약 영역입니다.',
      tips: ['길게 늘이지 말고 가독성이 먼저 보이게 정리하세요.'],
    },
    status_bar: {
      title: '상태 바',
      description: '현재 점수, 레벨, 진행 상태를 빠르게 읽는 바입니다.',
      tips: ['보드와 너무 붙으면 화면이 눌려 보이므로 완급을 주세요.'],
    },
    summon_panel: {
      title: '소환 패널',
      description: '소환 관련 정보와 버프 상태가 들어가는 보조 패널입니다.',
      tips: ['상태 바보다 낮은 우선순위이므로 보드 침범을 피하세요.'],
    },
    next_preview: {
      title: '다음 블록 패널',
      description: '다음에 등장할 블록 흐름을 미리 읽게 해주는 영역입니다.',
      tips: ['가시성이 중요하지만 보드를 밀 정도로 크게 둘 필요는 없습니다.'],
    },
    board: {
      title: '블록 보드',
      description: '무한 모드 핵심 조작 영역입니다. 다른 요소 배치는 항상 보드 기준으로 맞춥니다.',
      tips: ['화면 중심과 시선 흐름을 동시에 맞추는 기준 요소로 보세요.'],
    },
    piece_tray: {
      title: '블록 트레이',
      description: '실제 블록을 집는 영역입니다.',
      tips: ['하단 제스처 영역과 겹치지 않게 여유를 남기세요.'],
    },
    item_bar: {
      title: '아이템 바',
      description: '즉시 사용형 보조 버튼 영역입니다.',
      tips: ['트레이 위에 떠 있는 느낌으로 두되, 조작 가림은 피하세요.'],
    },
    combo_gauge: {
      title: '콤보 게이지',
      description: '무한 모드 콤보 유지 시간을 보여주는 얇은 보조 바입니다.',
      tips: ['점수 숫자보다 덜 튀게, 그러나 보일 만큼은 확보하세요.'],
    },
  },
  battle: {
    back_button: {
      title: '뒤로 버튼',
      description: '대전 모드에서 빠르게 이탈할 수 있는 버튼입니다.',
      tips: ['상단 안전영역을 켜고, 한 손으로도 누르기 쉬운 위치인지 보세요.'],
    },
    opponent_panel: {
      title: '상대 패널',
      description: '상대 아바타, 체력, 상태를 보여주는 핵심 대전 정보 패널입니다.',
      tips: ['보드보다 우선순위는 낮지만, 읽기 어려우면 대전성이 떨어집니다.'],
    },
    attack_bar: {
      title: '공격 바',
      description: '대전의 공격 압박감과 흐름을 전달하는 상태 바입니다.',
      tips: ['보드와의 간격을 충분히 두면 더 안정적으로 보입니다.'],
    },
    board: {
      title: '블록 보드',
      description: '대전 모드 실조작 영역입니다.',
      tips: ['공격 바와 하단 트레이 사이의 중심축을 유지하세요.'],
    },
    piece_tray: {
      title: '블록 트레이',
      description: '대전 중 새 블록을 선택하는 영역입니다.',
      tips: ['채팅/재도전 모달이 떠도 조작이 막히지 않는 위치를 유지하세요.'],
    },
  },
  raid: {
    top_panel: {
      title: '보스 패널',
      description: '보스 스프라이트, HP, 핵심 레이드 정보가 들어가는 영역입니다.',
      tips: [
        '보드보다 위에 있으면서도 과도하게 커지지 않게 조절하세요.',
        '보스 이미지가 잘리거나 뒤 배경 상자가 보이지 않는지 확인하세요.',
      ],
    },
    skill_bar: {
      title: '스킬 바',
      description: '레이드 전용 스킬과 즉시 사용 UI가 들어가는 라인입니다.',
      tips: ['보드 시작선과 간섭이 없게 세로 여백을 확보하세요.'],
    },
    info_bar: {
      title: '정보 바',
      description: '보조 지표를 표시하는 좁은 정보 영역입니다.',
      tips: ['설명 텍스트를 많이 넣기보다 핵심 수치 위주로 배치하는 것이 안정적입니다.'],
    },
    board: {
      title: '블록 보드',
      description: '레이드 조작 중심 영역입니다.',
      tips: ['콤보 게이지, 대미지 숫자, 보스 패널과 동시 충돌 여부를 꼭 확인하세요.'],
    },
    piece_tray: {
      title: '블록 트레이',
      description: '레이드에서 다음 수를 고르는 하단 조작 영역입니다.',
      tips: ['콤보 게이지가 이 영역을 가리지 않도록 유지하세요.'],
    },
    combo_gauge: {
      title: '콤보 게이지',
      description: '레이드에서도 공통으로 쓰는 보드 상단 반투명 콤보 바입니다.',
      tips: ['대미지 숫자 위가 아니라 보드 상단 내부에 얇게 두는 구성이 가장 안전합니다.'],
    },
  },
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

function getElementMeta(screenId, elementId) {
  return ELEMENT_DEFS[screenId]?.find(item => item.id === elementId) ?? null;
}

function formatElementLabel(screenId, elementId, includeId = true) {
  const meta = getElementMeta(screenId, elementId);
  if (!meta) {
    return elementId;
  }
  return includeId ? `${meta.label} (${meta.id})` : meta.label;
}

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
    `${viewport.width} x ${viewport.height}, 안전영역 ${viewport.safeTop} / ${viewport.safeBottom}`;
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
  byId('topbar-selection-label').textContent = formatElementLabel(state.screenId, state.elementId);
  byId('topbar-reference-label').textContent =
    `${state.manifest.referenceViewport.width} x ${state.manifest.referenceViewport.height}`;
  byId('stage-screen-pill').textContent = SCREEN_LABELS[state.screenId];
  byId('stage-selection-pill').textContent = formatElementLabel(state.screenId, state.elementId, false);
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

function renderElementHelp() {
  const help =
    ELEMENT_HELP[state.screenId]?.[state.elementId] ?? {
      title: formatElementLabel(state.screenId, state.elementId, false),
      description: '선택한 요소의 역할과 조정 팁이 여기에 표시됩니다.',
      tips: ['레이아웃 충돌과 안전영역 여부를 먼저 확인하세요.'],
    };

  byId('element-help-title').textContent = help.title;
  byId('element-help-description').textContent = help.description;

  const tipsHost = byId('element-help-tips');
  tipsHost.innerHTML = '';
  (help.tips || []).forEach(tip => {
    const item = document.createElement('li');
    item.textContent = tip;
    tipsHost.appendChild(item);
  });
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
          {value: 'world', label: '월드 기본 배경'},
          {value: 'level', label: '특정 레벨 배경'},
        ]
      : state.screenId === 'raid'
        ? [{value: 'bossStage', label: '레이드 단계 배경'}]
        : [];

  if (!options.length) {
    const option = document.createElement('option');
    option.value = 'none';
    option.textContent = '이 화면은 배경 오버라이드를 지원하지 않습니다';
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
    ['체력', '공격', '콤보'].forEach(label => {
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
    ['골드', '다이아', '하트'].forEach(label => {
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
    chip.textContent = '뒤로';
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
      renderElementHelp();
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
    title.textContent = '에셋 미리보기 없음';
    meta.textContent = '저장된 에셋 키를 넣거나 새 배경 이미지를 업로드하세요.';
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
  renderElementHelp();
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
  setStatus(`${formatElementLabel(state.screenId, elementId, false)} 이동 중`, 'success');
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
  setStatus(`${formatElementLabel(state.screenId, state.drag.elementId, false)} 위치 적용`, 'success');
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
    throw new Error('드래프트가 없습니다.');
  }

  state.manifest = ensureManifest(rows[0].config_json);
  await preloadManifestAssets();
  syncBackgroundForm();
  setStatus('드래프트를 불러왔습니다.', 'success');
  scheduleRender();
}

async function loadLatestRelease() {
  const rows = await fetchJson(
    'ui_config_releases?select=version,config_json,created_at,notes&order=version.desc&limit=1',
  );
  if (!rows?.[0]?.config_json) {
    throw new Error('배포 이력이 없습니다.');
  }

  state.manifest = ensureManifest(rows[0].config_json);
  byId('publish-notes').value = rows[0].notes || '';
  await preloadManifestAssets();
  syncBackgroundForm();
  setStatus(`배포본 v${rows[0].version}을 불러왔습니다.`, 'success');
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
  setStatus('드래프트를 저장했습니다.', 'success');
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
        notes: notes || `PC 스튜디오 배포 ${new Date().toISOString()}`,
      },
    ]),
  });
  state.manifest = ensureManifest(manifest);
  setStatus(`비주얼 설정 v${nextVersion}을 배포했습니다.`, 'success');
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
    empty.textContent = '불러온 배포 이력이 없습니다.';
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
    notes.textContent = row.notes || '메모 없음';
    card.appendChild(notes);

    const actions = document.createElement('div');
    actions.className = 'release-actions';

    const loadButton = document.createElement('button');
    loadButton.className = 'secondary';
    loadButton.textContent = '이 버전 열기';
    loadButton.addEventListener('click', async () => {
      state.manifest = ensureManifest(row.config_json);
      await preloadManifestAssets();
      byId('publish-notes').value = row.notes || '';
      syncBackgroundForm();
      setStatus(`배포본 v${row.version}을 불러왔습니다.`, 'success');
      scheduleRender();
    });

    const rollbackButton = document.createElement('button');
    rollbackButton.className = 'secondary';
    rollbackButton.textContent = '이 버전으로 롤백 배포';
    rollbackButton.addEventListener('click', async () => {
      const approved = window.confirm(
        `v${row.version} 설정을 복사해서 새 배포본으로 올릴까요?`,
      );
      if (!approved) {
        return;
      }

      try {
        await publishManifestWithNotes(
          ensureManifest(row.config_json),
          `v${row.version} 기준 롤백 배포 ${new Date().toISOString()}`,
        );
      } catch (error) {
        setStatus(`롤백 배포 실패: ${error.message}`, 'error');
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
    setStatus('미리볼 에셋 키를 먼저 입력하세요.', 'error');
    return;
  }

  try {
    const asset = await ensureAssetLoaded(assetKey);
    renderBackgroundPreviewCard(asset);
    setStatus(
      asset ? `에셋 ${assetKey}를 불러왔습니다.` : `에셋 ${assetKey}를 찾지 못했습니다.`,
      asset ? 'success' : 'error',
    );
  } catch (error) {
    renderBackgroundPreviewCard(null);
    setStatus(`에셋 미리보기 실패: ${error.message}`, 'error');
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

async function uploadAsset() {
  const assetKey = byId('background-asset-key').value.trim();
  const file = byId('asset-file').files?.[0] ?? null;

  if (!assetKey || !file) {
    throw new Error('에셋 키와 이미지 파일이 모두 필요합니다.');
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
  setStatus(`에셋 ${assetKey}를 업로드했습니다.`, 'success');
}

function applyBackgroundRuleFromForm() {
  const store = getBackgroundStore();
  if (!store) {
    setStatus('이 화면은 배경 오버라이드를 지원하지 않습니다.', 'error');
    return;
  }

  const key = byId('background-key').value.trim();
  if (!key) {
    setStatus('배경 대상 키가 필요합니다.', 'error');
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
  setStatus(`배경 ${key} 설정을 저장했습니다.`, 'success');
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
  setStatus(`배경 ${key} 설정을 초기화했습니다.`, 'success');
}

async function applyManifestJson() {
  state.manifest = ensureManifest(JSON.parse(byId('manifest-json').value));
  await preloadManifestAssets();
  syncBackgroundForm();
  setStatus('원본 JSON을 에디터 상태에 반영했습니다.', 'success');
  scheduleRender();
}

async function copyManifestJson() {
  await navigator.clipboard.writeText(byId('manifest-json').value);
  setStatus('원본 JSON을 복사했습니다.', 'success');
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
    renderElementHelp();
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
    setStatus(`${formatElementLabel(state.screenId, state.elementId, false)} 속성을 적용했습니다.`, 'success');
    scheduleRender();
  });

  byId('reset-element').addEventListener('click', () => {
    state.manifest.screens[state.screenId].elements[state.elementId] = clone(DEFAULT_RULE);
    refreshInspectorFields();
    renderElementHelp();
    setStatus(`${formatElementLabel(state.screenId, state.elementId, false)} 값을 초기화했습니다.`, 'success');
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
      setStatus(`에셋 업로드 실패: ${error.message}`, 'error');
    }
  });

  byId('copy-json').addEventListener('click', async () => {
    try {
      await copyManifestJson();
    } catch (error) {
      setStatus(`복사 실패: ${error.message}`, 'error');
    }
  });

  byId('apply-json').addEventListener('click', () => {
    applyManifestJson().catch(error => {
      setStatus(`JSON 적용 실패: ${error.message}`, 'error');
    });
  });

  byId('load-draft').addEventListener('click', async () => {
    try {
      await loadDraft();
    } catch (error) {
      setStatus(`드래프트 불러오기 실패: ${error.message}`, 'error');
    }
  });

  byId('load-latest').addEventListener('click', async () => {
    try {
      await loadLatestRelease();
    } catch (error) {
      setStatus(`최신 배포 불러오기 실패: ${error.message}`, 'error');
    }
  });

  byId('save-draft').addEventListener('click', async () => {
    try {
      await saveDraft();
    } catch (error) {
      setStatus(`드래프트 저장 실패: ${error.message}`, 'error');
    }
  });

  byId('publish-release').addEventListener('click', async () => {
    try {
      await publishRelease();
    } catch (error) {
      setStatus(`배포 실패: ${error.message}`, 'error');
    }
  });

  byId('refresh-history').addEventListener('click', async () => {
    try {
      await refreshReleaseHistory();
      setStatus('배포 이력을 새로고침했습니다.', 'success');
    } catch (error) {
      setStatus(`배포 이력 새로고침 실패: ${error.message}`, 'error');
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
        setStatus(`드래프트 저장 실패: ${error.message}`, 'error');
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
  renderElementHelp();
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
