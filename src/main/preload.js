const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  processApk: (filePath, mode, customTag) =>
    ipcRenderer.invoke('process-apk', { filePath, mode, customTag }),

  getPackageName: (filePath) =>
    ipcRenderer.invoke('get-package-name', filePath),

  selectFile: () => ipcRenderer.invoke('select-file'),

  getVersion: () => ipcRenderer.invoke('get-version'),

  checkObb: (filePath, packageName) =>
    ipcRenderer.invoke('check-obb', { filePath, packageName }),

  inspectApk: (filePath) => ipcRenderer.invoke('inspect-apk', filePath),

  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (partial) => ipcRenderer.invoke('save-settings', partial),

  openLog: () => ipcRenderer.invoke('open-log'),

  getPathForFile: (file) => webUtils.getPathForFile(file),

  onProgress: (callback) => {
    ipcRenderer.on('progress-update', (_event, data) => callback(data));
  },

  onComplete: (callback) => {
    ipcRenderer.on('process-complete', (_event, data) => callback(data));
  },

  onError: (callback) => {
    ipcRenderer.on('process-error', (_event, data) => callback(data));
  },

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close')
});
