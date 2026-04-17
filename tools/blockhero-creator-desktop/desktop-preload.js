const fs = require('fs');
const path = require('path');
const {contextBridge, ipcRenderer} = require('electron');

function readJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Failed to read ${filePath}`, error);
    return null;
  }
}

function getConfigCandidates() {
  const executableDir = path.dirname(process.execPath);
  return [
    path.join(executableDir, 'blockhero-creator.local.json'),
    path.resolve(__dirname, '..', '..', 'blockhero-creator.local.json'),
    path.resolve(process.cwd(), 'blockhero-creator.local.json'),
  ];
}

function loadLocalConfig() {
  for (const candidate of getConfigCandidates()) {
    const value = readJsonIfExists(candidate);
    if (value) {
      return {
        ...value,
        _sourcePath: candidate,
      };
    }
  }
  return null;
}

contextBridge.exposeInMainWorld('__BLOCKHERO_CREATOR_LOCAL_CONFIG__', loadLocalConfig());
contextBridge.exposeInMainWorld('__BLOCKHERO_CREATOR_DESKTOP__', {
  launchUiStudioLive: () => ipcRenderer.invoke('blockhero:launch-ui-studio-live'),
  openExternal: url => ipcRenderer.invoke('blockhero:open-external', url),
  listDevices: () => ipcRenderer.invoke('blockhero:device-list'),
  getDeviceViewport: serial => ipcRenderer.invoke('blockhero:device-viewport', serial),
  getDeviceFrame: serial => ipcRenderer.invoke('blockhero:device-frame', serial),
  getDeviceLayout: serial => ipcRenderer.invoke('blockhero:device-layout', serial),
});
