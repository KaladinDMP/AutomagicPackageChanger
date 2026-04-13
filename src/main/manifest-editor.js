const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { getJavaPath, getToolPath } = require('./file-utils');

/**
 * Extract the package name from an APK file by doing a quick apktool decode
 * of just the manifest, or by reading the decompiled manifest.
 */
async function extractPackageName(apkPath) {
  const java = getJavaPath();
  const apktool = getToolPath('apktool.jar');

  if (!apktool) {
    throw new Error('apktool.jar not found.');
  }

  // Use apktool to dump just the manifest info
  return new Promise((resolve, reject) => {
    const os = require('os');
    const tempDir = path.join(os.tmpdir(), 'automagic-manifest-' + Date.now());

    execFile(java, ['-jar', apktool, 'd', '-f', '-s', '-o', tempDir, apkPath], {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 120000
    }, (error, stdout, stderr) => {
      try {
        if (error) {
          reject(new Error(`Failed to read APK: ${error.message}`));
          return;
        }

        const manifestPath = path.join(tempDir, 'AndroidManifest.xml');
        if (!fs.existsSync(manifestPath)) {
          reject(new Error('AndroidManifest.xml not found in APK'));
          return;
        }

        const manifest = fs.readFileSync(manifestPath, 'utf8');
        const match = manifest.match(/package="([^"]+)"/);
        if (!match) {
          reject(new Error('Could not find package name in AndroidManifest.xml'));
          return;
        }

        // Cleanup temp dir
        fs.rmSync(tempDir, { recursive: true, force: true });
        resolve(match[1]);
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Update the package name in the decompiled AndroidManifest.xml
 */
function updateManifest(decompDir, oldPackageName, newPackageName) {
  const manifestPath = path.join(decompDir, 'AndroidManifest.xml');
  let manifest = fs.readFileSync(manifestPath, 'utf8');

  // Replace the package attribute
  manifest = manifest.replace(
    `package="${oldPackageName}"`,
    `package="${newPackageName}"`
  );

  // Replace provider authorities that reference the old package
  const authorityPattern = new RegExp(
    `android:authorities="([^"]*?)${escapeRegex(oldPackageName)}([^"]*?)"`,
    'g'
  );
  manifest = manifest.replace(authorityPattern, (match, pre, post) => {
    return `android:authorities="${pre}${newPackageName}${post}"`;
  });

  // Replace taskAffinity references
  const affinityPattern = new RegExp(
    `android:taskAffinity="${escapeRegex(oldPackageName)}([^"]*?)"`,
    'g'
  );
  manifest = manifest.replace(affinityPattern, (match, suffix) => {
    return `android:taskAffinity="${newPackageName}${suffix}"`;
  });

  fs.writeFileSync(manifestPath, manifest, 'utf8');
}

/**
 * Update the apktool.yml to set renameManifestPackage
 */
function updateApktoolYml(decompDir, newPackageName) {
  const ymlPath = path.join(decompDir, 'apktool.yml');
  if (!fs.existsSync(ymlPath)) return;

  let yml = fs.readFileSync(ymlPath, 'utf8');

  // Add or update renameManifestPackage
  if (yml.includes('renameManifestPackage:')) {
    yml = yml.replace(/renameManifestPackage:.*/, `renameManifestPackage: ${newPackageName}`);
  } else {
    yml += `\nrenameManifestPackage: ${newPackageName}\n`;
  }

  fs.writeFileSync(ymlPath, yml, 'utf8');
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { extractPackageName, updateManifest, updateApktoolYml };
