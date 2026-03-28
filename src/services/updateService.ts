import {Alert, Linking, Platform} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

// 현재 앱 버전 — 새 빌드마다 여기를 올려야 함
// 버전코드 = major*100 + minor*10 + patch (v1.2.1 → 121)
export const CURRENT_VERSION_CODE = 126;
export const CURRENT_VERSION_NAME = '1.2.6';

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
    const filePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/blockhero_${update.versionName}.apk`;

    const res = await ReactNativeBlobUtil.config({
      fileCache: true,
      path: filePath,
    })
      .fetch('GET', update.downloadUrl)
      .progress({interval: 200}, (received, total) => {
        const pct = total > 0 ? Math.round((received / total) * 100) : 0;
        onProgress(pct);
      });

    onDone();

    ReactNativeBlobUtil.android.actionViewIntent(
      res.path(),
      'application/vnd.android.package-archive',
    );
  } catch (e: any) {
    onError(e?.message || '알 수 없는 오류');
  }
}
