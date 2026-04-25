import {supabase} from './supabase';

export type UiAssetSummary = {
  assetKey: string;
  mimeType: string | null;
  contentHash: string | null;
  updatedAt: string | null;
};

type UiAssetRow = {
  asset_key: string;
  mime_type: string | null;
  content_hash: string | null;
  updated_at: string | null;
};

export async function listUiAssets() {
  const {data, error} = await supabase
    .from('ui_assets')
    .select('asset_key, mime_type, content_hash, updated_at')
    .order('asset_key', {ascending: true});

  if (error) {
    throw error;
  }

  return ((data as UiAssetRow[] | null) ?? []).map(row => ({
    assetKey: row.asset_key,
    mimeType: row.mime_type,
    contentHash: row.content_hash,
    updatedAt: row.updated_at,
  })) as UiAssetSummary[];
}

export async function deleteUiAsset(assetKey: string) {
  const {error} = await supabase
    .from('ui_assets')
    .delete()
    .eq('asset_key', assetKey);

  if (error) {
    throw error;
  }
}
