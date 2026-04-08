const path = require('path');
const {app, BrowserWindow, shell} = require('electron');

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
