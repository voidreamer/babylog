#!/usr/bin/env python3
"""
Comprehensive i18n transformer for HeyBub Tracker.
Adds useTranslation hook and replaces hardcoded strings with t() calls.
Also updates locale JSON files with new keys.
"""
import os
import re
import json
from pathlib import Path

FRONTEND = Path(__file__).parent.parent / "frontend" / "src"
LOCALES = Path(__file__).parent.parent / "frontend" / "public" / "locales" / "en"

# Skip these files
SKIP_FILES = {
    "Icon.tsx", "ErrorBoundary.tsx", "LoadingSpinner.tsx", "TimePicker.tsx",
    "LanguageSwitcher.tsx", "GrowthChart.tsx"
}

# Namespace mapping based on component location/name
def get_namespace(filepath: str) -> str:
    if "/pages/Login" in filepath or "/pages/Callback" in filepath:
        return "auth"
    if "/health/" in filepath or "/pages/Health" in filepath:
        return "health"
    if "/pages/" in filepath:
        return "common"
    if any(x in filepath for x in ["Widget", "Modal", "Dashboard", "Timeline", "DailySummary", 
                                     "QuickActions", "BabyGreeting", "ComingUp", "BabyInsights",
                                     "InsightsSections", "TimelineCalendar"]):
        return "dashboard"
    if any(x in filepath for x in ["Setting", "WidgetSettings", "Premium", "Upgrade", "Share"]):
        return "settings"
    if any(x in filepath for x in ["Onboarding", "AddBaby", "BabySelector"]):
        return "common"
    if "Learn" in filepath:
        return "common"
    if "Offline" in filepath:
        return "common"
    return "common"

# Map of string -> translation key for each namespace
# We'll collect new keys as we go
new_keys = {
    "common": {},
    "dashboard": {},
    "health": {},
    "settings": {},
    "auth": {},
}

def load_existing_keys():
    """Load existing translation keys"""
    existing = {}
    for ns in new_keys:
        fpath = LOCALES / f"{ns}.json"
        if fpath.exists():
            with open(fpath) as f:
                existing[ns] = json.load(f)
        else:
            existing[ns] = {}
    return existing

def flatten_keys(d, prefix=""):
    """Flatten nested dict to dot-notation keys"""
    result = {}
    for k, v in d.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            result.update(flatten_keys(v, key))
        else:
            result[key] = v
    return result

def find_existing_key(text, existing_flat):
    """Find if a string already has a translation key"""
    for key, val in existing_flat.items():
        if val == text:
            return key
    return None

def string_to_key(s, prefix=""):
    """Convert a string to a camelCase key"""
    # Remove special chars, make camelCase
    s = re.sub(r'[^a-zA-Z0-9\s]', '', s)
    words = s.strip().split()
    if not words:
        return "unknown"
    key = words[0].lower() + ''.join(w.capitalize() for w in words[1:])
    if prefix:
        key = f"{prefix}.{key}"
    return key[:40]  # Limit length

def add_useTranslation_import(content):
    """Add useTranslation import if not present"""
    if "useTranslation" in content:
        return content
    
    # Add after the last import from 'react' or first import
    lines = content.split('\n')
    last_import_idx = 0
    for i, line in enumerate(lines):
        if line.strip().startswith('import '):
            last_import_idx = i
    
    lines.insert(last_import_idx + 1, "import { useTranslation } from 'react-i18next';")
    return '\n'.join(lines)

def add_useTranslation_hook(content, namespace):
    """Add const { t } = useTranslation('namespace') after component function declaration"""
    if "useTranslation" not in content:
        return content
    if "= useTranslation(" in content:
        return content
    
    # Find the component function body opening
    # Pattern: export default function X(...) { or function X(...) { or const X = (...) => {
    patterns = [
        r'(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)',
        r'(export\s+function\s+\w+\s*\([^)]*\)\s*\{)',
        r'(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*:\s*\w+[^{]*\{)',
        r'(function\s+\w+\s*\([^)]*\)\s*\{)',
        r'(=>\s*\{)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, content)
        if match:
            insert_pos = match.end()
            hook_line = f"\n    const {{ t }} = useTranslation('{namespace}');"
            content = content[:insert_pos] + hook_line + content[insert_pos:]
            return content
    
    return content

def process_file(filepath):
    """Process a single TSX file"""
    with open(filepath) as f:
        content = f.read()
    
    original = content
    ns = get_namespace(str(filepath))
    basename = os.path.basename(filepath)
    
    # Add import and hook
    content = add_useTranslation_import(content)
    content = add_useTranslation_hook(content, ns)
    
    # Common string replacements for JSX text content and attributes
    # We handle these patterns:
    # 1. >Text Content<  (JSX text)
    # 2. placeholder="text"
    # 3. title="text"
    # 4. aria-label="text"
    # 5. 'Text' in toast calls
    # 6. {saving ? 'Starting...' : 'Start Sleep'} ternaries
    
    existing = load_existing_keys()
    existing_flat = flatten_keys(existing.get(ns, {}))
    
    # Replace toast messages
    toast_pattern = r"toast\.(success|error|info)\('([^']+)'\)"
    for match in re.finditer(toast_pattern, content):
        text = match.group(2)
        key = find_existing_key(text, existing_flat)
        if not key:
            key = string_to_key(text, "toast")
            new_keys[ns][key.replace('.', '_')] = text
            key = key.replace('.', '_')
        content = content.replace(f"'{text}'", f"t('{key}')", 1)
    
    toast_pattern2 = r'toast\.(success|error|info)\("([^"]+)"\)'
    for match in re.finditer(toast_pattern2, content):
        text = match.group(2)
        key = find_existing_key(text, existing_flat)
        if not key:
            key = string_to_key(text, "toast")
            new_keys[ns][key.replace('.', '_')] = text
            key = key.replace('.', '_')
        content = content.replace(f'"{text}"', f"t('{key}')", 1)
    
    # Replace placeholder="text", title="text", aria-label="text", submitLabel="text"
    attr_pattern = r'(placeholder|title|aria-label|submitLabel)="([^"]+)"'
    for match in re.finditer(attr_pattern, content):
        attr = match.group(1)
        text = match.group(2)
        # Skip non-translatable
        if text.startswith('{') or text.startswith('http') or text == 'sleep' or len(text) <= 1:
            continue
        key = find_existing_key(text, existing_flat)
        if not key:
            key = string_to_key(text, attr.replace('-', ''))
            new_keys[ns][key.replace('.', '_')] = text
            key = key.replace('.', '_')
        old = f'{attr}="{text}"'
        new = f'{attr}={{t(\'{key}\')}}'
        content = content.replace(old, new, 1)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

def save_new_keys():
    """Merge new keys into locale files"""
    for ns, keys in new_keys.items():
        if not keys:
            continue
        fpath = LOCALES / f"{ns}.json"
        existing = {}
        if fpath.exists():
            with open(fpath) as f:
                existing = json.load(f)
        
        # Add new keys (use flat keys with underscores to avoid nesting conflicts)
        for key, value in keys.items():
            flat_key = key.replace('.', '_')
            existing[flat_key] = value
        
        with open(fpath, 'w') as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)
            f.write('\n')
        
        print(f"  📝 {ns}.json: +{len(keys)} keys")

def main():
    print("🔄 Processing component files...")
    
    processed = 0
    skipped = 0
    
    for root, dirs, files in os.walk(FRONTEND):
        for fname in sorted(files):
            if not fname.endswith('.tsx'):
                continue
            if fname in SKIP_FILES:
                skipped += 1
                continue
            
            filepath = os.path.join(root, fname)
            
            # Skip non-component files (hooks, utils, stores, api)
            rel = os.path.relpath(filepath, FRONTEND)
            if any(rel.startswith(d) for d in ['hooks/', 'utils/', 'stores/', 'api/', 'i18n/']):
                continue
            
            changed = process_file(filepath)
            if changed:
                print(f"  ✅ {fname}")
                processed += 1
            else:
                print(f"  ⏭️  {fname} (no changes needed)")
    
    print(f"\n📊 Processed {processed} files, skipped {skipped}")
    
    print("\n💾 Saving new translation keys...")
    save_new_keys()

if __name__ == "__main__":
    main()
