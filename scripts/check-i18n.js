#!/usr/bin/env node
/**
 * CI check: verify all i18n keys in en/*.json exist in es/ and fr/.
 * Usage: node scripts/check-i18n.js
 * Exits 1 if any keys are missing.
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'frontend', 'src', 'locales');
const TARGET_LANGS = ['es', 'fr'];

function getAllKeys(obj, prefix = '') {
  const keys = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      for (const nested of getAllKeys(v, fullKey)) keys.add(nested);
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

const enDir = path.join(LOCALES_DIR, 'en');
if (!fs.existsSync(enDir)) {
  console.log('No en/ locale directory found — skipping i18n check.');
  process.exit(0);
}

const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
if (enFiles.length === 0) {
  console.log('No JSON files in en/ — nothing to check.');
  process.exit(0);
}

let hasMissing = false;

for (const lang of TARGET_LANGS) {
  const langDir = path.join(LOCALES_DIR, lang);

  for (const file of enFiles) {
    const enData = JSON.parse(fs.readFileSync(path.join(enDir, file), 'utf8'));
    const enKeys = getAllKeys(enData);

    const targetPath = path.join(langDir, file);
    if (!fs.existsSync(targetPath)) {
      console.error(`✗ Missing file: ${lang}/${file} (${enKeys.size} keys)`);
      hasMissing = true;
      continue;
    }

    const targetData = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    const targetKeys = getAllKeys(targetData);

    const missing = [...enKeys].filter(k => !targetKeys.has(k));
    if (missing.length > 0) {
      console.error(`✗ ${lang}/${file}: ${missing.length} missing keys`);
      for (const k of missing.slice(0, 10)) {
        console.error(`    - ${k}`);
      }
      if (missing.length > 10) {
        console.error(`    ... and ${missing.length - 10} more`);
      }
      hasMissing = true;
    } else {
      console.log(`✓ ${lang}/${file}: all keys present`);
    }
  }
}

if (hasMissing) {
  console.error('\ni18n check failed. Run `node scripts/translate.js` to fix.');
  process.exit(1);
} else {
  console.log('\nAll i18n keys present! ✓');
}
