const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const ApkProcessor = require('./apk-processor');
const { extractPackageName } = require('./manifest-editor');
const { checkObb } = require('./obb-handler');
const { inspectApk } = require('./apk-inspector');
const settings = require('./settings');
const logger = require('./logger');

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('process-apk', async (event, { filePath, mode, customTag }) => {
    logger.log('[process-apk] start', { filePath, mode, customTag });
    const processor = new ApkProcessor();

    processor.on('progress', (data) => {
      logger.debug('[process-apk] progress', data.percent + '%', data.step, data.message);
      event.sender.send('progress-update', data);
    });

    processor.on('complete', (data) => {
      logger.log('[process-apk] complete', data);
      event.sender.send('process-complete', data);
    });

    processor.on('error', (data) => {
      logger.error('[process-apk] error', data);
      event.sender.send('process-error', data);
    });

    try {
      const result = await processor.process(filePath, mode, customTag);
      return result;
    } catch (err) {
      logger.error('[process-apk] threw', err);
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

  ipcMain.handle('inspect-apk', async (_event, filePath) => {
    logger.log('[inspect-apk]', filePath);
    try {
      const { info, decompDir, createdDecomp } = await inspectApk(filePath);
      if (createdDecomp && decompDir) {
        try { fs.rmSync(decompDir, { recursive: true, force: true }); } catch { /* noop */ }
      }
      logger.log('[inspect-apk] ok', {
        package: info.packageName,
        signer: info.signature && info.signature.identity && info.signature.identity.label,
        abis: info.abis
      });
      return info;
    } catch (err) {
      logger.error('[inspect-apk] failed', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('check-obb', (_event, { filePath, packageName }) => {
    const apkDir = path.dirname(filePath);
    return checkObb(apkDir, packageName);
  });

  ipcMain.handle('get-version', () => {
    return app.getVersion();
  });

  // Settings
  ipcMain.handle('get-settings', () => settings.load());
  ipcMain.handle('save-settings', (_event, partial) => settings.save(partial || {}));
}

module.exports = { registerIpcHandlers };
