/**
 * Signer identity registry.
 * Maps X.509 Subject/Issuer DN substrings to known groups (VRP, NIF, APC, etc.)
 *
 * Detection is DN-based (not SHA-256) so it works even if the signer
 * rotates keys — the DN string stays stable.
 */
const fs = require('fs');
const path = require('path');

let cachedRegistry = null;

function getRegistryPath() {
  const prod = path.join(process.resourcesPath || '', 'signers.json');
  const dev = path.join(__dirname, '..', '..', 'resources', 'signers.json');
  if (fs.existsSync(prod)) return prod;
  return dev;
}

function loadRegistry() {
  if (cachedRegistry) return cachedRegistry;
  try {
    const raw = fs.readFileSync(getRegistryPath(), 'utf8');
    cachedRegistry = JSON.parse(raw).signers || [];
  } catch {
    cachedRegistry = [];
  }
  return cachedRegistry;
}

/**
 * Match a signer DN (subject and/or issuer combined) against the registry.
 * Returns the matched signer record or null.
 */
function identifySigner({ subject, issuer }) {
  const haystack = ((subject || '') + ' ' + (issuer || '')).toLowerCase();
  if (!haystack.trim()) return null;

  const registry = loadRegistry();
  for (const entry of registry) {
    for (const needle of entry.dnContains || []) {
      if (haystack.includes(needle.toLowerCase())) {
        return entry;
      }
    }
  }
  return null;
}

/**
 * Pull the CN value out of a DN string like "CN=Foo, OU=Bar, O=Baz".
 */
function extractCN(dn) {
  if (!dn) return null;
  const m = dn.match(/CN=([^,]+)/i);
  return m ? m[1].trim() : null;
}

module.exports = { identifySigner, extractCN, loadRegistry };
