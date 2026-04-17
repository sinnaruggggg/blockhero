const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const {app, BrowserWindow, shell, ipcMain} = require('electron');

let cachedAdbExecutable = null;
const VISUAL_AUTOMATION_PREFIX = 'blockhero-visual:';

function uniquePaths(paths) {
  return Array.from(new Set(paths.filter(Boolean)));
}

function readJsonIfExists(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function getPortableExecutableDir() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  return portableDir ? path.resolve(portableDir) : '';
}

function getLocalConfigCandidates() {
  const execDir = path.dirname(process.execPath);
  const portableDir = getPortableExecutableDir();
  const cwd = process.cwd();
  const mainDir = __dirname;
  return uniquePaths([
    portableDir ? path.join(portableDir, 'blockhero-creator.local.json') : '',
    path.join(execDir, 'blockhero-creator.local.json'),
    path.join(cwd, 'blockhero-creator.local.json'),
    path.resolve(mainDir, '..', '..', 'blockhero-creator.local.json'),
    path.resolve(mainDir, '..', 'blockhero-creator.local.json'),
  ]);
}

function findLocalConfigSource() {
  const candidates = getLocalConfigCandidates();
  for (const candidate of candidates) {
    const value = readJsonIfExists(candidate);
    if (value) {
      return candidate;
    }
  }
  return '';
}

function expandParentDirectories(seeds) {
  const visited = new Set();
  const expanded = [];

  for (const seed of seeds) {
    if (!seed) {
      continue;
    }

    let current = path.resolve(seed);
    while (!visited.has(current)) {
      visited.add(current);
      expanded.push(current);
      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  return expanded;
}

function getWorkspaceRootCandidates() {
  const execDir = path.dirname(process.execPath);
  const portableDir = getPortableExecutableDir();
  const cwd = process.cwd();
  const mainDir = __dirname;
  const configSource = findLocalConfigSource();
  return expandParentDirectories([
    path.resolve(mainDir, '..', '..'),
    path.resolve(mainDir, '..'),
    execDir,
    portableDir,
    cwd,
    configSource ? path.dirname(configSource) : '',
  ]);
}

function findLaunchFile(candidates) {
  return candidates.find(candidate => fs.existsSync(candidate)) ?? null;
}

function resolveUiStudioLiveCommand() {
  const roots = getWorkspaceRootCandidates();
  const batCandidates = roots.map(root => path.join(root, 'run-ui-studio-live.bat'));
  const ps1Candidates = roots.map(root => path.join(root, 'scripts', 'launch_ui_studio_live.ps1'));

  const batPath = findLaunchFile(batCandidates);
  if (batPath) {
    return {
      command: 'cmd.exe',
      args: ['/c', batPath],
      cwd: path.dirname(batPath),
      label: batPath,
    };
  }

  const ps1Path = findLaunchFile(ps1Candidates);
  if (ps1Path) {
    return {
      command: 'powershell.exe',
      args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1Path],
      cwd: path.dirname(ps1Path),
      label: ps1Path,
    };
  }

  throw new Error(
    `UI Studio Live 실행 파일을 찾지 못했습니다. 검색 기준 폴더 수: ${roots.length}`,
  );
}

function launchUiStudioLive() {
  const target = resolveUiStudioLiveCommand();
  const child = spawn(target.command, target.args, {
    cwd: target.cwd,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
  return target.label;
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout = [];
    const stderr = [];

    child.stdout.on('data', chunk => stdout.push(chunk));
    child.stderr.on('data', chunk => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', code => {
      const output = Buffer.concat(stdout);
      const errorText = Buffer.concat(stderr).toString('utf8').trim();
      if (code === 0) {
        resolve({stdout: output, stderr: errorText});
        return;
      }
      reject(new Error(errorText || `${command} 실행에 실패했습니다. 종료 코드: ${code}`));
    });
  });
}

function getBundledAdbCandidates() {
  const adbName = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const execDir = path.dirname(process.execPath);
  const portableDir = getPortableExecutableDir();

  return uniquePaths([
    path.join(process.resourcesPath || '', 'platform-tools', adbName),
    path.join(execDir, 'resources', 'platform-tools', adbName),
    portableDir ? path.join(portableDir, 'resources', 'platform-tools', adbName) : '',
    path.resolve(__dirname, 'bundled-platform-tools', adbName),
  ]);
}

function resolveAdbExecutable() {
  if (cachedAdbExecutable) {
    return cachedAdbExecutable;
  }

  for (const candidate of getBundledAdbCandidates()) {
    if (candidate && fs.existsSync(candidate)) {
      cachedAdbExecutable = candidate;
      return cachedAdbExecutable;
    }
  }

  const envCandidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
  ]
    .filter(Boolean)
    .map(root => path.join(root, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'));

  for (const candidate of envCandidates) {
    if (fs.existsSync(candidate)) {
      cachedAdbExecutable = candidate;
      return cachedAdbExecutable;
    }
  }

  cachedAdbExecutable = process.platform === 'win32' ? 'adb.exe' : 'adb';
  return cachedAdbExecutable;
}

async function runAdb(args, options = {}) {
  const adb = resolveAdbExecutable();
  try {
    return await runProcess(adb, args, options);
  } catch (error) {
    if (error.message && /ENOENT/i.test(error.message)) {
      throw new Error('adb 실행 파일을 찾지 못했습니다. 번들 파일이 손상됐거나 Android Platform Tools가 없습니다.');
    }
    throw error;
  }
}

function normalizeDeviceState(rawState) {
  if (rawState === 'device') {
    return '연결됨';
  }
  if (rawState === 'unauthorized') {
    return '권한 확인 필요';
  }
  if (rawState === 'offline') {
    return '오프라인';
  }
  return rawState || '알 수 없음';
}

async function getDeviceList() {
  const {stdout} = await runAdb(['devices', '-l']);
  const lines = stdout
    .toString('utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !line.startsWith('List of devices attached'));

  return lines.map(line => {
    const parts = line.split(/\s+/);
    const serial = parts[0] || '';
    const rawState = parts[1] || '';
    const modelMatch = line.match(/model:([^\s]+)/i);
    const productMatch = line.match(/product:([^\s]+)/i);
    return {
      serial,
      rawState,
      stateLabel: normalizeDeviceState(rawState),
      model: modelMatch ? modelMatch[1].replace(/_/g, ' ') : '',
      product: productMatch ? productMatch[1].replace(/_/g, ' ') : '',
    };
  });
}

function pickActiveSerial(serial, devices) {
  if (serial) {
    return serial;
  }
  const active = devices.find(device => device.rawState === 'device');
  if (!active) {
    throw new Error('연결된 안드로이드 기기가 없습니다. USB 디버깅과 adb 연결을 확인하세요.');
  }
  return active.serial;
}

async function runAdbForDevice(serial, args) {
  const devices = await getDeviceList();
  const activeSerial = pickActiveSerial(serial, devices);
  return runAdb(['-s', activeSerial, ...args]);
}

function parseFirstInt(lines, pattern) {
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) {
      return Number(match[1]);
    }
  }
  return 0;
}

async function getDeviceViewport(serial) {
  const devices = await getDeviceList();
  const activeSerial = pickActiveSerial(serial, devices);

  const sizeOutput = await runAdbForDevice(activeSerial, ['shell', 'wm', 'size']);
  const sizeLines = sizeOutput.stdout.toString('utf8').split(/\r?\n/).filter(Boolean);
  const sizeLine = sizeLines.find(line => /(\d+)\s*x\s*(\d+)/.test(line));
  if (!sizeLine) {
    throw new Error('기기 화면 크기를 읽지 못했습니다.');
  }
  const sizeMatch = sizeLine.match(/(\d+)\s*x\s*(\d+)/);
  const widthPx = Number(sizeMatch[1]);
  const heightPx = Number(sizeMatch[2]);

  const densityOutput = await runAdbForDevice(activeSerial, ['shell', 'wm', 'density']);
  const densityLines = densityOutput.stdout.toString('utf8').split(/\r?\n/).filter(Boolean);
  const density = parseFirstInt(densityLines, /(\d+)/) || 440;

  const dumpsysOutput = await runAdbForDevice(activeSerial, ['shell', 'dumpsys', 'window']);
  const dumpsysLines = dumpsysOutput.stdout.toString('utf8').split(/\r?\n/);
  let safeTopPx = 0;
  let safeBottomPx = 0;
  for (const line of dumpsysLines) {
    const rectMatch = line.match(/mStableInsets=Rect\((\d+),\s*(\d+)\s*-\s*(\d+),\s*(\d+)\)/);
    if (rectMatch) {
      safeTopPx = Number(rectMatch[2]);
      safeBottomPx = Number(rectMatch[4]);
      break;
    }
    const altMatch = line.match(/stable=\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (altMatch) {
      safeTopPx = Number(altMatch[2]);
      safeBottomPx = Number(altMatch[4]);
      break;
    }
  }

  const modelOutput = await runAdbForDevice(activeSerial, ['shell', 'getprop', 'ro.product.model']);
  const model = modelOutput.stdout.toString('utf8').trim();

  const widthDp = Math.round((widthPx * 160) / density);
  const heightDp = Math.round((heightPx * 160) / density);
  const safeTopDp = Math.max(0, Math.round((safeTopPx * 160) / density));
  const safeBottomDp = Math.max(0, Math.round((safeBottomPx * 160) / density));

  return {
    serial: activeSerial,
    model,
    widthPx,
    heightPx,
    density,
    widthDp,
    heightDp,
    safeTopDp,
    safeBottomDp,
  };
}

async function getDeviceFrame(serial) {
  const devices = await getDeviceList();
  const activeSerial = pickActiveSerial(serial, devices);
  const result = await runAdbForDevice(activeSerial, ['exec-out', 'screencap', '-p']);
  return {
    serial: activeSerial,
    dataUrl: `data:image/png;base64,${result.stdout.toString('base64')}`,
  };
}

function decodeXmlAttribute(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function parseXmlAttributes(raw) {
  const attributes = {};
  const attributePattern = /([a-zA-Z0-9:_-]+)="([^"]*)"/g;
  let match = attributePattern.exec(raw);
  while (match) {
    attributes[match[1]] = decodeXmlAttribute(match[2]);
    match = attributePattern.exec(raw);
  }
  return attributes;
}

function parseBounds(rawBounds) {
  const match = String(rawBounds || '').match(/\[(\-?\d+),(\-?\d+)\]\[(\-?\d+),(\-?\d+)\]/);
  if (!match) {
    return null;
  }
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function pxToDp(value, density) {
  return Math.round((Number(value) * 160) / Math.max(1, density));
}

function parseTaggedVisualLayout(xmlText, density) {
  const screens = {};
  const bestEntries = new Map();
  const nodePattern = /<node\b([^>]*)\/?>/g;
  let nodeMatch = nodePattern.exec(xmlText);

  while (nodeMatch) {
    const attrs = parseXmlAttributes(nodeMatch[1]);
    const label = attrs['content-desc'] || '';
    if (label.startsWith(VISUAL_AUTOMATION_PREFIX)) {
      const bounds = parseBounds(attrs.bounds);
      const tagValue = label.slice(VISUAL_AUTOMATION_PREFIX.length);
      const [screenId, elementId, extra] = tagValue.split(':');
      if (bounds && screenId && elementId && !extra) {
        const key = `${screenId}:${elementId}`;
        const area = bounds.width * bounds.height;
        const existing = bestEntries.get(key);
        if (!existing || area > existing.area) {
          bestEntries.set(key, {
            screenId,
            elementId,
            bounds,
            area,
          });
        }
      }
    }
    nodeMatch = nodePattern.exec(xmlText);
  }

  bestEntries.forEach(entry => {
    if (!screens[entry.screenId]) {
      screens[entry.screenId] = {
        elementFrames: {},
        matchedCount: 0,
      };
    }
    screens[entry.screenId].elementFrames[entry.elementId] = {
      x: pxToDp(entry.bounds.left, density),
      y: pxToDp(entry.bounds.top, density),
      width: pxToDp(entry.bounds.width, density),
      height: pxToDp(entry.bounds.height, density),
    };
    screens[entry.screenId].matchedCount += 1;
  });

  return screens;
}

function getDetectedScreen(screens) {
  let detectedScreenId = null;
  let detectedCount = 0;

  Object.entries(screens || {}).forEach(([screenId, snapshot]) => {
    const matchedCount = Number(snapshot?.matchedCount || 0);
    if (matchedCount > detectedCount) {
      detectedScreenId = screenId;
      detectedCount = matchedCount;
    }
  });

  return {
    detectedScreenId,
    detectedCount,
  };
}

async function getDeviceLayout(serial) {
  const devices = await getDeviceList();
  const activeSerial = pickActiveSerial(serial, devices);
  const viewport = await getDeviceViewport(activeSerial);
  const dumpPath = '/sdcard/blockhero_visual_dump.xml';

  await runAdbForDevice(activeSerial, ['shell', 'uiautomator', 'dump', dumpPath]);
  const xmlOutput = await runAdbForDevice(activeSerial, ['shell', 'cat', dumpPath]);
  const xmlText = xmlOutput.stdout.toString('utf8');
  const screens = parseTaggedVisualLayout(xmlText, viewport.density);
  const {detectedScreenId, detectedCount} = getDetectedScreen(screens);

  return {
    serial: activeSerial,
    capturedAt: new Date().toISOString(),
    viewport: {
      width: viewport.widthDp,
      height: viewport.heightDp,
      safeTop: viewport.safeTopDp,
      safeBottom: viewport.safeBottomDp,
    },
    screens,
    detectedScreenId,
    detectedCount,
    matchedCount: Object.values(screens).reduce(
      (sum, snapshot) => sum + Number(snapshot?.matchedCount || 0),
      0,
    ),
  };
}

function setupIpc() {
  ipcMain.handle('blockhero:launch-ui-studio-live', async () => {
    try {
      const label = launchUiStudioLive();
      return {ok: true, message: `실기 작업 도구를 실행했습니다. (${label})`};
    } catch (error) {
      return {ok: false, message: error instanceof Error ? error.message : '실행에 실패했습니다.'};
    }
  });

  ipcMain.handle('blockhero:open-external', async (_event, url) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return {ok: false, message: '잘못된 URL입니다.'};
    }
    await shell.openExternal(url);
    return {ok: true};
  });

  ipcMain.handle('blockhero:device-list', async () => {
    try {
      return {ok: true, devices: await getDeviceList()};
    } catch (error) {
      return {ok: false, message: error instanceof Error ? error.message : '기기 목록을 읽지 못했습니다.'};
    }
  });

  ipcMain.handle('blockhero:device-viewport', async (_event, serial) => {
    try {
      return {ok: true, viewport: await getDeviceViewport(serial)};
    } catch (error) {
      return {ok: false, message: error instanceof Error ? error.message : '기기 화면 정보를 읽지 못했습니다.'};
    }
  });

  ipcMain.handle('blockhero:device-frame', async (_event, serial) => {
    try {
      return {ok: true, frame: await getDeviceFrame(serial)};
    } catch (error) {
      return {ok: false, message: error instanceof Error ? error.message : '기기 화면을 가져오지 못했습니다.'};
    }
  });
  ipcMain.handle('blockhero:device-layout', async (_event, serial) => {
    try {
      return {ok: true, layout: await getDeviceLayout(serial)};
    } catch (error) {
      return {ok: false, message: error instanceof Error ? error.message : '기기 UI 레이아웃을 읽지 못했습니다.'};
    }
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1680,
    height: 1020,
    minWidth: 1280,
    minHeight: 820,
    backgroundColor: '#101a33',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'desktop-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.webContents.setWindowOpenHandler(({url}) => {
    void shell.openExternal(url);
    return {action: 'deny'};
  });

  void window.loadFile(path.join(__dirname, 'app', 'index.html'));
}

app.whenReady().then(() => {
  setupIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
