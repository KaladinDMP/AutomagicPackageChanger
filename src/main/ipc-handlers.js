const { app } = require('electron');
const ApkProcessor = require('./apk-processor');
const { extractPackageName } = require('./manifest-editor');

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('process-apk', async (event, { filePath, mode, customTag }) => {
    const processor = new ApkProcessor();

    processor.on('progress', (data) => {
      event.sender.send('progress-update', data);
    });

    processor.on('complete', (data) => {
      event.sender.send('process-complete', data);
    });

    processor.on('error', (data) => {
      event.sender.send('process-error', data);
    });

    try {
      const result = await processor.process(filePath, mode, customTag);
      return result;
    } catch (err) {
      event.sender.send('process-error', { message: err.message, details: err.stack });
      throw err;
    }
  });

  ipcMain.handle('get-package-name', async (_event, filePath) => {
    try {
      return await extractPackageName(filePath);
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('get-version', () => {
    return app.getVersion();
  });
}

module.exports = { registerIpcHandlers };
