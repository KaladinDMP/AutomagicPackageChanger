const { execFile } = require('child_process');
const { getJavaPath, getToolPath } = require('./file-utils');

function execAsync(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 300000, // 5 minute timeout
      ...options
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Signing failed: ${error.message}\n${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function sign(apkPath) {
  const java = getJavaPath();
  const signer = getToolPath('uber-apk-signer.jar');

  if (!signer) {
    throw new Error('uber-apk-signer.jar not found. Run "npm run setup-tools" to download required tools.');
  }

  const args = [
    '-jar', signer,
    '-a', apkPath,
    '--allowResign',
    '--overwrite'
  ];

  return execAsync(java, args);
}

module.exports = { sign };
