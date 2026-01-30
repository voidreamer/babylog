#!/usr/bin/env node
/**
 * CI check: compare English translation keys against Spanish and French.
 * Reports missing keys. Exits with code 1 if any are found.
 * Usage: node scripts/check-i18n.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales');
const NAMESPACES = ['common', 'dashboard', 'health', 'onboarding', 'settings'];
const TARGET_LANGS = ['es', 'fr'];

function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

let totalMissing = 0;
let hasErrors = false;

for (const ns of NAMESPACES) {
  const enPath = path.join(LOCALES_DIR, 'en', `${ns}.json`);
  if (!fs.existsSync(enPath)) {
    console.error(`❌ Missing English file: en/${ns}.json`);
    hasErrors = true;
    continue;
  }

  const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  const enKeys = Object.keys(flatten(enData));

  for (const lang of TARGET_LANGS) {
    const targetPath = path.join(LOCALES_DIR, lang, `${ns}.json`);
    if (!fs.existsSync(targetPath)) {
      console.error(`❌ Missing file: ${lang}/${ns}.json`);
      hasErrors = true;
      continue;
    }

    const targetData = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
    const targetKeys = new Set(Object.keys(flatten(targetData)));

    const missing = enKeys.filter(k => !targetKeys.has(k));
    if (missing.length > 0) {
      console.error(`\n❌ ${lang}/${ns}.json — ${missing.length} missing keys:`);
      missing.forEach(k => console.error(`   - ${k}`));
      totalMissing += missing.length;
      hasErrors = true;
    } else {
      console.log(`✅ ${lang}/${ns}.json — all ${enKeys.length} keys present`);
    }

    // Also check for extra keys not in English
    const extra = [...targetKeys].filter(k => !enKeys.includes(k));
    if (extra.length > 0) {
      console.warn(`  ⚠️  ${lang}/${ns}.json has ${extra.length} extra keys not in English`);
    }
  }
}

if (hasErrors) {
  console.error(`\n❌ Total missing: ${totalMissing} keys`);
  process.exit(1);
} else {
  console.log('\n✅ All translation files are in sync!');
  process.exit(0);
}
