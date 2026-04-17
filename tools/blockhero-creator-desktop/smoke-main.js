const path = require('path');
const {app, BrowserWindow} = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    show: false,
    width: 1440,
    height: 960,
    webPreferences: {
      preload: path.join(__dirname, 'smoke-preload.js'),
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const timeout = setTimeout(() => {
    console.error('Creator smoke test timed out.');
    app.exit(1);
  }, 15000);

  win.webContents.on('did-finish-load', async () => {
    try {
      const state = await win.webContents.executeJavaScript(`(() => ({
        title: document.querySelector('#loginCard h2')?.textContent ?? '',
        loginVisible: !document.getElementById('loginCard')?.classList.contains('hidden'),
        workspaceVisible: !document.getElementById('workspace')?.classList.contains('hidden'),
        supabaseUrlFilled: Boolean(document.getElementById('supabaseUrl')?.value),
        supabaseAnonKeyFilled: Boolean(document.getElementById('supabaseAnonKey')?.value),
        connectionStatus: document.getElementById('connectionStatus')?.textContent ?? '',
        activeViewStatus: document.getElementById('activeViewStatus')?.textContent ?? '',
        alerts: Array.isArray(window.__creatorSmokeAlerts) ? window.__creatorSmokeAlerts : [],
      }))()`);
      console.log(JSON.stringify(state));
      clearTimeout(timeout);
      app.exit(
        state.workspaceVisible &&
          state.supabaseUrlFilled &&
          state.supabaseAnonKeyFilled &&
          state.activeViewStatus
          ? 0
          : 1,
      );
    } catch (error) {
      console.error(error);
      clearTimeout(timeout);
      app.exit(1);
    }
  });

  win.loadFile(path.join(__dirname, 'app', 'index.html')).catch(error => {
    console.error(error);
    clearTimeout(timeout);
    app.exit(1);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});
