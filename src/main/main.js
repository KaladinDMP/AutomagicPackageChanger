const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./ipc-handlers');
const logger = require('./logger');

let mainWindow;

// Global UI scale. Applied via webContents.setZoomFactor so the entire page
// (title bar, content, modals) rescales cleanly. 0.78 shrinks the UI ~22%
// from the original design so the full app fits inside a default window on
// a 1080p screen without forcing the user to resize.
const APP_ZOOM_FACTOR = 0.78;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 820,
    height: 760,
    minWidth: 640,
    minHeight: 520,
    backgroundColor: '#0d0221',
    icon: path.join(__dirname, '../../icon.png'),
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      zoomFactor: APP_ZOOM_FACTOR
    }
  });

  // Belt-and-suspenders: enforce the zoom factor after the page loads too.
  // Chromium occasionally resets zoom on reload or when the page completes
  // first paint, so re-apply on did-finish-load.
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(APP_ZOOM_FACTOR);
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  logger.init();
  createWindow();
  registerIpcHandlers(ipcMain);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

process.on('uncaughtException', (err) => logger.error('uncaughtException', err));
process.on('unhandledRejection', (err) => logger.error('unhandledRejection', err));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle window controls from renderer
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'APK Files', extensions: ['apk'] }],
    properties: ['openFile']
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('open-log', () => {
  const p = logger.getLogPath();
  logger.log('Opening log file at', p);
  shell.showItemInFolder(p);
  return p;
});
