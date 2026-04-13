/**
 * UI Controller
 * Manages mode selection, info panel, and UI state transitions.
 * Modes: default (.apc), mrfix (.mr), custom (user's 2-3 letter tag)
 */
(function () {
  'use strict';

  // Elements
  const btnDefault = document.getElementById('btnDefault');
  const btnMrfix = document.getElementById('btnMrfix');
  const btnCustom = document.getElementById('btnCustom');
  const customInputContainer = document.getElementById('customInputContainer');
  const customTag = document.getElementById('customTag');
  const inputHint = document.getElementById('inputHint');
  const infoPanel = document.getElementById('infoPanel');
  const originalPkg = document.getElementById('originalPkg');
  const newPkg = document.getElementById('newPkg');
  const obbStatus = document.getElementById('obbStatus');
  const fileName = document.getElementById('fileName');
  const btnRename = document.getElementById('btnRename');
  const actionSection = document.getElementById('actionSection');
  const progressSection = document.getElementById('progressSection');
  const resultSection = document.getElementById('resultSection');

  let currentMode = 'default';
  let currentPackageName = null;
  let currentFilePath = null;

  // Mode switching
  btnDefault.addEventListener('click', () => setMode('default'));
  btnMrfix.addEventListener('click', () => setMode('mrfix'));
  btnCustom.addEventListener('click', () => setMode('custom'));

  function setMode(mode) {
    currentMode = mode;

    btnDefault.classList.toggle('active', mode === 'default');
    btnMrfix.classList.toggle('active', mode === 'mrfix');
    btnCustom.classList.toggle('active', mode === 'custom');

    if (mode === 'custom') {
      customInputContainer.classList.add('visible');
      customTag.focus();
    } else {
      customInputContainer.classList.remove('visible');
    }

    updateNewPackagePreview();
    validateState();
  }

  // Custom tag input - force lowercase, letters only
  customTag.addEventListener('input', () => {
    customTag.value = customTag.value.toLowerCase().replace(/[^a-z]/g, '');
    updateNewPackagePreview();
    validateCustomTag();
    validateState();
  });

  function validateCustomTag() {
    const value = customTag.value.trim();
    if (!value) {
      inputHint.textContent = '';
      inputHint.classList.remove('error');
      return false;
    }

    if (value.length < 2) {
      inputHint.textContent = 'Need at least 2 letters';
      inputHint.classList.add('error');
      return false;
    }

    if (!/^[a-z]{2,3}$/.test(value)) {
      inputHint.textContent = 'Letters only, 2-3 characters';
      inputHint.classList.add('error');
      return false;
    }

    inputHint.textContent = `Tag: .${value}`;
    inputHint.classList.remove('error');
    return true;
  }

  function getTagForMode() {
    if (currentMode === 'default') return 'apc';
    if (currentMode === 'mrfix') return 'mr';
    return customTag.value.trim().toLowerCase();
  }

  function updateNewPackagePreview() {
    if (!currentPackageName) return;

    const tag = getTagForMode();
    if (!tag) {
      newPkg.textContent = '...';
      return;
    }

    const parts = currentPackageName.split('.');
    parts.splice(1, 0, tag);
    newPkg.textContent = parts.join('.');
  }

  function validateState() {
    let valid = !!currentFilePath && !!currentPackageName;

    if (currentMode === 'custom') {
      valid = valid && validateCustomTag();
    }

    if (valid) {
      btnRename.disabled = false;
      btnRename.classList.remove('disabled');
    } else {
      btnRename.disabled = true;
      btnRename.classList.add('disabled');
    }
  }

  // Expose controller
  window.UIController = {
    getMode: () => currentMode,

    getCustomTag: () => customTag.value.trim().toLowerCase(),

    setApkInfo: (info) => {
      currentPackageName = info.packageName;
      currentFilePath = info.filePath;

      originalPkg.textContent = info.packageName;
      fileName.textContent = info.fileName;
      obbStatus.textContent = info.obbFound ? 'Found - will be renamed' : 'Not found nearby';
      obbStatus.style.color = info.obbFound ? '#00ff41' : '#666';

      infoPanel.classList.remove('hidden');
      updateNewPackagePreview();
      validateState();
    },

    getFilePath: () => currentFilePath,

    showProcessing: () => {
      actionSection.style.display = 'none';
      resultSection.classList.add('hidden');
      progressSection.classList.remove('hidden');
    },

    showResult: () => {
      progressSection.classList.add('hidden');
      actionSection.style.display = 'none';
    },

    showReady: () => {
      progressSection.classList.add('hidden');
      resultSection.classList.add('hidden');
      actionSection.style.display = 'flex';
    },

    reset: () => {
      currentPackageName = null;
      currentFilePath = null;
      infoPanel.classList.add('hidden');
      progressSection.classList.add('hidden');
      resultSection.classList.add('hidden');
      actionSection.style.display = 'flex';
      btnRename.disabled = true;
      btnRename.classList.add('disabled');
    }
  };
})();
