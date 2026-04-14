/**
 * APK Info Modal controller.
 * Takes the info object returned by window.api.inspectApk() and populates the modal.
 */
(function () {
  'use strict';

  const modal = document.getElementById('infoModal');
  const openBtn = document.getElementById('btnInfoMore');
  const closeBtn = document.getElementById('infoClose');
  const doneBtn = document.getElementById('infoDone');
  const signerBadge = document.getElementById('signerBadge');
  const ribbon = document.getElementById('infoSignerRibbon');
  const ribbonName = document.getElementById('infoSignerName');

  let currentInfo = null;

  function fmtSize(bytes) {
    if (!bytes && bytes !== 0) return '-';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB';
    if (mb >= 1) return mb.toFixed(2) + ' MB';
    return (bytes / 1024).toFixed(1) + ' KB';
  }

  function schemesToText(schemes) {
    if (!schemes) return '-';
    const on = [];
    if (schemes.v1) on.push('v1');
    if (schemes.v2) on.push('v2');
    if (schemes.v3) on.push('v3');
    return on.length ? on.join(' + ') : 'Not signed';
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = (value === null || value === undefined || value === '') ? '-' : String(value);
  }

  function render(info) {
    currentInfo = info;

    // Application
    setText('infoAppLabel', info.appLabel);
    setText('infoPackage', info.packageName);
    setText('infoVersion',
      info.versionName && info.versionCode ? `${info.versionName} (${info.versionCode})`
        : info.versionName || info.versionCode);

    // Platform
    setText('infoMinSdk', info.minSdk);
    setText('infoTargetSdk', info.targetSdk);
    setText('infoCompileSdk', info.compileSdk);
    setText('infoGles', info.glEsVersion);
    setText('infoAbis', (info.abis && info.abis.length) ? info.abis.join(', ') : 'Not native / any');

    // Signature
    const sig = info.signature || {};
    setText('infoSchemes', schemesToText(sig.schemes));
    const primary = (sig.signers && sig.signers[0]) || {};
    setText('infoSubject', primary.subject);
    setText('infoIssuer', primary.issuer);
    setText('infoCertSha', primary.sha256);

    // Hashes
    const h = info.hashes || {};
    setText('infoMd5', h.md5);
    setText('infoSha1', h.sha1);
    setText('infoSize', fmtSize(info.fileSize));

    // Permissions
    const list = document.getElementById('infoPermList');
    const count = document.getElementById('infoPermCount');
    if (list) {
      list.innerHTML = '';
      (info.permissions || []).forEach(p => {
        const li = document.createElement('li');
        li.textContent = p;
        list.appendChild(li);
      });
    }
    if (count) count.textContent = (info.permissions || []).length;

    // Ribbon
    const id = sig.identity;
    if (id) {
      ribbonName.textContent = id.label;
      ribbon.style.setProperty('--signer-color', id.color || '#39ff14');
      ribbon.classList.toggle('unknown', id.id === 'unknown');
    } else if (sig.signed) {
      ribbonName.textContent = 'Unknown';
      ribbon.style.setProperty('--signer-color', '#ffb300');
      ribbon.classList.add('unknown');
    } else {
      ribbonName.textContent = 'Unsigned';
      ribbon.style.setProperty('--signer-color', '#888');
      ribbon.classList.add('unknown');
    }
  }

  function renderBadge(info) {
    const sig = info && info.signature;
    if (!sig) {
      signerBadge.textContent = '-';
      signerBadge.style.color = '#666';
      return;
    }
    if (sig.identity) {
      signerBadge.textContent = sig.identity.label;
      signerBadge.style.color = sig.identity.color || '#39ff14';
      signerBadge.style.textShadow = `0 0 6px ${sig.identity.color || '#39ff14'}`;
    } else if (sig.signed) {
      signerBadge.textContent = 'Unknown';
      signerBadge.style.color = '#ffb300';
      signerBadge.style.textShadow = '0 0 6px #ffb300';
    } else {
      signerBadge.textContent = 'Unsigned';
      signerBadge.style.color = '#666';
      signerBadge.style.textShadow = 'none';
    }
  }

  function show() { if (currentInfo) modal.classList.remove('hidden'); }
  function hide() { modal.classList.add('hidden'); }

  openBtn.addEventListener('click', show);
  closeBtn.addEventListener('click', hide);
  doneBtn.addEventListener('click', hide);
  modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) hide();
  });

  // Expand/collapse permissions
  document.querySelectorAll('.expand-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = document.getElementById(btn.dataset.target);
      if (target) target.classList.toggle('collapsed');
      btn.classList.toggle('expanded');
    });
  });

  // Click-to-copy on hashes
  document.querySelectorAll('.copyable').forEach(el => {
    el.addEventListener('click', () => {
      const text = el.textContent;
      if (!text || text === '-') return;
      navigator.clipboard.writeText(text).then(() => {
        const orig = el.textContent;
        el.textContent = 'COPIED ✓';
        setTimeout(() => { el.textContent = orig; }, 900);
      }).catch(() => { /* noop */ });
    });
  });

  // Expose
  window.InfoModal = {
    setInfo(info) {
      if (!info || info.error) {
        currentInfo = null;
        openBtn.disabled = true;
        signerBadge.textContent = info && info.error ? 'Scan failed' : '-';
        signerBadge.style.color = '#888';
        return;
      }
      render(info);
      renderBadge(info);
      openBtn.disabled = false;
    },
    setScanning() {
      currentInfo = null;
      openBtn.disabled = true;
      signerBadge.textContent = 'Scanning...';
      signerBadge.style.color = '#888';
      signerBadge.style.textShadow = 'none';
    },
    reset() {
      currentInfo = null;
      openBtn.disabled = true;
      signerBadge.textContent = '-';
      signerBadge.style.color = '#666';
    }
  };
})();
