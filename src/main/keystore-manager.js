/**
 * Keystore manager.
 * Generates APC signing keystores via keytool (bundled with the JRE).
 *
 * Keystore DN encodes:
 *   CN=Automagic Package Changer
 *   OU=<signature text>                     e.g. "DMP used Automagic on this APK!"
 *   O=APC
 *   L=Previously signed by <X> (<LABEL>)    e.g. "Previously signed by NotQuestUnderground (VRP)"
 *
 * Keystores are cached by DN hash in userData/keystores so we only
 * generate each unique DN once.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { app } = require('electron');
const { getJavaPath } = require('./file-utils');

const KEYSTORE_ALIAS = 'apc';
const KEYSTORE_PASSWORD = 'automagicapc';

function getKeystoreDir() {
  const dir = path.join(app.getPath('userData'), 'keystores');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getKeytoolPath() {
  const java = getJavaPath();
  const binDir = path.dirname(java);
  const isWin = process.platform === 'win32';
  const keytool = path.join(binDir, isWin ? 'keytool.exe' : 'keytool');
  if (fs.existsSync(keytool)) return keytool;
  // Fall back to PATH
  return isWin ? 'keytool.exe' : 'keytool';
}

/**
 * Build the DN string for the APC signing certificate.
 * @param {object} opts
 * @param {string} opts.signatureText - Goes in OU=
 * @param {object|null} opts.previousIdentity - { label, fullName } from inspector, or null
 */
function buildDn({ signatureText, previousIdentity }) {
  // keytool -dname expects escaped commas. We just avoid commas in values.
  const safe = (s) => String(s || '').replace(/[,"\\=<>;+]/g, ' ').trim().slice(0, 200);

  const cn = 'Automagic Package Changer';
  const ou = safe(signatureText) || 'Automagic';
  const o  = 'APC';

  let l = 'Fresh rename';
  if (previousIdentity && previousIdentity.fullName) {
    const tag = previousIdentity.label && previousIdentity.label !== previousIdentity.fullName
      ? ` (${safe(previousIdentity.label)})`
      : '';
    l = `Previously signed by ${safe(previousIdentity.fullName)}${tag}`;
  }

  return `CN=${cn}, OU=${ou}, O=${o}, L=${l}`;
}

function dnHash(dn) {
  return crypto.createHash('sha1').update(dn).digest('hex').slice(0, 16);
}

/**
 * Get (or generate) a keystore matching the given DN.
 * Returns { path, alias, storePass, keyPass, dn }.
 */
async function getOrCreateKeystore(opts) {
  const dn = buildDn(opts);
  const hash = dnHash(dn);
  const ksPath = path.join(getKeystoreDir(), `apc-${hash}.jks`);

  if (fs.existsSync(ksPath)) {
    return { path: ksPath, alias: KEYSTORE_ALIAS, storePass: KEYSTORE_PASSWORD, keyPass: KEYSTORE_PASSWORD, dn };
  }

  const keytool = getKeytoolPath();
  await new Promise((resolve, reject) => {
    execFile(keytool, [
      '-genkeypair',
      '-v',
      '-keystore', ksPath,
      '-alias', KEYSTORE_ALIAS,
      '-keyalg', 'RSA',
      '-keysize', '2048',
      '-validity', '10000',
      '-storepass', KEYSTORE_PASSWORD,
      '-keypass', KEYSTORE_PASSWORD,
      '-dname', dn
    ], { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`keytool failed: ${stderr || error.message}`));
      else resolve();
    });
  });

  return { path: ksPath, alias: KEYSTORE_ALIAS, storePass: KEYSTORE_PASSWORD, keyPass: KEYSTORE_PASSWORD, dn };
}

module.exports = { getOrCreateKeystore, buildDn };
