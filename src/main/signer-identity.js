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
 * Extract a named RDN value out of a DN string. Case-insensitive key match.
 * Example: extractRdn("CN=Foo, OU=Bar, O=Baz", "O") -> "Baz"
 */
function extractRdn(dn, key) {
  if (!dn) return null;
  const re = new RegExp('(?:^|,)\\s*' + key + '\\s*=\\s*([^,]+)', 'i');
  const m = dn.match(re);
  return m ? m[1].trim() : null;
}

/**
 * Pull the CN value out of a DN string like "CN=Foo, OU=Bar, O=Baz".
 */
function extractCN(dn) {
  return extractRdn(dn, 'CN');
}

/**
 * Build a lookup string from CN + O + also raw CN=/O= fragments so registry
 * entries can match either by value or by a `CN=...` / `O=...` literal.
 *
 * IMPORTANT: We deliberately EXCLUDE OU and L fields. OU is user-configurable
 * signature text ("DMP used Automagic on this APK!") and L carries our lineage
 * breadcrumb ("Previously signed by NothingIsFree (NIF)"). Matching those
 * would cause false positives — e.g. APC's own cert would match NIF because
 * "NothingIsFree" is in the L= lineage line.
 */
function buildIdentityHaystack(dn) {
  if (!dn) return '';
  const cn = extractRdn(dn, 'CN') || '';
  const o  = extractRdn(dn, 'O')  || '';
  const parts = [];
  if (cn) { parts.push(cn); parts.push('CN=' + cn); }
  if (o)  { parts.push(o);  parts.push('O=' + o);  }
  return parts.join(' ').toLowerCase();
}

/**
 * Match a signer DN (subject and/or issuer) against the registry.
 * Returns the matched signer record or null.
 *
 * Only CN and O fields participate in matching — see buildIdentityHaystack.
 */
function identifySigner({ subject, issuer }) {
  const haystack = (buildIdentityHaystack(subject) + ' ' + buildIdentityHaystack(issuer)).trim();
  if (!haystack) return null;

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

module.exports = { identifySigner, extractCN, loadRegistry };
