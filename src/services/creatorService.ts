import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  buildDefaultCreatorManifest,
  cloneCreatorManifest,
  collectReferencedCreatorAssetKeys,
  sanitizeCreatorManifest,
  type CreatorManifest,
} from '../game/creatorManifest';
import {getCurrentUserId, supabase} from './supabase';

const CREATOR_MANIFEST_CACHE_KEY = 'creator_manifest_v1';
const CREATOR_ASSET_URI_CACHE_KEY = 'creator_asset_uris_v1';
const CREATOR_CACHE_DIR = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/creator-config`;
const CREATOR_DRAFT_ROW_ID = 1;

type CreatorConfigListener = (snapshot: CreatorConfigSnapshot) => void;

type CreatorReleaseRow = {
  version: number;
  manifest_json: unknown;
  created_at: string;
  notes: string | null;
};

type CreatorDraftRow = {
  id: number;
  manifest_json: unknown;
  updated_at: string;
};

type CreatorAssetRow = {
  asset_key: string;
  data_url: string;
  mime_type: string | null;
  content_hash: string | null;
};

export type CreatorConfigSnapshot = {
  manifest: CreatorManifest;
  assetUris: Record<string, string>;
};

let cacheLoaded = false;
let cachedManifest = cloneCreatorManifest(buildDefaultCreatorManifest());
let cachedAssetUris: Record<string, string> = {};
let downloadInFlight: Promise<CreatorConfigSnapshot> | null = null;
const listeners = new Set<CreatorConfigListener>();

function cloneSnapshot(): CreatorConfigSnapshot {
  return {
    manifest: cloneCreatorManifest(cachedManifest),
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

async function ensureCreatorCacheDir() {
  const exists = await ReactNativeBlobUtil.fs.isDir(CREATOR_CACHE_DIR);
  if (!exists) {
    await ReactNativeBlobUtil.fs.mkdir(CREATOR_CACHE_DIR);
  }
}

async function cacheCreatorAsset(row: CreatorAssetRow) {
  const parsed = parseDataUrl(row.data_url);
  if (!parsed) {
    return null;
  }

  await ensureCreatorCacheDir();

  const extension = inferFileExtension(row.mime_type ?? parsed.mimeType, row.data_url);
  const fileStem = sanitizeAssetFileStem(row.asset_key);
  const fileHash = row.content_hash || hashString(row.data_url);
  const filePath = `${CREATOR_CACHE_DIR}/${fileStem}_${fileHash}.${extension}`;
  const exists = await ReactNativeBlobUtil.fs.exists(filePath);
  if (!exists) {
    await ReactNativeBlobUtil.fs.writeFile(filePath, parsed.base64, 'base64');
  }
  return `file://${filePath}`;
}

async function persistCreatorCache() {
  await AsyncStorage.setItem(
    CREATOR_MANIFEST_CACHE_KEY,
    JSON.stringify(cachedManifest),
  );
  await AsyncStorage.setItem(
    CREATOR_ASSET_URI_CACHE_KEY,
    JSON.stringify(cachedAssetUris),
  );
}

async function fetchLatestPublishedRelease() {
  const {data, error} = await supabase
    .from('creator_releases')
    .select('version, manifest_json, created_at, notes')
    .order('version', {ascending: false})
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as CreatorReleaseRow | null) ?? null;
}

async function fetchAssetRows(assetKeys: string[]) {
  if (assetKeys.length === 0) {
    return [] as CreatorAssetRow[];
  }

  const {data, error} = await supabase
    .from('ui_assets')
    .select('asset_key, data_url, mime_type, content_hash')
    .in('asset_key', assetKeys);

  if (error) {
    throw error;
  }

  return (data as CreatorAssetRow[] | null) ?? [];
}

export function getCachedCreatorConfigSnapshot(): CreatorConfigSnapshot {
  return cloneSnapshot();
}

export function getCachedCreatorManifest(): CreatorManifest {
  return cloneCreatorManifest(cachedManifest);
}

export function getCachedCreatorAssetUri(assetKey: string): string | null {
  return cachedAssetUris[assetKey] ?? null;
}

export function subscribeCreatorConfig(listener: CreatorConfigListener) {
  listeners.add(listener);
  listener(cloneSnapshot());
  return () => {
    listeners.delete(listener);
  };
}

export async function loadCachedCreatorManifest() {
  if (cacheLoaded) {
    return cloneSnapshot();
  }

  cacheLoaded = true;

  try {
    const manifestRaw = await AsyncStorage.getItem(CREATOR_MANIFEST_CACHE_KEY);
    const assetUrisRaw = await AsyncStorage.getItem(CREATOR_ASSET_URI_CACHE_KEY);

    if (manifestRaw) {
      cachedManifest = sanitizeCreatorManifest(JSON.parse(manifestRaw));
    }
    if (assetUrisRaw) {
      cachedAssetUris = JSON.parse(assetUrisRaw) ?? {};
    }
  } catch {}

  notifyListeners();
  return cloneSnapshot();
}

export async function downloadPublishedCreatorManifestIfNeeded(force = false) {
  await loadCachedCreatorManifest();

  if (downloadInFlight) {
    return downloadInFlight;
  }

  downloadInFlight = (async () => {
    const latestRelease = await fetchLatestPublishedRelease();
    if (!latestRelease) {
      return cloneSnapshot();
    }

    const incomingManifest = sanitizeCreatorManifest(
      latestRelease.manifest_json as Partial<CreatorManifest> | undefined,
    );
    incomingManifest.version = Number(latestRelease.version) || 0;

    if (!force && incomingManifest.version === cachedManifest.version) {
      return cloneSnapshot();
    }

    const nextAssetUris: Record<string, string> = {};
    const assetKeys = collectReferencedCreatorAssetKeys(incomingManifest);
    const assetRows = await fetchAssetRows(assetKeys);
    for (const row of assetRows) {
      const uri = await cacheCreatorAsset(row);
      if (uri) {
        nextAssetUris[row.asset_key] = uri;
      }
    }

    cachedManifest = incomingManifest;
    cachedAssetUris = nextAssetUris;
    await persistCreatorCache();
    notifyListeners();
    return cloneSnapshot();
  })();

  try {
    return await downloadInFlight;
  } finally {
    downloadInFlight = null;
  }
}

export async function fetchCreatorDraft() {
  const {data, error} = await supabase
    .from('creator_draft')
    .select('id, manifest_json, updated_at')
    .eq('id', CREATOR_DRAFT_ROW_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const draftRow = data as CreatorDraftRow | null;
  if (draftRow?.manifest_json) {
    return sanitizeCreatorManifest(
      draftRow.manifest_json as Partial<CreatorManifest> | undefined,
    );
  }

  const latestRelease = await fetchLatestPublishedRelease();
  if (latestRelease) {
    const manifest = sanitizeCreatorManifest(
      latestRelease.manifest_json as Partial<CreatorManifest> | undefined,
    );
    manifest.version = Number(latestRelease.version) || 0;
    return manifest;
  }

  return cloneCreatorManifest(buildDefaultCreatorManifest());
}

export async function saveCreatorDraft(manifest: CreatorManifest) {
  const userId = await getCurrentUserId();
  const payload = sanitizeCreatorManifest(manifest);
  const {error} = await supabase.from('creator_draft').upsert(
    {
      id: CREATOR_DRAFT_ROW_ID,
      manifest_json: payload,
      updated_by: userId,
    },
    {onConflict: 'id'},
  );

  if (error) {
    throw error;
  }

  return payload;
}

export async function ensureCreatorDraftSeeded() {
  const {data, error} = await supabase
    .from('creator_draft')
    .select('id, manifest_json')
    .eq('id', CREATOR_DRAFT_ROW_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const draftRow = data as CreatorDraftRow | null;
  const draftManifest = draftRow?.manifest_json
    ? sanitizeCreatorManifest(draftRow.manifest_json as Partial<CreatorManifest> | undefined)
    : null;
  const hasSeededDraft =
    draftManifest &&
    Object.keys(draftManifest.levels).length > 0 &&
    Object.keys(draftManifest.encounters).length > 0;

  if (hasSeededDraft) {
    return draftManifest;
  }

  const defaultManifest = buildDefaultCreatorManifest();
  await saveCreatorDraft(defaultManifest);
  return defaultManifest;
}

export async function fetchCreatorReleaseHistory(limitCount = 8) {
  const {data, error} = await supabase
    .from('creator_releases')
    .select('version, created_at, notes')
    .order('version', {ascending: false})
    .limit(Math.max(1, Math.min(limitCount, 20)));

  if (error) {
    throw error;
  }

  return (data as Pick<CreatorReleaseRow, 'version' | 'created_at' | 'notes'>[] | null) ?? [];
}

export async function publishCreatorDraft(notes: string) {
  const userId = await getCurrentUserId();
  const draft = await fetchCreatorDraft();
  const latestRelease = await fetchLatestPublishedRelease();
  const nextVersion = (latestRelease?.version ?? 0) + 1;
  const nextManifest = sanitizeCreatorManifest({
    ...draft,
    version: nextVersion,
  });

  const {error} = await supabase.from('creator_releases').insert({
    version: nextVersion,
    manifest_json: nextManifest,
    notes: notes.trim() || null,
    created_by: userId,
  });

  if (error) {
    throw error;
  }

  await saveCreatorDraft(nextManifest);
  await downloadPublishedCreatorManifestIfNeeded(true);
  return nextVersion;
}

export async function rollbackCreatorRelease(version: number) {
  const {data, error} = await supabase
    .from('creator_releases')
    .select('version, manifest_json, created_at, notes')
    .eq('version', version)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Creator release v${version} not found.`);
  }

  const manifest = sanitizeCreatorManifest(
    (data as CreatorReleaseRow).manifest_json as Partial<CreatorManifest> | undefined,
  );
  await saveCreatorDraft(manifest);
  return publishCreatorDraft(`Rollback to v${version}`);
}
