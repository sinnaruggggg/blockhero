const fs = require('fs');
const path = require('path');
const {execFile} = require('child_process');
const {app, BrowserWindow, ipcMain, shell} = require('electron');

function resolveAdbPath() {
  const candidates = [
    path.join(process.resourcesPath || '', 'platform-tools', 'adb.exe'),
    path.join(process.resourcesPath || '', 'bundled-platform-tools', 'adb.exe'),
    path.join(__dirname, 'bundled-platform-tools', 'adb.exe'),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('번들된 adb.exe를 찾지 못했습니다.');
}

function execAdb(args, {encoding = 'utf8'} = {}) {
  const adbPath = resolveAdbPath();
  return new Promise((resolve, reject) => {
    execFile(
      adbPath,
      args,
      {
        windowsHide: true,
        timeout: 15000,
        maxBuffer: 32 * 1024 * 1024,
        encoding,
      },
      (error, stdout, stderr) => {
        if (error) {
          const message =
            (typeof stderr === 'string' && stderr.trim()) ||
            (typeof stdout === 'string' && stdout.trim()) ||
            error.message;
          reject(new Error(message));
          return;
        }
        resolve({stdout, stderr});
      },
    );
  });
}

function parseDeviceStateLabel(rawState) {
  if (rawState === 'device') {
    return '연결됨';
  }
  if (rawState === 'unauthorized') {
    return '승인 필요';
  }
  if (rawState === 'offline') {
    return '오프라인';
  }
  return rawState || '알 수 없음';
}

async function listDevices() {
  const {stdout} = await execAdb(['devices', '-l']);
  const lines = String(stdout)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const devices = lines
    .filter(line => !line.startsWith('List of devices attached'))
    .map(line => {
      const parts = line.split(/\s+/);
      const serial = parts[0] || '';
      const rawState = parts[1] || 'unknown';
      const meta = {};
      for (const token of parts.slice(2)) {
        const [key, value] = token.split(':');
        if (key && value) {
          meta[key] = value;
        }
      }
      return {
        serial,
        rawState,
        stateLabel: parseDeviceStateLabel(rawState),
        model: meta.model || '',
        product: meta.product || '',
        device: meta.device || '',
      };
    });

  return {ok: true, devices};
}

function readFirstInt(lines, pattern) {
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) {
      return Number(match[1]);
    }
  }
  return null;
}

function sanitizeSerial(serial) {
  if (typeof serial !== 'string' || !serial.trim()) {
    throw new Error('기기 시리얼이 비어 있습니다.');
  }
  return serial.trim();
}

async function getDeviceViewport(serialInput) {
  const serial = sanitizeSerial(serialInput);
  const [sizeResult, densityResult, dumpsysResult, modelResult] =
    await Promise.all([
      execAdb(['-s', serial, 'shell', 'wm', 'size']),
      execAdb(['-s', serial, 'shell', 'wm', 'density']),
      execAdb(['-s', serial, 'shell', 'dumpsys', 'window']),
      execAdb(['-s', serial, 'shell', 'getprop', 'ro.product.model']),
    ]);

  const sizeLines = String(sizeResult.stdout).split(/\r?\n/);
  const sizeMatch = sizeLines
    .map(line => line.match(/(\d+)\s*x\s*(\d+)/))
    .find(Boolean);
  if (!sizeMatch) {
    throw new Error(`adb shell wm size 결과를 읽지 못했습니다. (${serial})`);
  }

  const widthPx = Number(sizeMatch[1]);
  const heightPx = Number(sizeMatch[2]);
  const density =
    readFirstInt(
      String(densityResult.stdout).split(/\r?\n/),
      /(\d+)/,
    ) || 440;

  let safeTopPx = 0;
  let safeBottomPx = 0;
  for (const line of String(dumpsysResult.stdout).split(/\r?\n/)) {
    const stableMatch = line.match(
      /mStableInsets=Rect\((\d+),\s*(\d+)\s*-\s*(\d+),\s*(\d+)\)/,
    );
    if (stableMatch) {
      safeTopPx = Number(stableMatch[2]) || 0;
      safeBottomPx = Number(stableMatch[4]) || 0;
      break;
    }
  }

  const toDp = value => Math.round((value * 160) / density);
  const viewport = {
    serial,
    model: String(modelResult.stdout || '').trim(),
    widthPx,
    heightPx,
    density,
    widthDp: toDp(widthPx),
    heightDp: toDp(heightPx),
    safeTopDp: Math.max(1, toDp(safeTopPx) || 32),
    safeBottomDp: Math.max(1, toDp(safeBottomPx) || 24),
  };

  return {ok: true, viewport};
}

async function getDeviceFrame(serialInput) {
  const serial = sanitizeSerial(serialInput);
  const {stdout} = await execAdb(
    ['-s', serial, 'exec-out', 'screencap', '-p'],
    {encoding: null},
  );
  const buffer = Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
  if (!buffer.length) {
    throw new Error('실제 폰 화면을 가져오지 못했습니다.');
  }

  return {
    ok: true,
    frame: {
      dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
      capturedAt: new Date().toISOString(),
    },
  };
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
  ipcMain.handle('blockhero:listDevices', async () => {
    try {
      return await listDevices();
    } catch (error) {
      return {ok: false, message: error.message};
    }
  });

  ipcMain.handle('blockhero:getDeviceViewport', async (_event, serial) => {
    try {
      return await getDeviceViewport(serial);
    } catch (error) {
      return {ok: false, message: error.message};
    }
  });

  ipcMain.handle('blockhero:getDeviceFrame', async (_event, serial) => {
    try {
      return await getDeviceFrame(serial);
    } catch (error) {
      return {ok: false, message: error.message};
    }
  });

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
