#!/bin/bash
# Comprehensive i18n wrapping script
# Adds useTranslation to all components and replaces hardcoded strings

cd "$(dirname "$0")/.." || exit 1
FRONTEND="frontend/src"

echo "🌍 Starting comprehensive i18n wrapping..."

# List of files that already have useTranslation
already_done=("LanguageSwitcher.tsx" "Login.tsx")

# Function to add useTranslation import + hook to a file
add_i18n_to_file() {
    local file="$1"
    local namespace="$2"
    
    # Skip if already has useTranslation
    if grep -q "useTranslation" "$file"; then
        return
    fi
    
    # Add import
    if grep -q "from 'react'" "$file"; then
        sed -i '' "s/from 'react';/from 'react';\nimport { useTranslation } from 'react-i18next';/" "$file"
    elif grep -q 'from "react"' "$file"; then
        sed -i '' 's/from "react";/from "react";\nimport { useTranslation } from "react-i18next";/' "$file"
    else
        # Add at top after first import
        sed -i '' "1s/^/import { useTranslation } from 'react-i18next';\n/" "$file"
    fi
    
    # Add hook after first useState or at start of function body
    # Look for "export default function" or "export function" or "function Component"
    # This is tricky in sed, so we'll use a python helper
}

echo "Step 1: Adding useTranslation imports..."

# Process all tsx files
find "$FRONTEND/components" "$FRONTEND/pages" -name "*.tsx" | while read -r file; do
    basename=$(basename "$file")
    
    # Skip utility/non-UI components
    case "$basename" in
        Icon.tsx|ErrorBoundary.tsx|LoadingSpinner.tsx|TimePicker.tsx|LanguageSwitcher.tsx)
            continue
            ;;
    esac
    
    # Skip if already done
    if grep -q "useTranslation" "$file"; then
        echo "  ✓ $basename (already has i18n)"
        continue
    fi
    
    echo "  + $basename"
    add_i18n_to_file "$file"
done

echo ""
echo "Step 2: Running Python transformer for string replacement..."

python3 scripts/i18n-transform.py

echo ""
echo "Step 3: Running DeepL translation..."
if [ -n "$DEEPL_API_KEY" ]; then
    node scripts/translate.js
fi

echo ""
echo "Step 4: Building..."
cd frontend && npm run build

echo ""
echo "✅ Done!"
