#!/bin/bash
# Enable CSP on Production (after testing without it)
# This script applies the CSP policy that's been tested on staging

set -e

PROD_DISTRIBUTION_ID="E7IAO0DCKG6U7"
PROD_POLICY_ID="6bbf52e8-cd97-456d-857b-27e82d2693c9"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔒 Enable CSP on Production${NC}"
echo "============================="
echo ""

# The CSP that works on staging
CSP="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.amazonaws.com https://*.cloudfront.net https://accounts.google.com https://oauth2.googleapis.com https://*.supabase.com https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"

echo "This will add Content-Security-Policy to production:"
echo ""
echo -e "${BLUE}$CSP${NC}"
echo ""

read -p "⚠️  Are you sure you want to enable CSP on production? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Get current policy
echo "📥 Fetching current response headers policy..."
aws cloudfront get-response-headers-policy --id $PROD_POLICY_ID > /tmp/policy-backup.json
ETAG=$(jq -r '.ETag' /tmp/policy-backup.json)

# Backup
BACKUP_FILE="policy-backup-prod-$(date +%Y%m%d-%H%M%S).json"
cp /tmp/policy-backup.json "$BACKUP_FILE"
echo -e "${GREEN}✓${NC} Backed up to: $BACKUP_FILE"

# Create new policy config with CSP
echo "🔧 Creating new policy with CSP..."
jq --arg csp "$CSP" '.ResponseHeadersPolicy.ResponseHeadersPolicyConfig.SecurityHeadersConfig.ContentSecurityPolicy = {"Override": true, "ContentSecurityPolicy": $csp}' /tmp/policy-backup.json | jq '.ResponseHeadersPolicy.ResponseHeadersPolicyConfig' > /tmp/new-policy.json

# Update policy
echo "📤 Updating response headers policy..."
aws cloudfront update-response-headers-policy \
    --id $PROD_POLICY_ID \
    --response-headers-policy-config file:///tmp/new-policy.json \
    --if-match $ETAG \
    --no-cli-pager

echo -e "${GREEN}✓${NC} Policy updated!"

# Invalidate cache
echo "🔄 Creating cache invalidation..."
aws cloudfront create-invalidation \
    --distribution-id $PROD_DISTRIBUTION_ID \
    --paths "/*" \
    --no-cli-pager

echo ""
echo -e "${GREEN}✅ CSP enabled on production!${NC}"
echo ""
echo "🔍 Test the site immediately: https://d3nsr7lzhub0bz.cloudfront.net"
echo ""
echo -e "${RED}🚨 If something breaks:${NC}"
echo "Run: ./scripts/disable-csp-prod.sh"
