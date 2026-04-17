import { Linking, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { openGameDialog } from './gameDialogService';
import { isNewerVersion } from './updateVersion';

export const CURRENT_VERSION_CODE = 183;
export const CURRENT_VERSION_NAME = '1.3.56';

const GITHUB_REPO = 'sinnaruggggg/blockhero';
const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_REPO}`;
const APK_MIME = 'application/vnd.android.package-archive';
const GITHUB_FETCH_TIMEOUT_MS = 15000;

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  content_type?: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  name?: string | null;
  body?: string | null;
  draft?: boolean;
  prerelease?: boolean;
  assets: GitHubReleaseAsset[];
}

interface GitHubApiError {
  message?: string;
}

export interface UpdateInfo {
  versionName: string;
  downloadUrl: string;
  releaseNotes: string;
  sizeBytes: number;
}

export interface UpdateCheckResult {
  update: UpdateInfo | null;
  errorMessage: string | null;
}

function buildGitHubHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    'Cache-Control': 'no-cache',
    'User-Agent': `BlockHero/${CURRENT_VERSION_NAME}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function pickApkAsset(release: GitHubRelease): GitHubReleaseAsset | null {
  return (
    release.assets.find(
      asset =>
        asset.name.toLowerCase().endsWith('.apk') ||
        asset.content_type === APK_MIME,
    ) ?? null
  );
}

function isUsableRelease(release: GitHubRelease): boolean {
  return !release.draft && !release.prerelease && !!pickApkAsset(release);
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GITHUB_FETCH_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(url, {
      headers: buildGitHubHeaders(),
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw new Error('GitHub API timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let details = `GitHub API ${response.status}`;

    try {
      const payload: GitHubApiError = await response.json();
      if (payload?.message) {
        details = `${details}: ${payload.message}`;
      }
    } catch {}

    throw new Error(details);
  }

  return (await response.json()) as T;
}

async function fetchLatestPublishedRelease(): Promise<GitHubRelease> {
  let latestReleaseError: Error | null = null;

  try {
    const latestRelease = await fetchJson<GitHubRelease>(
      `${GITHUB_API_BASE}/releases/latest`,
    );
    if (isUsableRelease(latestRelease)) {
      return latestRelease;
    }
  } catch (error) {
    latestReleaseError =
      error instanceof Error ? error : new Error('Unknown update error');
  }

  const releases = await fetchJson<GitHubRelease[]>(
    `${GITHUB_API_BASE}/releases?per_page=5`,
  );
  const fallbackRelease = releases.find(isUsableRelease);

  if (fallbackRelease) {
    return fallbackRelease;
  }

  if (latestReleaseError) {
    throw latestReleaseError;
  }

  throw new Error('No published APK release found');
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  try {
    const release = await fetchLatestPublishedRelease();
    const latestVersionName = release.tag_name.replace(/^v/, '').trim();
    const apkAsset = pickApkAsset(release);

    if (!latestVersionName || !apkAsset) {
      return {
        update: null,
        errorMessage: '유효한 업데이트 릴리즈 정보를 찾지 못했습니다.',
      };
    }

    if (!isNewerVersion(latestVersionName, CURRENT_VERSION_NAME)) {
      return {
        update: null,
        errorMessage: null,
      };
    }

    return {
      update: {
        versionName: latestVersionName,
        downloadUrl: apkAsset.browser_download_url,
        releaseNotes: release.body?.trim() || '',
        sizeBytes: apkAsset.size || 0,
      },
      errorMessage: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : '업데이트 정보를 가져오지 못했습니다.';

    return {
      update: null,
      errorMessage,
    };
  }
}

export function formatUpdateSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return '알 수 없음';
  }

  const sizeMb = sizeBytes / (1024 * 1024);
  const digits = sizeMb >= 100 ? 0 : 1;
  return `${sizeMb.toFixed(digits)}MB`;
}

export function formatUpdateDialogMessage(update: {
  versionName: string;
  releaseNotes: string;
  sizeBytes: number;
}): string {
  return [
    `버전: ${update.versionName}`,
    `용량: ${formatUpdateSize(update.sizeBytes)}`,
    '',
    '내용:',
    update.releaseNotes.trim() || '변경 내용이 없습니다.',
  ].join('\n');
}

export function showUpdateDialog(
  update: UpdateInfo,
  onStartDownload: (update: UpdateInfo) => void,
) {
  openGameDialog({
    title: '업데이트',
    message: formatUpdateDialogMessage(update),
    variant: 'notice',
    buttons: [
      { text: '나중에', style: 'cancel' },
      { text: '업데이트', onPress: () => onStartDownload(update) },
    ],
  });
}

export async function downloadAndInstall(
  update: UpdateInfo,
  onProgress: (pct: number) => void,
  onDone: () => void,
  onError: (msg: string) => void,
) {
  if (Platform.OS !== 'android') {
    Linking.openURL(update.downloadUrl);
    onDone();
    return;
  }

  try {
    const apkFileName = `blockhero_${update.versionName}.apk`;
    const downloadPath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${apkFileName}`;

    const result = await ReactNativeBlobUtil.config({
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        title: apkFileName,
        description: `BlockHero ${update.versionName} 업데이트`,
        path: downloadPath,
        mime: APK_MIME,
        mediaScannable: true,
      },
    })
      .fetch('GET', update.downloadUrl)
      .progress({ interval: 200 }, (received, total) => {
        const percent = total > 0 ? Math.round((received / total) * 100) : 0;
        onProgress(percent);
      });

    await ReactNativeBlobUtil.android.actionViewIntent(result.path(), APK_MIME);
    onDone();
  } catch (error: any) {
    const fallbackMessage =
      '업데이트 다운로드 또는 설치 화면을 열지 못했습니다. 다시 시도해 주세요.';
    onError(error?.message || fallbackMessage);
  }
}
