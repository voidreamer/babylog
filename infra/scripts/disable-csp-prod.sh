#!/bin/bash
# Quick CSP Disable for Production
# Use this if CSP breaks production

set -e

PROD_DISTRIBUTION_ID="E7IAO0DCKG6U7"
PROD_POLICY_ID="6bbf52e8-cd97-456d-857b-27e82d2693c9"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}🚨 EMERGENCY: Disable CSP on Production${NC}"
echo "========================================"
echo ""

# Get current policy
echo "📥 Fetching current policy..."
aws cloudfront get-response-headers-policy --id $PROD_POLICY_ID > /tmp/policy-current.json
ETAG=$(jq -r '.ETag' /tmp/policy-current.json)

# Remove CSP from config
echo "🔧 Removing CSP from policy..."
jq '.ResponseHeadersPolicy.ResponseHeadersPolicyConfig.SecurityHeadersConfig.ContentSecurityPolicy = {}' /tmp/policy-current.json | jq '.ResponseHeadersPolicy.ResponseHeadersPolicyConfig' > /tmp/no-csp-policy.json

# Update policy
echo "📤 Updating response headers policy..."
aws cloudfront update-response-headers-policy \
    --id $PROD_POLICY_ID \
    --response-headers-policy-config file:///tmp/no-csp-policy.json \
    --if-match $ETAG \
    --no-cli-pager

echo -e "${GREEN}✓${NC} CSP removed from policy!"

# Aggressive cache invalidation
echo "🔄 Creating aggressive cache invalidation..."
aws cloudfront create-invalidation \
    --distribution-id $PROD_DISTRIBUTION_ID \
    --paths "/*" \
    --no-cli-pager

echo ""
echo -e "${GREEN}✅ CSP disabled on production!${NC}"
echo ""
echo "⏳ Changes propagating... (usually 1-5 minutes)"
echo ""
echo "Monitor status:"
echo "  aws cloudfront get-distribution --id $PROD_DISTRIBUTION_ID --query 'Distribution.Status'"
