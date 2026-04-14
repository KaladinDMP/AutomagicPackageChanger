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

  // Set version in footer + title bar badge (visible in every screenshot)
  window.api.getVersion().then(version => {
    const v = 'v' + version;
    const footer = document.getElementById('footerVersion');
    const titleBadge = document.getElementById('titleBarVersion');
    if (footer) footer.textContent = v;
    if (titleBadge) titleBadge.textContent = v;
    document.title = `AutomagicPackageChanger ${v}`;
  });

  // Handle APK drop
  window.addEventListener('apk-dropped', async (e) => {
    const { filePath, fileName } = e.detail;

    // Reset previous state
    window.ProgressHandler.reset();
    window.UIController.reset();
    if (window.InfoModal) {
      window.InfoModal.reset();
      window.InfoModal.setScanning();
    }
    window.DragDrop.setFileLoaded(fileName);

    // One-shot full inspection — pulls package, SDK, signer identity, hashes, etc.
    // Replaces the old getPackageName call (which did a decompile anyway) so
    // auto-scan adds zero extra time.
    try {
      const info = await window.api.inspectApk(filePath);

      if (info && info.error) {
        window.ProgressHandler.showError({ message: info.error });
        if (window.InfoModal) window.InfoModal.setInfo({ error: info.error });
        return;
      }

      const packageName = info.packageName;

      // Check for OBB folder near the APK
      const obbCheck = await window.api.checkObb(filePath, packageName);

      window.UIController.setApkInfo({
        packageName,
        filePath,
        fileName,
        obbFound: obbCheck.found,
        signerIdentity: info.signature && info.signature.identity
      });

      if (window.InfoModal) window.InfoModal.setInfo(info);

    } catch (err) {
      window.ProgressHandler.showError({
        message: 'Failed to read APK: ' + (err.message || err)
      });
      if (window.InfoModal) window.InfoModal.setInfo({ error: err.message || String(err) });
    }
  });

  // Warning modal elements
  const warnModal = document.getElementById('warnModal');
  const warnCurrentPkg = document.getElementById('warnCurrentPkg');
  const warnTag = document.getElementById('warnTag');
  const warnNewPkg = document.getElementById('warnNewPkg');
  const warnCancel = document.getElementById('warnCancel');
  const warnConfirm = document.getElementById('warnConfirm');

  function resolveTag(mode, customTag) {
    if (mode === 'default') return 'apc';
    if (mode === 'mrfix') return 'mr';
    return (customTag || '').toLowerCase();
  }

  function computeNewPackage(packageName, tag) {
    const parts = packageName.split('.');
    parts.splice(1, 0, tag);
    return parts.join('.');
  }

  function packageAlreadyTagged(packageName, tag) {
    if (!packageName || !tag) return false;
    return packageName.split('.').includes(tag);
  }

  function hideWarnModal() {
    warnModal.classList.add('hidden');
  }

  function showWarnModal(packageName, tag) {
    warnCurrentPkg.textContent = packageName;
    warnTag.textContent = '.' + tag;
    warnNewPkg.textContent = computeNewPackage(packageName, tag);
    warnModal.classList.remove('hidden');
  }

  async function startRename(filePath, mode, customTag) {
    window.UIController.showProcessing();
    window.DragDrop.setProcessing(true);
    window.ProgressHandler.reset();

    try {
      await window.api.processApk(filePath, mode, customTag);
    } catch (err) {
      // Error will be handled by the error event listener below
    }
  }

  // Rename button
  document.getElementById('btnRename').addEventListener('click', () => {
    const filePath = window.UIController.getFilePath();
    const mode = window.UIController.getMode();
    const customTag = window.UIController.getCustomTag();
    const packageName = window.UIController.getPackageName();

    if (!filePath) return;

    const tag = resolveTag(mode, customTag);

    if (packageAlreadyTagged(packageName, tag)) {
      showWarnModal(packageName, tag);
      return;
    }

    startRename(filePath, mode, customTag);
  });

  // Modal button handlers
  warnCancel.addEventListener('click', hideWarnModal);

  warnConfirm.addEventListener('click', () => {
    hideWarnModal();
    const filePath = window.UIController.getFilePath();
    const mode = window.UIController.getMode();
    const customTag = window.UIController.getCustomTag();
    if (!filePath) return;
    startRename(filePath, mode, customTag);
  });

  // ESC key and backdrop click dismiss (treated as cancel)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !warnModal.classList.contains('hidden')) {
      hideWarnModal();
    }
  });

  warnModal.addEventListener('click', (e) => {
    if (e.target === warnModal) hideWarnModal();
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
