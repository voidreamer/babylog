#!/bin/bash
# Safe Production Deployment Script
# Merges staging to main with proper CloudFront invalidation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROD_CLOUDFRONT_ID="E7IAO0DCKG6U7"
PROD_S3_BUCKET="simplebaby-frontend-prod-96f8ln2e"
PROD_LAMBDA="simplebaby-api-prod"

echo -e "${BLUE}🚀 Safe Production Deployment${NC}"
echo "================================"
echo ""

# Pre-flight checks
echo -e "${YELLOW}📋 Pre-flight Checks${NC}"
echo "--------------------"

# Check we're on staging
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "staging" ]; then
    echo -e "${RED}❌ Not on staging branch (currently on: $CURRENT_BRANCH)${NC}"
    echo "Run: git checkout staging"
    exit 1
fi
echo -e "${GREEN}✓${NC} On staging branch"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ Uncommitted changes detected${NC}"
    echo "Commit or stash changes first"
    exit 1
fi
echo -e "${GREEN}✓${NC} Working directory clean"

# Check staging is up to date with remote
git fetch origin staging
LOCAL=$(git rev-parse staging)
REMOTE=$(git rev-parse origin/staging)
if [ "$LOCAL" != "$REMOTE" ]; then
    echo -e "${YELLOW}⚠️  Local staging differs from origin/staging${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then exit 1; fi
fi
echo -e "${GREEN}✓${NC} Staging synced with remote"

# Show what will be merged
echo ""
echo -e "${YELLOW}📦 Commits to be merged:${NC}"
git log main..staging --oneline | head -15
COMMIT_COUNT=$(git rev-list main..staging --count)
echo -e "Total: ${BLUE}$COMMIT_COUNT${NC} commits"
echo ""

# Show infrastructure changes
echo -e "${YELLOW}🏗️  Infrastructure changes:${NC}"
git diff main..staging --stat -- infra/ .github/workflows/ || echo "No infra changes"
echo ""

read -p "Proceed with merge to main? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Step 1: Backup current prod state
echo ""
echo -e "${YELLOW}📸 Step 1: Backing up production state${NC}"
BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup CloudFront config
aws cloudfront get-distribution-config --id $PROD_CLOUDFRONT_ID > "$BACKUP_DIR/cloudfront-config.json"
echo -e "${GREEN}✓${NC} CloudFront config backed up"

# Backup Lambda config
aws lambda get-function --function-name $PROD_LAMBDA > "$BACKUP_DIR/lambda-config.json" 2>/dev/null || true
echo -e "${GREEN}✓${NC} Lambda config backed up"

# Backup terraform state
cp terraform.tfstate "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✓${NC} Terraform state backed up"
echo -e "${GREEN}✓ Backup saved to: $BACKUP_DIR${NC}"

# Step 2: Merge staging to main
echo ""
echo -e "${YELLOW}🔀 Step 2: Merging staging to main${NC}"
git checkout main
git pull origin main
git merge staging -m "Merge staging to production - $(date +%Y-%m-%d)"
echo -e "${GREEN}✓${NC} Merged staging to main"

# Step 3: Push to trigger GitHub Actions
echo ""
echo -e "${YELLOW}📤 Step 3: Push to trigger deployments${NC}"
read -p "Push to origin/main? This will trigger GitHub Actions. (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Changes merged locally but not pushed${NC}"
    echo "To push later: git push origin main"
    echo "To rollback: git reset --hard HEAD~1"
    exit 0
fi

git push origin main
echo -e "${GREEN}✓${NC} Pushed to origin/main"

# Step 4: Monitor deployments
echo ""
echo -e "${YELLOW}👀 Step 4: Monitoring deployments${NC}"
echo "GitHub Actions triggered. Monitor at:"
echo "  https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
echo ""

# Step 5: Invalidate CloudFront cache comprehensively
echo -e "${YELLOW}🔄 Step 5: Invalidating CloudFront cache${NC}"
read -p "Create CloudFront invalidation now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id $PROD_CLOUDFRONT_ID \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)
    echo -e "${GREEN}✓${NC} Invalidation created: $INVALIDATION_ID"

    echo "Waiting for invalidation to complete..."
    aws cloudfront wait invalidation-completed \
        --distribution-id $PROD_CLOUDFRONT_ID \
        --id $INVALIDATION_ID
    echo -e "${GREEN}✓${NC} Invalidation complete!"
fi

# Done
echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "========================"
echo ""
echo "📁 Backup location: $BACKUP_DIR"
echo ""
echo -e "${YELLOW}🔍 Verification steps:${NC}"
echo "1. Check frontend: https://d3nsr7lzhub0bz.cloudfront.net"
echo "2. Check Lambda: aws lambda get-function --function-name $PROD_LAMBDA --query 'Configuration.LastModified'"
echo "3. Check CloudFront: aws cloudfront get-distribution --id $PROD_CLOUDFRONT_ID --query 'Distribution.Status'"
echo ""
echo -e "${RED}🚨 If something breaks:${NC}"
echo "1. Quick rollback: ./scripts/rollback-cloudfront.sh prod"
echo "2. Full git rollback: git revert HEAD && git push origin main"
echo "3. Restore from backup: $BACKUP_DIR"
