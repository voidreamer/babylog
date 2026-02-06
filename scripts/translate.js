#!/usr/bin/env node

/**
 * DeepL Auto-Translation Script
 *
 * Reads EN source files from frontend/public/locales/en/
 * Translates to all supported languages using DeepL API
 *
 * Note: Hindi (hi) is not supported by DeepL and is skipped.
 *
 * Usage: DEEPL_API_KEY=... node scripts/translate.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.DEEPL_API_KEY;
if (!API_KEY) {
  console.error('Error: DEEPL_API_KEY environment variable is required');
  process.exit(1);
}

// DeepL free tier uses api-free.deepl.com
const API_HOST = API_KEY.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';

const LOCALES_DIR = path.join(__dirname, '..', 'frontend', 'public', 'locales');
const SOURCE_LANG = 'EN';
const TARGET_LANGS = [
  { code: 'ES', folder: 'es-CO' },
  { code: 'FR', folder: 'fr-CA' },
  { code: 'JA', folder: 'ja' },
  { code: 'ZH-HANS', folder: 'zh-CN' },
  { code: 'RU', folder: 'ru' },
  // Hindi (hi) is NOT supported by DeepL — skip
];
const NAMESPACES = ['common', 'dashboard', 'health', 'settings', 'auth'];

function deepLTranslate(texts, targetLang) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams();
    params.append('source_lang', SOURCE_LANG);
    params.append('target_lang', targetLang);
    texts.forEach(t => params.append('text', t));

    const body = params.toString();
    const options = {
      hostname: API_HOST,
      path: '/v2/translate',
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`DeepL API error ${res.statusCode}: ${data}`));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.translations.map(t => t.text));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Flatten nested JSON to array of {path, value} for translation
function flattenObject(obj, prefix = '') {
  const entries = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      entries.push(...flattenObject(value, fullKey));
    } else {
      entries.push({ path: fullKey, value: String(value) });
    }
  }
  return entries;
}

// Set nested value by dot-path
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

// Batch translate in chunks (DeepL has limits)
async function translateBatch(texts, targetLang, batchSize = 50) {
  const results = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const translated = await deepLTranslate(batch, targetLang);
    results.push(...translated);
    // Small delay to respect rate limits
    if (i + batchSize < texts.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  return results;
}

// Preserve interpolation tokens like {{name}}, {{count}}
function preserveTokens(text) {
  const tokens = [];
  const preserved = text.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    const placeholder = `__TOKEN_${tokens.length}__`;
    tokens.push(match);
    return placeholder;
  });
  return { preserved, tokens };
}

function restoreTokens(text, tokens) {
  let result = text;
  tokens.forEach((token, i) => {
    result = result.replace(`__TOKEN_${i}__`, token);
  });
  return result;
}

async function main() {
  console.log('Starting DeepL translation...\n');

  for (const target of TARGET_LANGS) {
    console.log(`\nTranslating to ${target.folder} (${target.code})...`);
    const targetDir = path.join(LOCALES_DIR, target.folder);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    for (const ns of NAMESPACES) {
      const sourceFile = path.join(LOCALES_DIR, 'en', `${ns}.json`);
      if (!fs.existsSync(sourceFile)) {
        console.log(`  Skipping ${ns}.json (not found)`);
        continue;
      }

      const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
      const entries = flattenObject(sourceData);

      // Preserve interpolation tokens before sending to DeepL
      const tokenData = entries.map(e => preserveTokens(e.value));
      const textsToTranslate = tokenData.map(t => t.preserved);

      try {
        const translated = await translateBatch(textsToTranslate, target.code);

        const result = {};
        entries.forEach((entry, i) => {
          const restoredText = restoreTokens(translated[i], tokenData[i].tokens);
          setNestedValue(result, entry.path, restoredText);
        });

        const targetFile = path.join(targetDir, `${ns}.json`);
        fs.writeFileSync(targetFile, JSON.stringify(result, null, 2) + '\n', 'utf-8');
        console.log(`  ${ns}.json (${entries.length} strings)`);
      } catch (err) {
        console.error(`  ${ns}.json failed: ${err.message}`);
      }
    }
  }

  console.log('\nTranslation complete!');
  console.log('Note: Hindi (hi) is not supported by DeepL and must be translated separately.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
