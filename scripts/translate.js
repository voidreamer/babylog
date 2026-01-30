#!/usr/bin/env node
/**
 * Auto-translate missing i18n keys using DeepL API.
 * Usage: node scripts/translate.js
 *
 * Reads en/*.json, finds missing keys in es/ and fr/, translates via DeepL.
 * No external dependencies — uses built-in fetch (Node 18+).
 */

const fs = require('fs');
const path = require('path');

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';
const DEEPL_AUTH_KEY = process.env.DEEPL_AUTH_KEY || '95d1d280-d7a8-42ec-b2c4-3eb7fc3f62d8:fx';

const LOCALES_DIR = path.join(__dirname, '..', 'frontend', 'src', 'locales');
const SOURCE_LANG = 'EN';
const TARGET_LANGS = { es: 'ES', fr: 'FR' };

function getAllKeys(obj, prefix = '') {
  const keys = {};
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(keys, getAllKeys(v, fullKey));
    } else {
      keys[fullKey] = v;
    }
  }
  return keys;
}

function setNestedKey(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

async function translateTexts(texts, targetLang) {
  const res = await fetch(DEEPL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${DEEPL_AUTH_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: texts,
      target_lang: targetLang,
      source_lang: SOURCE_LANG,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepL API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.translations.map(t => t.text);
}

async function main() {
  const enDir = path.join(LOCALES_DIR, 'en');
  if (!fs.existsSync(enDir)) {
    console.error('No en/ locale directory found at', enDir);
    process.exit(1);
  }

  const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
  if (enFiles.length === 0) {
    console.log('No JSON files found in en/');
    return;
  }

  let totalTranslated = 0;

  for (const [langCode, deeplLang] of Object.entries(TARGET_LANGS)) {
    const langDir = path.join(LOCALES_DIR, langCode);
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    for (const file of enFiles) {
      const enData = JSON.parse(fs.readFileSync(path.join(enDir, file), 'utf8'));
      const enKeys = getAllKeys(enData);

      const targetPath = path.join(langDir, file);
      let targetData = {};
      if (fs.existsSync(targetPath)) {
        targetData = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      }
      const targetKeys = getAllKeys(targetData);

      // Find missing keys
      const missing = Object.entries(enKeys).filter(([k]) => !(k in targetKeys));
      if (missing.length === 0) continue;

      console.log(`[${langCode}/${file}] ${missing.length} missing keys`);

      // Translate in batches of 50
      const BATCH_SIZE = 50;
      for (let i = 0; i < missing.length; i += BATCH_SIZE) {
        const batch = missing.slice(i, i + BATCH_SIZE);
        const texts = batch.map(([, v]) => String(v));

        try {
          const translated = await translateTexts(texts, deeplLang);
          for (let j = 0; j < batch.length; j++) {
            setNestedKey(targetData, batch[j][0], translated[j]);
          }
          totalTranslated += batch.length;
        } catch (err) {
          console.error(`  Error translating batch: ${err.message}`);
          process.exit(1);
        }
      }

      fs.writeFileSync(targetPath, JSON.stringify(targetData, null, 2) + '\n', 'utf8');
      console.log(`  ✓ Updated ${targetPath}`);
    }
  }

  console.log(`\nDone! Translated ${totalTranslated} keys total.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
