/**
 * Main App Controller
 * Wires together drag-drop, UI, and progress modules.
 */
(function () {
  'use strict';

  // Window controls
  document.getElementById('btnMinimize').addEventListener('click', () => window.api.minimize());
  document.getElementById('btnMaximize').addEventListener('click', () => window.api.maximize());
  document.getElementById('btnClose').addEventListener('click', () => window.api.close());

  // Set version in footer
  window.api.getVersion().then(version => {
    document.getElementById('footerVersion').textContent = 'v' + version;
  });

  // Handle APK drop
  window.addEventListener('apk-dropped', async (e) => {
    const { filePath, fileName } = e.detail;

    // Reset previous state
    window.ProgressHandler.reset();
    window.UIController.reset();
    window.DragDrop.setFileLoaded(fileName);

    // Get package name from APK
    try {
      const packageName = await window.api.getPackageName(filePath);

      if (packageName && packageName.error) {
        window.ProgressHandler.showError({ message: packageName.error });
        return;
      }

      // Check for OBB folder
      const dir = filePath.substring(0, filePath.lastIndexOf(/[\\/]/.test(filePath) ? filePath.match(/[\\/]/g).pop() : '/'));
      // Simple heuristic: we'll let the backend handle actual OBB detection
      // Just show the info panel
      window.UIController.setApkInfo({
        packageName,
        filePath,
        fileName,
        obbFound: false // Updated after actual processing
      });

    } catch (err) {
      window.ProgressHandler.showError({
        message: 'Failed to read APK: ' + (err.message || err)
      });
    }
  });

  // Rename button
  document.getElementById('btnRename').addEventListener('click', async () => {
    const filePath = window.UIController.getFilePath();
    const mode = window.UIController.getMode();
    const customTag = window.UIController.getCustomTag();

    if (!filePath) return;

    // Switch to processing state
    window.UIController.showProcessing();
    window.DragDrop.setProcessing(true);
    window.ProgressHandler.reset();

    try {
      await window.api.processApk(filePath, mode, customTag);
    } catch (err) {
      // Error will be handled by the error event listener below
    }
  });

  // Progress updates from main process
  window.api.onProgress((data) => {
    window.ProgressHandler.update(data);
  });

  // Process complete
  window.api.onComplete((data) => {
    window.ProgressHandler.showSuccess(data);
  });

  // Process error
  window.api.onError((data) => {
    window.ProgressHandler.showError(data);
  });

})();
