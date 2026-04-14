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

/**
 * Sign an APK.
 * @param {string} apkPath
 * @param {object} [keystore] - { path, alias, storePass, keyPass } - if omitted, uses bundled debug key
 */
async function sign(apkPath, keystore = null) {
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

  if (keystore && keystore.path) {
    args.push(
      '--ks', keystore.path,
      '--ksAlias', keystore.alias,
      '--ksPass', keystore.storePass,
      '--ksKeyPass', keystore.keyPass
    );
  }

  return execAsync(java, args);
}

module.exports = { sign };
