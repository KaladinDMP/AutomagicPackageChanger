/**
 * APK Inspector
 * Extracts the most useful info from an APK: label, version, SDK, package,
 * ABIs, permissions, signer identity, hashes.
 *
 * Reuses the apktool decompile (resources only, -s flag) that we already
 * run for package-name extraction, so auto-scan on drop adds zero extra time.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { getJavaPath, getToolPath } = require('./file-utils');
const { identifySigner, extractCN } = require('./signer-identity');

/** Run a process and capture stdout/stderr. Never rejects on non-zero exit. */
function run(cmd, args, timeout = 180000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 50 * 1024 * 1024, timeout }, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

/** Decompile the APK resources (fast, -s skips smali). Returns decomp dir. */
async function decompileResources(apkPath) {
  const java = getJavaPath();
  const apktool = getToolPath('apktool.jar');
  if (!apktool) throw new Error('apktool.jar not found.');

  const tempDir = path.join(os.tmpdir(), 'apc-inspect-' + Date.now());
  const { error, stderr } = await run(java, [
    '-jar', apktool, 'd', '-f', '-s', '-o', tempDir, apkPath
  ]);
  if (error) {
    throw new Error(`Failed to read APK: ${stderr || error.message}`);
  }
  return tempDir;
}

/** Parse AndroidManifest.xml for the fields we care about. */
function parseManifest(manifestPath) {
  const xml = fs.readFileSync(manifestPath, 'utf8');

  const attr = (regex) => {
    const m = xml.match(regex);
    return m ? m[1] : null;
  };

  const packageName = attr(/<manifest[^>]*\spackage="([^"]+)"/);
  const versionCode = attr(/<manifest[^>]*android:versionCode="([^"]+)"/);
  const versionName = attr(/<manifest[^>]*android:versionName="([^"]+)"/);
  const compileSdk = attr(/<manifest[^>]*android:compileSdkVersion="([^"]+)"/)
    || attr(/<manifest[^>]*platformBuildVersionCode="([^"]+)"/);
  const minSdk = attr(/<uses-sdk[^>]*android:minSdkVersion="([^"]+)"/);
  const targetSdk = attr(/<uses-sdk[^>]*android:targetSdkVersion="([^"]+)"/);
  const appLabel = attr(/<application[^>]*android:label="([^"]+)"/);

  // Permissions
  const permissions = [];
  const permRegex = /<uses-permission[^>]*android:name="([^"]+)"/g;
  let pm;
  while ((pm = permRegex.exec(xml)) !== null) {
    permissions.push(pm[1]);
  }

  // Features (incl. OpenGL ES)
  const features = [];
  let glEsVersion = null;
  const featRegex = /<uses-feature[^>]*?(?:android:name="([^"]+)")?[^>]*?(?:android:glEsVersion="([^"]+)")?[^>]*?(?:android:required="([^"]+)")?[^>]*?\/?>/g;
  let fm;
  while ((fm = featRegex.exec(xml)) !== null) {
    if (fm[1]) features.push({ name: fm[1], required: fm[3] !== 'false' });
    if (fm[2]) {
      // glEsVersion is encoded as hex like 0x00030001 → "3.1"
      const hex = fm[2].startsWith('0x') ? parseInt(fm[2], 16) : parseInt(fm[2], 10);
      if (!isNaN(hex)) {
        const major = hex >> 16;
        const minor = hex & 0xffff;
        glEsVersion = `${major}.${minor}`;
      }
    }
  }

  return {
    packageName,
    versionCode,
    versionName,
    minSdk,
    targetSdk,
    compileSdk,
    appLabel,
    permissions,
    features,
    glEsVersion
  };
}

/** Parse apktool.yml for extra SDK/version info that sometimes isn't in the manifest. */
function parseApktoolYml(decompDir) {
  const ymlPath = path.join(decompDir, 'apktool.yml');
  if (!fs.existsSync(ymlPath)) return {};

  const yml = fs.readFileSync(ymlPath, 'utf8');
  const grab = (re) => { const m = yml.match(re); return m ? m[1].trim() : null; };

  return {
    minSdkVersion: grab(/minSdkVersion:\s*['"]?(\d+)['"]?/),
    targetSdkVersion: grab(/targetSdkVersion:\s*['"]?(\d+)['"]?/),
    versionCode: grab(/versionCode:\s*['"]?(\d+)['"]?/),
    versionName: grab(/versionName:\s*['"]?([^'"\n]+)['"]?/)
  };
}

/** List APK zip entries using Java's `jar tf`. Detects ABIs and locales. */
async function listZipEntries(apkPath) {
  const java = getJavaPath();
  // `jar` lives next to java in the JRE bin folder
  const javaBin = path.dirname(java);
  const isWin = process.platform === 'win32';
  const jar = path.join(javaBin, isWin ? 'jar.exe' : 'jar');

  let result;
  if (fs.existsSync(jar)) {
    result = await run(jar, ['tf', apkPath], 30000);
  } else {
    // Fall back to raw zip listing via a tiny node-only scan
    return listZipEntriesNative(apkPath);
  }

  if (result.error) return listZipEntriesNative(apkPath);
  return result.stdout.split('\n').map(s => s.trim()).filter(Boolean);
}

/**
 * Minimal fallback: read the APK's End-of-Central-Directory and walk entries.
 * We only need names, not contents.
 */
function listZipEntriesNative(apkPath) {
  try {
    const buf = fs.readFileSync(apkPath);
    const names = [];
    // Scan for local file headers: signature 0x04034b50
    for (let i = 0; i < buf.length - 30; i++) {
      if (buf.readUInt32LE(i) === 0x04034b50) {
        const nameLen = buf.readUInt16LE(i + 26);
        const extraLen = buf.readUInt16LE(i + 28);
        const name = buf.slice(i + 30, i + 30 + nameLen).toString('utf8');
        names.push(name);
        const compSize = buf.readUInt32LE(i + 18);
        i += 30 + nameLen + extraLen + compSize - 1;
      }
    }
    return names;
  } catch {
    return [];
  }
}

function extractArchitectures(entries) {
  const abis = new Set();
  for (const e of entries) {
    const m = e.match(/^lib\/([^/]+)\//);
    if (m) abis.add(m[1]);
  }
  return [...abis].sort();
}

function extractLocales(entries) {
  const locales = new Set();
  for (const e of entries) {
    const m = e.match(/^res\/values-([a-zA-Z][a-zA-Z0-9-]+)\//);
    if (m) {
      // Skip density/size qualifiers (hdpi, night, v21, etc.)
      const q = m[1];
      if (/^(ldpi|mdpi|hdpi|xhdpi|xxhdpi|xxxhdpi|night|notnight|land|port|sw\d|w\d|h\d|v\d+|television|watch|car)$/i.test(q)) continue;
      locales.add(q);
    }
  }
  return [...locales].sort();
}

/** Compute MD5 + SHA1 hashes of the APK file. */
function computeHashes(apkPath) {
  return new Promise((resolve, reject) => {
    const md5 = crypto.createHash('md5');
    const sha1 = crypto.createHash('sha1');
    const stream = fs.createReadStream(apkPath);
    stream.on('data', (chunk) => {
      md5.update(chunk);
      sha1.update(chunk);
    });
    stream.on('error', reject);
    stream.on('end', () => {
      resolve({ md5: md5.digest('hex'), sha1: sha1.digest('hex') });
    });
  });
}

/**
 * Run uber-apk-signer in verify mode and parse the cert output.
 * Returns { signed, schemes, signers: [{ subject, issuer, sha256, sha1 }], identity }
 */
async function inspectSignature(apkPath) {
  const java = getJavaPath();
  const signer = getToolPath('uber-apk-signer.jar');
  const result = {
    signed: false,
    schemes: { v1: false, v2: false, v3: false },
    signers: [],
    identity: null
  };
  if (!signer) return result;

  const { stdout, stderr } = await run(java, [
    '-jar', signer, '-a', apkPath, '-y', '--verbose'
  ], 60000);
  const out = (stdout + '\n' + stderr);

  // Scheme verification lines. uber-apk-signer has used several formats across
  // versions, so we match permissively. Examples we've seen:
  //   "v1 scheme: true"
  //   "signed by v1 scheme: true"
  //   "APK Signature Scheme v2: true"
  //   "scheme v3: true"
  //   "v2 (APK Signature Scheme v2): true"
  const schemeRe = (n) => new RegExp(
    '(?:scheme\\s*v' + n + '|v' + n + '\\s*\\(?\\s*(?:apk\\s*)?(?:signature\\s*)?scheme|v' + n + '\\s*scheme|v' + n + ')\\s*\\)?[^\\n]*?[:\\-]\\s*(true|verified|success)',
    'i'
  );
  if (schemeRe(1).test(out)) result.schemes.v1 = true;
  if (schemeRe(2).test(out)) result.schemes.v2 = true;
  if (schemeRe(3).test(out)) result.schemes.v3 = true;

  // Per-signer certificate blocks
  // Typical uber-apk-signer --verbose block includes:
  //   Subject: CN=..., ...
  //   SHA256: <hex> / SHA256withRSA
  //   SHA1: <hex>
  //   Issuer: CN=..., ...
  const blocks = out.split(/\n\s*\n/);
  for (const block of blocks) {
    if (!/Subject\s*:/i.test(block) && !/Issuer\s*:/i.test(block)) continue;
    const subject = (block.match(/Subject\s*:\s*([^\n]+)/i) || [])[1]?.trim();
    const issuer = (block.match(/Issuer\s*:\s*([^\n]+)/i) || [])[1]?.trim();
    const sha256 = (block.match(/SHA256\s*:\s*([a-f0-9]{64})/i) || [])[1];
    const sha1 = (block.match(/SHA1\s*:\s*([a-f0-9]{40})/i) || [])[1];
    if (subject || issuer) {
      result.signers.push({ subject, issuer, sha256, sha1 });
    }
  }

  result.signed = result.signers.length > 0 ||
                  result.schemes.v1 || result.schemes.v2 || result.schemes.v3;

  // If uber-apk-signer produced per-signer cert blocks but the scheme regex
  // didn't pick anything up (output format drift), infer schemes from the
  // overall verdict: a cert exists → at least v1 was verified. v2/v3 presence
  // is detected from block text if available.
  if (result.signed && !result.schemes.v1 && !result.schemes.v2 && !result.schemes.v3) {
    // Check for any positive verification wording
    if (/verified\s*:\s*true/i.test(out) || /signature\s+is\s+valid/i.test(out) || result.signers.length > 0) {
      result.schemes.v1 = true;
      if (/scheme\s*v2|v2\s*signature/i.test(out)) result.schemes.v2 = true;
      if (/scheme\s*v3|v3\s*signature/i.test(out)) result.schemes.v3 = true;
    }
  }

  // Identify first signer against the registry
  if (result.signers.length > 0) {
    const ident = identifySigner(result.signers[0]);
    if (ident) {
      result.identity = {
        id: ident.id,
        label: ident.label,
        fullName: ident.fullName,
        color: ident.color
      };
    } else {
      result.identity = {
        id: 'unknown',
        label: extractCN(result.signers[0].subject) || 'Unknown',
        fullName: extractCN(result.signers[0].subject) || 'Unknown signer',
        color: '#ffb300'
      };
    }
  }

  return result;
}

/**
 * Inspect everything. If `decompDir` is supplied, reuse it; otherwise decompile.
 * Returns the info object AND the decomp dir (caller must clean it up if it
 * was created here).
 */
async function inspectApk(apkPath, opts = {}) {
  const apkStat = fs.statSync(apkPath);
  const decompDir = opts.decompDir || await decompileResources(apkPath);
  const createdDecomp = !opts.decompDir;

  try {
    const manifestPath = path.join(decompDir, 'AndroidManifest.xml');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('AndroidManifest.xml not found after decompile');
    }

    const manifest = parseManifest(manifestPath);
    const yml = parseApktoolYml(decompDir);

    const [zipEntries, hashes, signature] = await Promise.all([
      listZipEntries(apkPath),
      computeHashes(apkPath),
      inspectSignature(apkPath)
    ]);

    const info = {
      fileName: path.basename(apkPath),
      filePath: apkPath,
      fileSize: apkStat.size,
      packageName: manifest.packageName,
      appLabel: manifest.appLabel,
      versionName: manifest.versionName || yml.versionName,
      versionCode: manifest.versionCode || yml.versionCode,
      minSdk: manifest.minSdk || yml.minSdkVersion,
      targetSdk: manifest.targetSdk || yml.targetSdkVersion,
      compileSdk: manifest.compileSdk,
      glEsVersion: manifest.glEsVersion,
      abis: extractArchitectures(zipEntries),
      locales: extractLocales(zipEntries),
      permissions: manifest.permissions,
      features: manifest.features,
      hashes,
      signature
    };

    return { info, decompDir, createdDecomp };
  } catch (err) {
    if (createdDecomp) {
      try { fs.rmSync(decompDir, { recursive: true, force: true }); } catch { /* noop */ }
    }
    throw err;
  }
}

module.exports = { inspectApk, inspectSignature };
