/**
 * Persisted user settings.
 * Stored as JSON in Electron's userData folder so it survives reinstalls.
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULTS = {
  signature: {
    mode: 'default',           // 'default' | 'tag' | 'custom'
    customText: ''             // used when mode === 'custom'
  }
};

let cached = null;

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function load() {
  if (cached) return cached;
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf8');
    cached = Object.assign({}, DEFAULTS, JSON.parse(raw));
  } catch {
    cached = JSON.parse(JSON.stringify(DEFAULTS));
  }
  return cached;
}

function save(partial) {
  const current = load();
  const merged = {
    ...current,
    ...partial,
    signature: { ...current.signature, ...(partial.signature || {}) }
  };
  cached = merged;
  try {
    fs.mkdirSync(path.dirname(getSettingsPath()), { recursive: true });
    fs.writeFileSync(getSettingsPath(), JSON.stringify(merged, null, 2), 'utf8');
  } catch {
    // Best-effort: if we can't persist, still keep the in-memory value.
  }
  return merged;
}

/**
 * Resolve the final signature text for a given rename tag.
 * - 'default' → "DMP used Automagic on this APK!"
 * - 'tag'     → "<TAG> used Automagic on this APK!"
 * - 'custom'  → user's free-text (trimmed, capped at 120 chars)
 */
function resolveSignatureText(tag) {
  const { signature } = load();
  const DEFAULT_TEXT = 'DMP used Automagic on this APK!';

  if (signature.mode === 'tag' && tag) {
    return `${tag.toUpperCase()} used Automagic on this APK!`;
  }
  if (signature.mode === 'custom' && signature.customText) {
    return signature.customText.trim().slice(0, 120);
  }
  return DEFAULT_TEXT;
}

module.exports = { load, save, resolveSignatureText };
