#!/usr/bin/env node
/**
 * Auto-translate missing keys from English to Spanish and French using DeepL API.
 * Usage: node scripts/translate.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const DEEPL_KEY = '95d1d280-d7a8-42ec-b2c4-3eb7fc3f62d8:fx';
const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales');
const NAMESPACES = ['common', 'dashboard', 'health', 'onboarding', 'settings'];
const TARGET_LANGS = { es: 'ES', fr: 'FR' };

// Flatten nested JSON to dot-notation keys
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

// Unflatten dot-notation keys back to nested JSON
function unflatten(flat) {
  const result = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

// Call DeepL API
function translateText(text, targetLang) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      auth_key: DEEPL_KEY,
      text,
      target_lang: targetLang,
    });

    const postData = params.toString();
    const url = new URL(DEEPL_URL);

    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.translations && parsed.translations[0]) {
            resolve(parsed.translations[0].text);
          } else {
            reject(new Error(`DeepL error: ${data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Sleep helper
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  let totalTranslated = 0;

  for (const ns of NAMESPACES) {
    const enPath = path.join(LOCALES_DIR, 'en', `${ns}.json`);
    if (!fs.existsSync(enPath)) continue;

    const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    const enFlat = flatten(enData);

    for (const [langCode, deeplLang] of Object.entries(TARGET_LANGS)) {
      const targetPath = path.join(LOCALES_DIR, langCode, `${ns}.json`);
      let targetData = {};
      if (fs.existsSync(targetPath)) {
        targetData = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
      }
      const targetFlat = flatten(targetData);

      // Find missing keys
      const missing = {};
      for (const [key, value] of Object.entries(enFlat)) {
        if (!(key in targetFlat) && typeof value === 'string') {
          missing[key] = value;
        }
      }

      const missingKeys = Object.keys(missing);
      if (missingKeys.length === 0) {
        console.log(`✅ ${langCode}/${ns}.json — all keys present`);
        continue;
      }

      console.log(`🔄 ${langCode}/${ns}.json — translating ${missingKeys.length} missing keys...`);

      for (const key of missingKeys) {
        const text = missing[key];
        // Skip interpolation-heavy or very short strings
        if (!text || text.length === 0) {
          targetFlat[key] = text;
          continue;
        }

        try {
          const translated = await translateText(text, deeplLang);
          targetFlat[key] = translated;
          totalTranslated++;
          // Rate limiting
          await sleep(100);
        } catch (err) {
          console.error(`  ⚠️  Failed to translate "${key}": ${err.message}`);
          targetFlat[key] = text; // Fallback to English
        }
      }

      // Write back
      const merged = unflatten({ ...flatten(targetData), ...targetFlat });
      fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
      console.log(`  ✅ Wrote ${langCode}/${ns}.json`);
    }
  }

  console.log(`\n🎉 Done! Translated ${totalTranslated} strings.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
