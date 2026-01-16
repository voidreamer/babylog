#!/bin/bash
# CloudFront Rollback Script
# Quickly removes security headers policy to restore CloudFront to safe state

set -e

PROD_DISTRIBUTION_ID="E7IAO0DCKG6U7"
STAGING_DISTRIBUTION_ID="E1HLRYY8WTQ6VX"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 CloudFront Rollback Script${NC}"
echo "=============================="

# Check which environment
if [ "$1" = "prod" ] || [ "$1" = "production" ]; then
    DISTRIBUTION_ID=$PROD_DISTRIBUTION_ID
    ENV="production"
elif [ "$1" = "staging" ]; then
    DISTRIBUTION_ID=$STAGING_DISTRIBUTION_ID
    ENV="staging"
else
    echo -e "${RED}Usage: $0 <prod|staging>${NC}"
    echo "Example: $0 prod"
    exit 1
fi

echo -e "Target: ${YELLOW}$ENV${NC} (Distribution: $DISTRIBUTION_ID)"
echo ""

# Get current config
echo "📥 Fetching current distribution config..."
aws cloudfront get-distribution-config --id $DISTRIBUTION_ID > /tmp/cf-config-backup.json

# Extract ETag for update
ETAG=$(jq -r '.ETag' /tmp/cf-config-backup.json)
echo "Current ETag: $ETAG"

# Backup current config
BACKUP_FILE="cf-backup-$ENV-$(date +%Y%m%d-%H%M%S).json"
cp /tmp/cf-config-backup.json "$BACKUP_FILE"
echo -e "${GREEN}✅ Backed up current config to: $BACKUP_FILE${NC}"

# Extract distribution config (remove ETag wrapper)
jq '.DistributionConfig' /tmp/cf-config-backup.json > /tmp/cf-distribution-config.json

# Check if ResponseHeadersPolicyId exists
CURRENT_POLICY=$(jq -r '.DefaultCacheBehavior.ResponseHeadersPolicyId // empty' /tmp/cf-distribution-config.json)

if [ -z "$CURRENT_POLICY" ]; then
    echo -e "${YELLOW}⚠️  No response headers policy currently attached${NC}"
    echo "Nothing to rollback."
    exit 0
fi

echo "Current Response Headers Policy: $CURRENT_POLICY"
echo ""

read -p "⚠️  This will REMOVE the security headers policy. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Remove the ResponseHeadersPolicyId
echo "🔧 Removing ResponseHeadersPolicyId from config..."
jq 'del(.DefaultCacheBehavior.ResponseHeadersPolicyId)' /tmp/cf-distribution-config.json > /tmp/cf-new-config.json

# Update distribution
echo "📤 Updating CloudFront distribution..."
aws cloudfront update-distribution \
    --id $DISTRIBUTION_ID \
    --distribution-config file:///tmp/cf-new-config.json \
    --if-match $ETAG \
    --no-cli-pager

echo ""
echo -e "${GREEN}✅ Distribution update initiated!${NC}"
echo ""
echo "🔄 Creating cache invalidation..."
aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*" \
    --no-cli-pager

echo ""
echo -e "${GREEN}✅ Cache invalidation created!${NC}"
echo ""
echo "⏳ Distribution is now deploying. Check status with:"
echo "   aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.Status'"
echo ""
echo "📁 To restore, use the backup file: $BACKUP_FILE"
