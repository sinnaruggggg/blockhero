import {build} from 'esbuild';
import {cp, mkdir, rm} from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const toolDir = path.join(rootDir, 'tools', 'blockhero-creator');
const desktopDir = path.join(rootDir, 'tools', 'blockhero-creator-desktop');
const desktopAppDir = path.join(desktopDir, 'app');
const bundledToolsDir = path.join(desktopDir, 'bundled-platform-tools');
const bundleOnly = process.argv.includes('--bundle-only');

const PLATFORM_TOOL_FILES = [
  'adb.exe',
  'AdbWinApi.dll',
  'AdbWinUsbApi.dll',
  'libwinpthread-1.dll',
  'NOTICE.txt',
];

async function ensureCleanDir(targetDir) {
  await rm(targetDir, {recursive: true, force: true});
  await mkdir(targetDir, {recursive: true});
}

async function bundleCreator() {
  await build({
    entryPoints: [path.join(toolDir, 'creator.js')],
    outfile: path.join(toolDir, 'creator.bundle.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome124'],
    loader: {
      '.json': 'json',
    },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    logLevel: 'info',
  });
}

async function prepareDesktopApp() {
  await ensureCleanDir(desktopAppDir);
  await cp(path.join(toolDir, 'index.html'), path.join(desktopAppDir, 'index.html'));
  await cp(path.join(toolDir, 'styles.css'), path.join(desktopAppDir, 'styles.css'));
  await cp(
    path.join(toolDir, 'creator.bundle.js'),
    path.join(desktopAppDir, 'creator.bundle.js'),
  );
}

function getPlatformToolsCandidates() {
  const envRoots = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT].filter(Boolean);
  const defaults = process.platform === 'win32'
    ? [path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')]
    : [];

  return [...envRoots, ...defaults]
    .filter(Boolean)
    .map(root => path.join(root, 'platform-tools'));
}

function resolvePlatformToolsDir() {
  for (const candidate of getPlatformToolsCandidates()) {
    const adbPath = path.join(candidate, 'adb.exe');
    if (fs.existsSync(adbPath)) {
      return candidate;
    }
  }
  throw new Error(
    'Android platform-tools를 찾지 못했습니다. ANDROID_HOME 또는 ANDROID_SDK_ROOT를 확인하세요.',
  );
}

async function prepareBundledPlatformTools() {
  await ensureCleanDir(bundledToolsDir);
  const sourceDir = resolvePlatformToolsDir();

  for (const fileName of PLATFORM_TOOL_FILES) {
    const sourcePath = path.join(sourceDir, fileName);
    if (fs.existsSync(sourcePath)) {
      await cp(sourcePath, path.join(bundledToolsDir, fileName));
    }
  }
}

async function main() {
  await bundleCreator();
  await prepareDesktopApp();
  await prepareBundledPlatformTools();

  if (bundleOnly) {
    console.log('BlockHero Creator bundle prepared.');
    return;
  }

  console.log('BlockHero Creator desktop app prepared.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
