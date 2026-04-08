import {Linking, Platform} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {isNewerVersion} from './updateVersion';
import {openGameDialog} from './gameDialogService';

export const CURRENT_VERSION_CODE = 166;
export const CURRENT_VERSION_NAME = '1.3.38';

const GITHUB_REPO = 'sinnaruggggg/blockhero';
const APK_MIME = 'application/vnd.android.package-archive';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  assets: {
    name: string;
    browser_download_url: string;
    size: number;
  }[];
}

export interface UpdateInfo {
  versionName: string;
  downloadUrl: string;
  releaseNotes: string;
  sizeBytes: number;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const release: GitHubRelease = await response.json();
    const latestVersionName = release.tag_name.replace(/^v/, '');

    if (!isNewerVersion(latestVersionName, CURRENT_VERSION_NAME)) {
      return null;
    }

    const apkAsset = release.assets.find(asset => asset.name.endsWith('.apk'));
    if (!apkAsset) {
      return null;
    }

    return {
      versionName: latestVersionName,
      downloadUrl: apkAsset.browser_download_url,
      releaseNotes: release.body || '',
      sizeBytes: apkAsset.size || 0,
    };
  } catch {
    return null;
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
      {text: '나중에', style: 'cancel'},
      {text: '업데이트', onPress: () => onStartDownload(update)},
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
      .progress({interval: 200}, (received, total) => {
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
