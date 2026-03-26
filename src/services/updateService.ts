import {Alert, Linking, Platform} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

// 현재 앱 버전 — 새 빌드마다 여기를 올려야 함
// 버전코드 = major*100 + minor*10 + patch (v1.2.1 → 121)
export const CURRENT_VERSION_CODE = 122;
export const CURRENT_VERSION_NAME = '1.2.2';

const GITHUB_REPO = 'sinnaruggggg/blockhero';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  assets: {
    name: string;
    browser_download_url: string;
  }[];
}

function parseVersionCode(tag: string): number {
  // v1.2 → 120, v1.2.1 → 121, v2.0 → 200
  const match = tag.replace(/^v/, '').match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return 0;
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  const patch = match[3] ? parseInt(match[3], 10) : 0;
  return major * 100 + minor * 10 + patch;
}

export async function checkForUpdate(): Promise<{
  versionName: string;
  downloadUrl: string;
  releaseNotes: string;
} | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {headers: {Accept: 'application/vnd.github.v3+json'}},
    );
    if (!res.ok) return null;

    const release: GitHubRelease = await res.json();
    const latestCode = parseVersionCode(release.tag_name);

    if (latestCode <= CURRENT_VERSION_CODE) return null;

    // Find APK asset
    const apkAsset = release.assets.find(a => a.name.endsWith('.apk'));
    if (!apkAsset) return null;

    return {
      versionName: release.tag_name.replace(/^v/, ''),
      downloadUrl: apkAsset.browser_download_url,
      releaseNotes: release.body || '',
    };
  } catch {
    return null;
  }
}

export function showUpdateDialog(update: {
  versionName: string;
  downloadUrl: string;
  releaseNotes: string;
}) {
  Alert.alert(
    `새 버전 ${update.versionName}`,
    update.releaseNotes || '새로운 업데이트가 있습니다.',
    [
      {text: '나중에', style: 'cancel'},
      {text: '업데이트', onPress: () => downloadAndInstall(update)},
    ],
  );
}

async function downloadAndInstall(update: {
  versionName: string;
  downloadUrl: string;
}) {
  try {
    if (Platform.OS !== 'android') {
      Linking.openURL(update.downloadUrl);
      return;
    }

    Alert.alert('다운로드 중', 'APK를 다운로드하고 있습니다. 잠시 기다려주세요...');

    const dirs = ReactNativeBlobUtil.fs.dirs;
    const filePath = `${dirs.CacheDir}/blockhero_${update.versionName}.apk`;

    // 직접 다운로드 (DownloadManager 사용하지 않음)
    const res = await ReactNativeBlobUtil.config({
      fileCache: true,
      path: filePath,
    }).fetch('GET', update.downloadUrl);

    // 다운로드 완료 후 설치 인텐트 실행
    ReactNativeBlobUtil.android.actionViewIntent(
      res.path(),
      'application/vnd.android.package-archive',
    );
  } catch (e: any) {
    Alert.alert('업데이트 실패', '다운로드 중 오류가 발생했습니다.\n' + (e?.message || ''));
  }
}
