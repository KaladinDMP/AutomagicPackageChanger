/**
 * Setup script to download required tools:
 * - apktool.jar
 * - uber-apk-signer.jar
 *
 * Run with: npm run setup-tools
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const TOOLS_DIR = path.join(__dirname, '..', 'resources', 'tools');

const TOOLS = [
  {
    name: 'apktool.jar',
    url: 'https://github.com/iBotPeaches/Apktool/releases/download/v2.9.3/apktool_2.9.3.jar',
    description: 'Apktool v2.9.3'
  },
  {
    name: 'uber-apk-signer.jar',
    url: 'https://github.com/nicholasgasior/uber-apk-signer/releases/download/1.3.0/uber-apk-signer-1.3.0.jar',
    description: 'Uber APK Signer v1.3.0'
  }
];

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;

    function doRequest(requestUrl) {
      protocol.get(requestUrl, (response) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          doRequest(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode} for ${requestUrl}`));
          return;
        }

        const total = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;

        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (total > 0) {
            const pct = Math.round((downloaded / total) * 100);
            process.stdout.write(`\r  Downloading... ${pct}%`);
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          process.stdout.write('\n');
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }

    doRequest(url);
  });
}

async function main() {
  console.log('=== AutomagicPackageChanger Tool Setup ===\n');

  // Ensure tools directory exists
  fs.mkdirSync(TOOLS_DIR, { recursive: true });

  for (const tool of TOOLS) {
    const destPath = path.join(TOOLS_DIR, tool.name);

    if (fs.existsSync(destPath)) {
      console.log(`[OK] ${tool.description} already exists`);
      continue;
    }

    console.log(`[DL] Downloading ${tool.description}...`);
    console.log(`     URL: ${tool.url}`);

    try {
      await downloadFile(tool.url, destPath);
      console.log(`[OK] ${tool.description} downloaded successfully`);
    } catch (err) {
      console.error(`[ERR] Failed to download ${tool.description}: ${err.message}`);
      console.error(`      Please download manually from: ${tool.url}`);
      console.error(`      Place it at: ${destPath}`);
    }
  }

  // Check for JRE
  const jreDir = path.join(__dirname, '..', 'resources', 'jre');
  if (!fs.existsSync(path.join(jreDir, 'bin'))) {
    console.log('\n[WARN] Portable JRE not found at resources/jre/');
    console.log('       The app will fall back to system Java.');
    console.log('       For a self-contained build, download Adoptium Temurin JRE 17:');
    console.log('       https://adoptium.net/temurin/releases/?version=17&package=jre');
    console.log('       Extract it to: resources/jre/');
  } else {
    console.log('\n[OK] Portable JRE found');
  }

  console.log('\nSetup complete!');
}

main().catch(console.error);
