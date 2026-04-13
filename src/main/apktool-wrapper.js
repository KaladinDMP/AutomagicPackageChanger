const { execFile } = require('child_process');
const { getJavaPath, getToolPath } = require('./file-utils');

function execAsync(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = execFile(cmd, args, {
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large APKs
      timeout: 600000, // 10 minute timeout
      ...options
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${error.message}\n${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });

    return proc;
  });
}

async function decompile(apkPath, outputDir) {
  const java = getJavaPath();
  const apktool = getToolPath('apktool.jar');

  if (!apktool) {
    throw new Error('apktool.jar not found. Run "npm run setup-tools" to download required tools.');
  }

  const args = ['-jar', apktool, 'd', '-f', '-o', outputDir, apkPath];
  return execAsync(java, args);
}

async function rebuild(decompDir, outputApkPath) {
  const java = getJavaPath();
  const apktool = getToolPath('apktool.jar');

  if (!apktool) {
    throw new Error('apktool.jar not found. Run "npm run setup-tools" to download required tools.');
  }

  const args = ['-jar', apktool, 'b', '-o', outputApkPath, decompDir];
  return execAsync(java, args);
}

module.exports = { decompile, rebuild };
