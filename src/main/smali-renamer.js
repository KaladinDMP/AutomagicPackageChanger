const fs = require('fs');
const path = require('path');
const { walkDir } = require('./file-utils');

/**
 * Rename package references in all smali and resource files.
 * This performs a deep rename - updating smali class paths, XML references, etc.
 */
async function renameAll(decompDir, oldPackageName, newPackageName) {
  const oldSmaliPath = oldPackageName.replace(/\./g, '/');
  const newSmaliPath = newPackageName.replace(/\./g, '/');

  // 1. Rename smali files content (all smali directories: smali, smali_classes2, etc.)
  const smaliDirs = findSmaliDirs(decompDir);
  let filesProcessed = 0;

  for (const smaliDir of smaliDirs) {
    // Process file contents - replace package references
    const smaliFiles = await walkDir(smaliDir, (f) => f.endsWith('.smali'));
    for (const file of smaliFiles) {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;

      // Replace smali-style package references: Lcom/old/pkg/ -> Lcom/new/pkg/
      if (content.includes(`L${oldSmaliPath}/`) || content.includes(`L${oldSmaliPath};`)) {
        content = content.replace(
          new RegExp(`L${escapeRegex(oldSmaliPath)}/`, 'g'),
          `L${newSmaliPath}/`
        );
        content = content.replace(
          new RegExp(`L${escapeRegex(oldSmaliPath)};`, 'g'),
          `L${newSmaliPath};`
        );
        modified = true;
      }

      // Replace dotted package references in string constants
      if (content.includes(`"${oldPackageName}`)) {
        content = content.replace(
          new RegExp(`"${escapeRegex(oldPackageName)}`, 'g'),
          `"${newPackageName}`
        );
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        filesProcessed++;
      }
    }

    // Rename directory structure
    renameSmaliDirStructure(smaliDir, oldSmaliPath, newSmaliPath);
  }

  // 2. Process XML resources (layouts, values, etc.)
  const resDir = path.join(decompDir, 'res');
  if (fs.existsSync(resDir)) {
    const xmlFiles = await walkDir(resDir, (f) => f.endsWith('.xml'));
    for (const file of xmlFiles) {
      let content = fs.readFileSync(file, 'utf8');
      if (content.includes(oldPackageName)) {
        content = content.replace(
          new RegExp(escapeRegex(oldPackageName), 'g'),
          newPackageName
        );
        fs.writeFileSync(file, content, 'utf8');
        filesProcessed++;
      }
    }
  }

  // 3. Process kotlin metadata and other misc files
  const miscPatterns = ['*.kotlin_module', '*.kotlin_metadata', '*.properties'];
  const assetsDir = path.join(decompDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const assetFiles = await walkDir(assetsDir, (f) => {
      return f.endsWith('.xml') || f.endsWith('.json') || f.endsWith('.properties');
    });
    for (const file of assetFiles) {
      let content = fs.readFileSync(file, 'utf8');
      if (content.includes(oldPackageName)) {
        content = content.replace(
          new RegExp(escapeRegex(oldPackageName), 'g'),
          newPackageName
        );
        fs.writeFileSync(file, content, 'utf8');
        filesProcessed++;
      }
    }
  }

  return filesProcessed;
}

/**
 * Find all smali directories (smali, smali_classes2, smali_classes3, etc.)
 */
function findSmaliDirs(decompDir) {
  const dirs = [];
  const entries = fs.readdirSync(decompDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && /^smali(_classes\d+)?$/.test(entry.name)) {
      dirs.push(path.join(decompDir, entry.name));
    }
  }

  return dirs;
}

/**
 * Rename the directory structure inside a smali dir to match the new package path.
 * e.g., smali/com/old/pkg/ -> smali/com/new/pkg/
 */
function renameSmaliDirStructure(smaliDir, oldSmaliPath, newSmaliPath) {
  const oldDir = path.join(smaliDir, oldSmaliPath);
  const newDir = path.join(smaliDir, newSmaliPath);

  if (!fs.existsSync(oldDir)) return;
  if (oldDir === newDir) return;

  // Create new directory structure
  fs.mkdirSync(newDir, { recursive: true });

  // Move all files from old to new
  const entries = fs.readdirSync(oldDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(oldDir, entry.name);
    const dest = path.join(newDir, entry.name);
    fs.renameSync(src, dest);
  }

  // Clean up empty old directories
  removeEmptyDirs(path.join(smaliDir, oldSmaliPath.split('/')[0]));
}

/**
 * Remove empty directories recursively (bottom-up)
 */
function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      removeEmptyDirs(path.join(dir, entry.name));
    }
  }

  // Re-read after potential child removal
  const remaining = fs.readdirSync(dir);
  if (remaining.length === 0) {
    fs.rmdirSync(dir);
  }
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { renameAll };
