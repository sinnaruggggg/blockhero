const fs = require('fs');
const path = require('path');
const {contextBridge} = require('electron');

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
