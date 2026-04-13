const fs = require('fs');
const path = require('path');
const os = require('os');

function getTempDir(prefix = 'automagic-') {
  const tempBase = path.join(os.tmpdir(), prefix + Date.now());
  fs.mkdirSync(tempBase, { recursive: true });
  return tempBase;
}

function cleanupDir(dirPath) {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch {
    // Best effort cleanup
  }
}

function getToolPath(toolName) {
  // In production (packaged), tools are in process.resourcesPath
  // In development, they're in the resources/ folder
  const prodPath = path.join(process.resourcesPath, 'tools', toolName);
  const devPath = path.join(__dirname, '../../resources/tools', toolName);

  if (fs.existsSync(prodPath)) return prodPath;
  if (fs.existsSync(devPath)) return devPath;
  return null;
}

function getJavaPath() {
  const isWindows = process.platform === 'win32';
  const javaBin = isWindows ? 'java.exe' : 'java';

  // Check bundled JRE first
  const prodJre = path.join(process.resourcesPath, 'jre', 'bin', javaBin);
  const devJre = path.join(__dirname, '../../resources/jre', 'bin', javaBin);

  if (fs.existsSync(prodJre)) return prodJre;
  if (fs.existsSync(devJre)) return devJre;

  // Fall back to system Java
  return 'java';
}

async function walkDir(dir, filter) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walkDir(fullPath, filter));
    } else if (!filter || filter(fullPath)) {
      results.push(fullPath);
    }
  }

  return results;
}

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
}

module.exports = { getTempDir, cleanupDir, getToolPath, getJavaPath, walkDir, copyFile };
