/**
 * Settings Modal controller.
 * Configures the signature line (OU=) that APC embeds in every APK it re-signs.
 */
(function () {
  'use strict';

  const modal = document.getElementById('settingsModal');
  const openBtn = document.getElementById('btnSettings');
  const closeBtn = document.getElementById('settingsClose');
  const cancelBtn = document.getElementById('settingsCancel');
  const saveBtn = document.getElementById('settingsSave');

  const radios = document.querySelectorAll('input[name="sigMode"]');
  const customInput = document.getElementById('sigCustomInput');
  const tagPreview = document.getElementById('sigTagPreview');

  let dirtySnapshot = null;

  function currentSelection() {
    const mode = document.querySelector('input[name="sigMode"]:checked').value;
    return { mode, customText: customInput.value.trim() };
  }

  function applyToUI(settings) {
    const s = (settings && settings.signature) || { mode: 'default', customText: '' };
    const target = document.getElementById('sig' + (s.mode.charAt(0).toUpperCase() + s.mode.slice(1)));
    if (target) target.checked = true;
    customInput.value = s.customText || '';
    customInput.disabled = s.mode !== 'custom';
  }

  function updateTagPreview() {
    const tag = (window.UIController && window.UIController.getMode)
      ? (window.UIController.getMode() === 'default' ? 'APC'
        : window.UIController.getMode() === 'mrfix' ? 'MR'
        : (window.UIController.getCustomTag() || '').toUpperCase() || 'TAG')
      : 'TAG';
    tagPreview.textContent = `${tag} used Automagic on this APK!`;
  }

  radios.forEach(r => r.addEventListener('change', () => {
    customInput.disabled = currentSelection().mode !== 'custom';
    if (currentSelection().mode === 'custom') customInput.focus();
  }));

  async function show() {
    try {
      dirtySnapshot = await window.api.getSettings();
      applyToUI(dirtySnapshot);
    } catch {
      applyToUI(null);
    }
    updateTagPreview();
    modal.classList.remove('hidden');
  }

  function hide() { modal.classList.add('hidden'); }

  async function save() {
    const sel = currentSelection();
    try {
      await window.api.saveSettings({ signature: sel });
    } catch {
      // best effort
    }
    hide();
  }

  const openLogBtn = document.getElementById('btnOpenLog');
  if (openLogBtn) {
    openLogBtn.addEventListener('click', async () => {
      try { await window.api.openLog(); } catch { /* noop */ }
    });
  }

  openBtn.addEventListener('click', show);
  closeBtn.addEventListener('click', hide);
  cancelBtn.addEventListener('click', hide);
  saveBtn.addEventListener('click', save);
  modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) hide();
  });
})();
