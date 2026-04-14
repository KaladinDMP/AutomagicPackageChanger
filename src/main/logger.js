/**
 * File logger.
 * Writes timestamped entries to <userData>/APCDebug.log so users can share
 * logs when things go wrong. Rotates when the file exceeds 5 MB.
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let stream = null;
let logPath = null;

function resolveLogPath() {
  if (logPath) return logPath;
  const dir = app.getPath('userData');
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* noop */ }
  logPath = path.join(dir, 'APCDebug.log');
  return logPath;
}

function rotateIfNeeded(p) {
  try {
    const stat = fs.statSync(p);
    if (stat.size > 5 * 1024 * 1024) {
      const old = p + '.1';
      try { fs.unlinkSync(old); } catch { /* noop */ }
      fs.renameSync(p, old);
    }
  } catch { /* file doesn't exist yet */ }
}

function init() {
  const p = resolveLogPath();
  rotateIfNeeded(p);
  stream = fs.createWriteStream(p, { flags: 'a' });

  log('========================================');
  log('APC Session Started');
  log(`Version:   ${app.getVersion()}`);
  log(`Platform:  ${process.platform} ${process.arch}`);
  log(`Electron:  ${process.versions.electron}`);
  log(`Node:      ${process.versions.node}`);
  log(`LogFile:   ${p}`);
  log('========================================');
}

function fmt(arg) {
  if (arg instanceof Error) return `${arg.message}\n${arg.stack || ''}`;
  if (typeof arg === 'object') {
    try { return JSON.stringify(arg); } catch { return String(arg); }
  }
  return String(arg);
}

function write(level, args) {
  const ts = new Date().toISOString();
  const msg = args.map(fmt).join(' ');
  const line = `[${ts}] [${level}] ${msg}\n`;
  try { stream && stream.write(line); } catch { /* noop */ }
  if (level === 'ERROR') {
    // eslint-disable-next-line no-console
    console.error(msg);
  } else {
    // eslint-disable-next-line no-console
    console.log(msg);
  }
}

function log(...args)   { write('INFO',  args); }
function warn(...args)  { write('WARN',  args); }
function error(...args) { write('ERROR', args); }
function debug(...args) { write('DEBUG', args); }

function getLogPath() { return resolveLogPath(); }

module.exports = { init, log, warn, error, debug, getLogPath };
