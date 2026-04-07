import {Alert, Linking, Platform} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {isNewerVersion} from './updateVersion';

export const CURRENT_VERSION_CODE = 155;
export const CURRENT_VERSION_NAME = '1.3.27';

const GITHUB_REPO = 'sinnaruggggg/blockhero';
const APK_MIME = 'application/vnd.android.package-archive';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  assets: {
    name: string;
    browser_download_url: string;
  }[];
}

export async function checkForUpdate(): Promise<{
  versionName: string;
  downloadUrl: string;
  releaseNotes: string;
} | null> {
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
    };
  } catch {
    return null;
  }
}

export function showUpdateDialog(
  update: {versionName: string; downloadUrl: string; releaseNotes: string},
  onStartDownload: (update: {versionName: string; downloadUrl: string}) => void,
) {
  Alert.alert(
    `새 버전 ${update.versionName}`,
    update.releaseNotes || '새로운 업데이트가 있습니다.',
    [
      {text: '나중에', style: 'cancel'},
      {text: '업데이트', onPress: () => onStartDownload(update)},
    ],
  );
}

export async function downloadAndInstall(
  update: {versionName: string; downloadUrl: string},
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
