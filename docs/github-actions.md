# GitHub Actions Setup

This document explains the CI/CD workflows and required secrets.

## Workflows

### 1. Deploy Backend (`deploy-backend.yml`)
**Triggers**: Push to `main` branch with changes in `backend/` or manual dispatch

**What it does**:
- Installs Python dependencies
- Creates Lambda deployment package
- Deploys to AWS Lambda
- Verifies deployment

### 2. Deploy Frontend (`deploy-frontend.yml`)
**Triggers**: Push to `main` branch with changes in `frontend/` or manual dispatch

**What it does**:
- Installs npm dependencies
- Builds React app with environment variables
- Deploys to S3
- Invalidates CloudFront cache

### 3. CI Backend (`ci-backend.yml`)
**Triggers**: Pull requests or push to `develop` with backend changes

**What it does**:
- Runs linter
- Validates imports and models

### 4. CI Frontend (`ci-frontend.yml`)
**Triggers**: Pull requests or push to `develop` with frontend changes

**What it does**:
- Builds frontend
- Validates build output

---

## Required GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions → New repository secret

### AWS Credentials
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

**How to create**:
1. Go to AWS IAM Console
2. Create a new user for GitHub Actions
3. Attach policies: `AWSLambdaFullAccess`, `AmazonS3FullAccess`, `CloudFrontFullAccess`
4. Create access key
5. Add to GitHub secrets

### Frontend Environment Variables
```
VITE_COGNITO_DOMAIN=https://huckle-nah7qom7.auth.ca-central-1.amazoncognito.com
VITE_COGNITO_CLIENT_ID=34up4ahjhh0umosq03grphmcur
VITE_REDIRECT_URI=https://d3nsr7lzhub0bz.cloudfront.net/callback
```

---

## Workflow Configuration

Update these values in the workflow files if your resources change:

### `deploy-backend.yml`
```yaml
env:
  AWS_REGION: ca-central-1
  LAMBDA_FUNCTION_NAME: huckle-api
```

### `deploy-frontend.yml`
```yaml
env:
  AWS_REGION: ca-central-1
  S3_BUCKET: huckle-frontend-96f8ln2e
  CLOUDFRONT_DISTRIBUTION_ID: E7IAO0DCKG6U7
```

---

## Manual Deployment

You can manually trigger deployments from GitHub:
1. Go to Actions tab
2. Select workflow (Deploy Backend or Deploy Frontend)
3. Click "Run workflow"
4. Select branch and run

---

## Branch Strategy

- `main` - Production deployments (auto-deploy on push)
- `develop` - Development/staging (runs CI only)
- Feature branches - Create PRs to `develop`

---

## First Time Setup

1. **Add secrets to GitHub**:
   ```bash
   # Go to: https://github.com/voidreamer/babylog/settings/secrets/actions
   ```

2. **Push code**:
   ```bash
   git add .
   git commit -m "Initial commit with CI/CD"
   git push origin main
   ```

3. **Watch deployment**:
   ```bash
   # Go to: https://github.com/voidreamer/babylog/actions
   ```

---

## Troubleshooting

### Deployment fails with "Access Denied"
- Check AWS credentials in GitHub secrets
- Verify IAM user has required permissions

### Frontend build fails
- Check that all `VITE_*` secrets are set
- Verify secret values are correct

### Lambda update fails
- Check function name matches in workflow
- Verify AWS region is correct

### CloudFront invalidation fails
- Check distribution ID matches
- Ensure AWS credentials have CloudFront permissions
