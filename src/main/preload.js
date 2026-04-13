const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  processApk: (filePath, mode, customName) =>
    ipcRenderer.invoke('process-apk', { filePath, mode, customName }),

  getPackageName: (filePath) =>
    ipcRenderer.invoke('get-package-name', filePath),

  selectFile: () => ipcRenderer.invoke('select-file'),

  getVersion: () => ipcRenderer.invoke('get-version'),

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
