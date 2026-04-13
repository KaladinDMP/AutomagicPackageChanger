/**
 * UI Controller
 * Manages mode selection, info panel, and UI state transitions.
 */
(function () {
  'use strict';

  // Elements
  const btnDefault = document.getElementById('btnDefault');
  const btnCustom = document.getElementById('btnCustom');
  const customInputContainer = document.getElementById('customInputContainer');
  const customPackageName = document.getElementById('customPackageName');
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
  btnCustom.addEventListener('click', () => setMode('custom'));

  function setMode(mode) {
    currentMode = mode;

    btnDefault.classList.toggle('active', mode === 'default');
    btnCustom.classList.toggle('active', mode === 'custom');

    if (mode === 'custom') {
      customInputContainer.classList.add('visible');
      customPackageName.focus();
    } else {
      customInputContainer.classList.remove('visible');
    }

    updateNewPackagePreview();
    validateState();
  }

  // Custom package name input
  customPackageName.addEventListener('input', () => {
    updateNewPackagePreview();
    validateCustomInput();
    validateState();
  });

  function validateCustomInput() {
    const value = customPackageName.value.trim();
    if (!value) {
      inputHint.textContent = '';
      inputHint.classList.remove('error');
      return false;
    }

    const valid = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(value);
    if (!valid) {
      inputHint.textContent = 'Must be dot-separated (e.g. com.example.game)';
      inputHint.classList.add('error');
      return false;
    }

    inputHint.textContent = 'Valid package name';
    inputHint.classList.remove('error');
    return true;
  }

  function updateNewPackagePreview() {
    if (!currentPackageName) return;

    let newName;
    if (currentMode === 'default') {
      const parts = currentPackageName.split('.');
      parts.splice(1, 0, 'mr');
      newName = parts.join('.');
    } else {
      newName = customPackageName.value.trim() || '...';
    }

    newPkg.textContent = newName;
  }

  function validateState() {
    let valid = !!currentFilePath && !!currentPackageName;

    if (currentMode === 'custom') {
      valid = valid && validateCustomInput();
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

    getCustomName: () => customPackageName.value.trim(),

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
