# Staging Environment Setup

## Workflow Created ✅

Two new workflow files have been created (production workflows unchanged):
- `deploy-frontend-staging.yml` - deploys frontend to staging S3/CloudFront
- `deploy-backend-staging.yml` - deploys backend to staging Lambda

## AWS Resources Needed

You need to create these resources in AWS Console (one-time setup):

### 1. S3 Bucket for Frontend Staging
```
Bucket name: huckle-frontend-staging
Region: ca-central-1
Block public access: OFF (for static website)
Enable static website hosting: Yes
```

### 2. CloudFront Distribution for Staging
```
Origin: S3 bucket (huckle-frontend-staging)
Default root object: index.html
Error pages: 403/404 → /index.html (for SPA routing)
```

### 3. Lambda Function for Backend Staging
```
Function name: huckle-api-staging
Runtime: Python 3.11
Handler: app.main.handler
Copy environment variables from huckle-api
```

### 4. API Gateway for Staging
```
Create new HTTP API for huckle-api-staging Lambda
Note the URL for VITE_API_URL_STAGING
```

## GitHub Setup

### Repository Variables (Settings → Secrets → Variables)
| Variable | Value |
|----------|-------|
| `S3_BUCKET_STAGING` | huckle-frontend-staging |
| `CLOUDFRONT_ID_STAGING` | (your staging distribution ID) |
| `LAMBDA_NAME_STAGING` | huckle-api-staging |

### Repository Secrets (for staging-specific values)
| Secret | Value |
|--------|-------|
| `VITE_API_URL_STAGING` | https://your-staging-api.execute-api.ca-central-1.amazonaws.com |
| `VITE_REDIRECT_URI_STAGING` | https://your-staging-cloudfront-url.cloudfront.net |

## Workflow

```
feature/xyz → staging → main
     ↓            ↓
   (test)    (staging deploy)   (production deploy)
```

1. **Develop**: Work on `main` or feature branches locally
2. **Push to staging**: `git push origin staging` → auto-deploys to staging
3. **Test**: Verify on staging URL
4. **Merge to main**: `git checkout main && git merge staging && git push` → auto-deploys to production
