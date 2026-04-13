const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const { decompile, rebuild } = require('./apktool-wrapper');
const { sign } = require('./signer-wrapper');
const { extractPackageName, updateManifest, updateApktoolYml } = require('./manifest-editor');
const { renameAll } = require('./smali-renamer');
const { renameObb } = require('./obb-handler');
const { getTempDir, cleanupDir, copyFile } = require('./file-utils');

class ApkProcessor extends EventEmitter {
  /**
   * Process an APK: decompile, rename package, rebuild, sign, handle OBB.
   *
   * @param {string} apkPath - Path to the original APK file
   * @param {string} mode - "default" (.apc), "mrfix" (.mr), or "custom" (user's tag)
   * @param {string} customTag - Custom 2-3 letter tag (only used in custom mode)
   * @returns {object} Result with output path and package info
   */
  async process(apkPath, mode, customTag) {
    const tempDir = getTempDir();
    const apkDir = path.dirname(apkPath);
    const apkName = path.basename(apkPath, '.apk');

    try {
      // Step 1: Read original package name
      this.emit('progress', {
        step: 'init',
        message: 'Reading APK...',
        percent: 5
      });

      const oldPackageName = await extractPackageName(apkPath);

      // Step 2: Compute new package name
      // All modes insert a short tag after the first segment:
      //   default: com.game.foo -> com.apc.game.foo
      //   mrfix:   com.game.foo -> com.mr.game.foo
      //   custom:  com.game.foo -> com.<tag>.game.foo
      let newPackageName;
      const parts = oldPackageName.split('.');
      if (parts.length < 2) {
        throw new Error(`Invalid package name format: ${oldPackageName}`);
      }

      let tag;
      if (mode === 'default') {
        tag = 'apc';
      } else if (mode === 'mrfix') {
        tag = 'mr';
      } else {
        tag = customTag.toLowerCase();
      }

      parts.splice(1, 0, tag);
      newPackageName = parts.join('.');

      // Validate new package name
      if (!isValidPackageName(newPackageName)) {
        throw new Error(`Invalid package name: "${newPackageName}". Must be dot-separated, e.g. com.example.game`);
      }

      // Check if already renamed
      if (oldPackageName === newPackageName) {
        throw new Error(`Package is already named "${oldPackageName}". Nothing to change.`);
      }

      this.emit('progress', {
        step: 'init',
        message: `Package: ${oldPackageName} → ${newPackageName}`,
        percent: 10,
        oldPackageName,
        newPackageName
      });

      // Step 3: Decompile
      this.emit('progress', {
        step: 'decompile',
        message: 'Decompiling APK... (this may take a while for large games)',
        percent: 15
      });

      const decompDir = path.join(tempDir, 'decompiled');
      await decompile(apkPath, decompDir);

      // Step 4: Rename package in manifest
      this.emit('progress', {
        step: 'rename',
        message: 'Renaming package in manifest...',
        percent: 40
      });

      updateManifest(decompDir, oldPackageName, newPackageName);
      updateApktoolYml(decompDir, newPackageName);

      // Step 5: Rename smali references (deep rename for custom, light for default)
      this.emit('progress', {
        step: 'rename-smali',
        message: 'Updating package references in code...',
        percent: 50
      });

      // All modes use the same light-touch rename:
      // renameManifestPackage in apktool.yml handles the core rename,
      // and we update XML resources that reference the package name
      {
        const { walkDir } = require('./file-utils');
        const resDir = path.join(decompDir, 'res');
        if (fs.existsSync(resDir)) {
          const xmlFiles = await walkDir(resDir, f => f.endsWith('.xml'));
          for (const file of xmlFiles) {
            let content = fs.readFileSync(file, 'utf8');
            if (content.includes(oldPackageName)) {
              content = content.replace(
                new RegExp(oldPackageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                newPackageName
              );
              fs.writeFileSync(file, content, 'utf8');
            }
          }
        }
      }

      // Step 6: Rebuild APK
      this.emit('progress', {
        step: 'rebuild',
        message: 'Rebuilding APK... (this may take a while)',
        percent: 65
      });

      const rebuiltApk = path.join(tempDir, 'rebuilt.apk');
      await rebuild(decompDir, rebuiltApk);

      // Step 7: Sign APK
      this.emit('progress', {
        step: 'sign',
        message: 'Signing APK...',
        percent: 80
      });

      await sign(rebuiltApk);

      // Step 8: Handle OBB folder
      this.emit('progress', {
        step: 'obb',
        message: 'Checking for OBB folder...',
        percent: 90
      });

      const obbResult = renameObb(apkDir, oldPackageName, newPackageName);

      // Step 9: Copy output to final location
      this.emit('progress', {
        step: 'finalize',
        message: 'Finalizing...',
        percent: 95
      });

      const outputApk = path.join(apkDir, `${apkName}_renamed.apk`);
      copyFile(rebuiltApk, outputApk);

      // Cleanup
      cleanupDir(tempDir);

      const result = {
        outputPath: outputApk,
        oldPackageName,
        newPackageName,
        obbResult
      };

      this.emit('progress', {
        step: 'complete',
        message: 'Done!',
        percent: 100
      });

      this.emit('complete', result);
      return result;

    } catch (err) {
      cleanupDir(tempDir);
      this.emit('error', { message: err.message, details: err.stack });
      throw err;
    }
  }
}

function isValidPackageName(name) {
  if (!name || typeof name !== 'string') return false;
  // Must have at least two segments separated by dots
  // Each segment must start with a letter and contain only alphanumeric chars or underscores
  return /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(name);
}

module.exports = ApkProcessor;
