import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  cloneVisualConfigManifest,
  collectReferencedVisualAssetKeys,
  DEFAULT_VISUAL_CONFIG_MANIFEST,
  sanitizeVisualConfigManifest,
  type VisualConfigManifest,
} from '../game/visualConfig';
import {getCurrentUserId, supabase} from './supabase';

const VISUAL_CONFIG_CACHE_KEY = 'visual_config_manifest_v1';
const VISUAL_ASSET_URI_CACHE_KEY = 'visual_config_asset_uris_v1';
const VISUAL_CACHE_DIR = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/visual-config`;
const VISUAL_DRAFT_ROW_ID = 1;

type VisualConfigListener = (snapshot: VisualConfigSnapshot) => void;

type VisualConfigReleaseRow = {
  version: number;
  config_json: unknown;
  created_at: string;
  notes: string | null;
};

type VisualConfigDraftRow = {
  id: number;
  config_json: unknown;
  updated_at: string;
};

type VisualAssetRow = {
  asset_key: string;
  data_url: string;
  mime_type: string | null;
  content_hash: string | null;
  updated_at?: string;
};

export type VisualConfigSnapshot = {
  manifest: VisualConfigManifest;
  assetUris: Record<string, string>;
};

let cacheLoaded = false;
let cachedManifest = cloneVisualConfigManifest(DEFAULT_VISUAL_CONFIG_MANIFEST);
let cachedAssetUris: Record<string, string> = {};
let downloadInFlight: Promise<VisualConfigSnapshot> | null = null;
const listeners = new Set<VisualConfigListener>();

function cloneSnapshot(): VisualConfigSnapshot {
  return {
    manifest: cloneVisualConfigManifest(cachedManifest),
    assetUris: {...cachedAssetUris},
  };
}

function notifyListeners() {
  const snapshot = cloneSnapshot();
  listeners.forEach(listener => listener(snapshot));
}

function inferFileExtension(mimeType: string | null, dataUrl: string) {
  const value = (mimeType ?? dataUrl.match(/^data:([^;]+);/i)?.[1] ?? '').toLowerCase();
  if (value.includes('png')) {
    return 'png';
  }
  if (value.includes('webp')) {
    return 'webp';
  }
  return 'jpg';
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }
  return {
    mimeType: match[1],
    base64: match[2],
  };
}

function hashString(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return Math.abs(hash >>> 0).toString(16);
}

function sanitizeAssetFileStem(assetKey: string) {
  return assetKey.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function ensureVisualCacheDir() {
  const exists = await ReactNativeBlobUtil.fs.isDir(VISUAL_CACHE_DIR);
  if (!exists) {
    await ReactNativeBlobUtil.fs.mkdir(VISUAL_CACHE_DIR);
  }
}

async function cacheVisualAsset(row: VisualAssetRow) {
  const parsed = parseDataUrl(row.data_url);
  if (!parsed) {
    return null;
  }

  await ensureVisualCacheDir();

  const extension = inferFileExtension(row.mime_type ?? parsed.mimeType, row.data_url);
  const fileStem = sanitizeAssetFileStem(row.asset_key);
  const fileHash = row.content_hash || hashString(row.data_url);
  const filePath = `${VISUAL_CACHE_DIR}/${fileStem}_${fileHash}.${extension}`;
  const exists = await ReactNativeBlobUtil.fs.exists(filePath);
  if (!exists) {
    await ReactNativeBlobUtil.fs.writeFile(filePath, parsed.base64, 'base64');
  }
  return `file://${filePath}`;
}

async function persistVisualConfigCache() {
  await AsyncStorage.setItem(
    VISUAL_CONFIG_CACHE_KEY,
    JSON.stringify(cachedManifest),
  );
  await AsyncStorage.setItem(
    VISUAL_ASSET_URI_CACHE_KEY,
    JSON.stringify(cachedAssetUris),
  );
}

async function fetchLatestPublishedRelease() {
  const {data, error} = await supabase
    .from('ui_config_releases')
    .select('version, config_json, created_at, notes')
    .order('version', {ascending: false})
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as VisualConfigReleaseRow | null) ?? null;
}

async function fetchAssetRows(assetKeys: string[]) {
  if (assetKeys.length === 0) {
    return [] as VisualAssetRow[];
  }

  const {data, error} = await supabase
    .from('ui_assets')
    .select('asset_key, data_url, mime_type, content_hash, updated_at')
    .in('asset_key', assetKeys);

  if (error) {
    throw error;
  }

  return (data as VisualAssetRow[] | null) ?? [];
}

export function getCachedVisualConfigSnapshot(): VisualConfigSnapshot {
  return cloneSnapshot();
}

export function getCachedVisualConfigManifest(): VisualConfigManifest {
  return cloneVisualConfigManifest(cachedManifest);
}

export function getCachedVisualAssetUri(assetKey: string): string | null {
  return cachedAssetUris[assetKey] ?? null;
}

export function subscribeVisualConfig(listener: VisualConfigListener) {
  listeners.add(listener);
  listener(cloneSnapshot());
  return () => {
    listeners.delete(listener);
  };
}

export async function loadCachedVisualConfigManifest() {
  if (cacheLoaded) {
    return cloneSnapshot();
  }

  cacheLoaded = true;

  try {
    const manifestRaw = await AsyncStorage.getItem(VISUAL_CONFIG_CACHE_KEY);
    const assetUrisRaw = await AsyncStorage.getItem(VISUAL_ASSET_URI_CACHE_KEY);

    if (manifestRaw) {
      cachedManifest = sanitizeVisualConfigManifest(JSON.parse(manifestRaw));
    }
    if (assetUrisRaw) {
      cachedAssetUris = JSON.parse(assetUrisRaw) ?? {};
    }
  } catch {}

  notifyListeners();
  return cloneSnapshot();
}

export async function downloadPublishedVisualConfigIfNeeded(force = false) {
  await loadCachedVisualConfigManifest();

  if (downloadInFlight) {
    return downloadInFlight;
  }

  downloadInFlight = (async () => {
    const latestRelease = await fetchLatestPublishedRelease();
    if (!latestRelease) {
      return cloneSnapshot();
    }

    const incomingManifest = sanitizeVisualConfigManifest(latestRelease.config_json as
      | Partial<VisualConfigManifest>
      | undefined);
    incomingManifest.version = Number(latestRelease.version) || 0;

    if (!force && incomingManifest.version === cachedManifest.version) {
      return cloneSnapshot();
    }

    const nextAssetUris: Record<string, string> = {};
    const assetKeys = collectReferencedVisualAssetKeys(incomingManifest);
    const assetRows = await fetchAssetRows(assetKeys);
    for (const row of assetRows) {
      const uri = await cacheVisualAsset(row);
      if (uri) {
        nextAssetUris[row.asset_key] = uri;
      }
    }

    cachedManifest = incomingManifest;
    cachedAssetUris = nextAssetUris;
    await persistVisualConfigCache();
    notifyListeners();
    return cloneSnapshot();
  })();

  try {
    return await downloadInFlight;
  } finally {
    downloadInFlight = null;
  }
}

export async function fetchVisualConfigDraft() {
  const {data, error} = await supabase
    .from('ui_config_draft')
    .select('id, config_json, updated_at')
    .eq('id', VISUAL_DRAFT_ROW_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return sanitizeVisualConfigManifest((data as VisualConfigDraftRow).config_json as
      | Partial<VisualConfigManifest>
      | undefined);
  }

  const latestRelease = await fetchLatestPublishedRelease();
  if (!latestRelease) {
    return cloneVisualConfigManifest(DEFAULT_VISUAL_CONFIG_MANIFEST);
  }

  const manifest = sanitizeVisualConfigManifest(latestRelease.config_json as
    | Partial<VisualConfigManifest>
    | undefined);
  manifest.version = Number(latestRelease.version) || 0;
  return manifest;
}

export async function saveVisualConfigDraft(manifest: VisualConfigManifest) {
  const userId = await getCurrentUserId();
  const payload = sanitizeVisualConfigManifest(manifest);
  const {error} = await supabase.from('ui_config_draft').upsert(
    {
      id: VISUAL_DRAFT_ROW_ID,
      config_json: payload,
      updated_by: userId,
    },
    {onConflict: 'id'},
  );

  if (error) {
    throw error;
  }

  return payload;
}

export async function fetchVisualConfigReleaseHistory(limitCount = 8) {
  const {data, error} = await supabase
    .from('ui_config_releases')
    .select('version, created_at, notes')
    .order('version', {ascending: false})
    .limit(Math.max(1, Math.min(limitCount, 20)));

  if (error) {
    throw error;
  }

  return (data as Pick<VisualConfigReleaseRow, 'version' | 'created_at' | 'notes'>[] | null) ?? [];
}

export async function publishVisualConfigDraft(notes: string) {
  const userId = await getCurrentUserId();
  const draft = await fetchVisualConfigDraft();
  const latestRelease = await fetchLatestPublishedRelease();
  const nextVersion = (latestRelease?.version ?? 0) + 1;
  const nextManifest = sanitizeVisualConfigManifest({
    ...draft,
    version: nextVersion,
  });
  const publishedManifest = sanitizeVisualConfigManifest({
    ...nextManifest,
    studioSnapshots: {},
  });

  const {error} = await supabase.from('ui_config_releases').insert({
    version: nextVersion,
    config_json: publishedManifest,
    notes: notes.trim() || null,
    created_by: userId,
  });

  if (error) {
    throw error;
  }

  await saveVisualConfigDraft(nextManifest);
  await downloadPublishedVisualConfigIfNeeded(true);
  return nextVersion;
}

export async function rollbackVisualConfig(version: number) {
  const {data, error} = await supabase
    .from('ui_config_releases')
    .select('version, config_json, created_at, notes')
    .eq('version', version)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('되돌릴 UI 설정 버전을 찾을 수 없습니다.');
  }

  const manifest = sanitizeVisualConfigManifest((data as VisualConfigReleaseRow).config_json as
    | Partial<VisualConfigManifest>
    | undefined);
  await saveVisualConfigDraft(manifest);
  return publishVisualConfigDraft(`Rollback to v${version}`);
}

export async function uploadVisualAsset({
  assetKey,
  dataUrl,
  mimeType,
}: {
  assetKey: string;
  dataUrl: string;
  mimeType: string;
}) {
  const userId = await getCurrentUserId();
  const contentHash = hashString(dataUrl);
  const {error} = await supabase.from('ui_assets').upsert(
    {
      asset_key: assetKey,
      data_url: dataUrl,
      mime_type: mimeType,
      content_hash: contentHash,
      updated_by: userId,
    },
    {onConflict: 'asset_key'},
  );

  if (error) {
    throw error;
  }

  const uri = await cacheVisualAsset({
    asset_key: assetKey,
    data_url: dataUrl,
    mime_type: mimeType,
    content_hash: contentHash,
  });

  if (uri) {
    cachedAssetUris = {
      ...cachedAssetUris,
      [assetKey]: uri,
    };
    await AsyncStorage.setItem(
      VISUAL_ASSET_URI_CACHE_KEY,
      JSON.stringify(cachedAssetUris),
    );
    notifyListeners();
  }

  return {
    assetKey,
    contentHash,
    uri,
  };
}
