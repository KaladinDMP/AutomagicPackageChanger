const fs = require('fs');
const path = require('path');

/**
 * Look for an OBB folder matching the old package name near the APK,
 * and rename it (and its contents) to match the new package name.
 *
 * Common Quest sideloading structures:
 *   /SomeFolder/game.apk
 *   /SomeFolder/com.game.name/       <-- OBB/data folder
 *
 * Or:
 *   /SomeFolder/game.apk
 *   /SomeFolder/obb/com.game.name/   <-- inside an obb subfolder
 */
function renameObb(apkDir, oldPackageName, newPackageName) {
  const results = {
    found: false,
    renamed: false,
    paths: []
  };

  // Locations to check for the OBB folder
  const searchLocations = [
    // Same directory as APK
    path.join(apkDir, oldPackageName),
    // Inside an 'obb' subdirectory
    path.join(apkDir, 'obb', oldPackageName),
    // Parent directory
    path.join(path.dirname(apkDir), oldPackageName),
    // Inside parent's 'obb' subdirectory
    path.join(path.dirname(apkDir), 'obb', oldPackageName),
  ];

  for (const obbDir of searchLocations) {
    if (fs.existsSync(obbDir) && fs.statSync(obbDir).isDirectory()) {
      results.found = true;

      const newObbDir = path.join(path.dirname(obbDir), newPackageName);

      try {
        // Rename OBB files inside the folder first
        renameObbFiles(obbDir, oldPackageName, newPackageName);

        // Rename the folder itself
        fs.renameSync(obbDir, newObbDir);

        results.renamed = true;
        results.paths.push({
          from: obbDir,
          to: newObbDir
        });
      } catch (err) {
        results.error = `Failed to rename OBB folder: ${err.message}`;
      }
    }
  }

  return results;
}

/**
 * Rename .obb files inside the folder that follow the naming convention:
 *   main.<versionCode>.<packageName>.obb
 *   patch.<versionCode>.<packageName>.obb
 */
function renameObbFiles(obbDir, oldPackageName, newPackageName) {
  const entries = fs.readdirSync(obbDir);

  for (const entry of entries) {
    if (entry.includes(oldPackageName)) {
      const oldPath = path.join(obbDir, entry);
      const newName = entry.replace(oldPackageName, newPackageName);
      const newPath = path.join(obbDir, newName);

      fs.renameSync(oldPath, newPath);
    }
  }
}

/**
 * Check if an OBB folder exists near the APK without renaming anything.
 * Used to show status in the info panel before processing.
 */
function checkObb(apkDir, packageName) {
  const searchLocations = [
    path.join(apkDir, packageName),
    path.join(apkDir, 'obb', packageName),
    path.join(path.dirname(apkDir), packageName),
    path.join(path.dirname(apkDir), 'obb', packageName),
  ];

  for (const obbDir of searchLocations) {
    if (fs.existsSync(obbDir) && fs.statSync(obbDir).isDirectory()) {
      return { found: true, path: obbDir };
    }
  }

  return { found: false };
}

module.exports = { renameObb, checkObb };
