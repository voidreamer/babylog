# Enabling Content Security Policy (CSP) for Production

This guide explains how to enable CSP on production after testing on staging.

---

## Current State

| Environment | CSP Status | URL |
|-------------|------------|-----|
| Staging | ✅ Enabled | https://d3u5to5olnajgv.cloudfront.net |
| Production | ❌ Disabled | https://d3nsr7lzhub0bz.cloudfront.net |

---

## How It Works

The CSP is controlled by a **dynamic block** in `infra/frontend.tf` (around line 91):

```hcl
dynamic "content_security_policy" {
  for_each = var.environment == "staging" ? [1] : []
  content {
    content_security_policy = "default-src 'self'; ..."
    override = true
  }
}
```

- When `environment == "staging"` → CSP is enabled
- When `environment == "prod"` → CSP is skipped

---

## Step 1: Update Terraform

Edit `infra/frontend.tf` and change the condition from `"staging"` to include production:

### Option A: Enable for ALL environments
```hcl
dynamic "content_security_policy" {
  for_each = [1]  # Always enabled
  content {
    content_security_policy = "..."
    override = true
  }
}
```

### Option B: Enable for specific environments
```hcl
dynamic "content_security_policy" {
  for_each = contains(["staging", "prod"], var.environment) ? [1] : []
  content {
    content_security_policy = "..."
    override = true
  }
}
```

### Option C: Just change "staging" to "prod" (swap which env has CSP)
```hcl
for_each = var.environment == "prod" ? [1] : []
```

---

## Step 2: Validate Terraform

```bash
cd infra
terraform validate
```

---

## Step 3: Plan Changes (Preview)

### For Staging:
```bash
terraform plan -var-file=staging.tfvars -state=terraform-staging.tfstate
```

### For Production:
```bash
terraform plan
```

Look for changes to `aws_cloudfront_response_headers_policy.security_headers`

---

## Step 4: Apply Changes

### Apply to Production:
```bash
terraform apply -auto-approve
```

### Apply to Staging (if needed):
```bash
terraform apply -var-file=staging.tfvars -state=terraform-staging.tfstate -auto-approve
```

**Note:** CloudFront updates take 1-2 minutes to propagate.

---

## Step 5: Verify Headers

### Check Production:
```bash
curl -sI https://d3nsr7lzhub0bz.cloudfront.net | grep -i content-security-policy
```

### Check Staging:
```bash
curl -sI https://d3u5to5olnajgv.cloudfront.net | grep -i content-security-policy
```

---

## Rollback (If Something Breaks)

### Quick Rollback: Comment out CSP in Terraform

Edit `infra/frontend.tf` and comment out the CSP block:

```hcl
# dynamic "content_security_policy" {
#   for_each = ...
#   content {
#     content_security_policy = "..."
#     override = true
#   }
# }
```

Then apply:
```bash
terraform apply -auto-approve
```

### Invalidate CloudFront Cache (force new headers):
```bash
# Production
aws cloudfront create-invalidation --distribution-id E7IAO0DCKG6U7 --paths "/*"

# Staging
aws cloudfront create-invalidation --distribution-id E1HLRYY8WTQ6VX --paths "/*"
```

---

## Current CSP Policy

The CSP allows:

| Directive | Allowed Sources |
|-----------|-----------------|
| `default-src` | 'self' |
| `script-src` | 'self', 'unsafe-inline', 'unsafe-eval', Google accounts/APIs |
| `style-src` | 'self', 'unsafe-inline', Google Fonts |
| `font-src` | 'self', fonts.gstatic.com |
| `img-src` | 'self', data:, https:, blob: |
| `connect-src` | 'self', *.amazonaws.com, *.amazoncognito.com, *.cloudfront.net, Google OAuth, Supabase, Google Fonts |
| `frame-src` | accounts.google.com |
| `object-src` | 'none' |

---

## Troubleshooting

### Error: "violates Content Security Policy directive"

1. Check which domain is being blocked in the error message
2. Add it to the appropriate directive in `frontend.tf`
3. Apply terraform and test again

### Common domains to add:
- `*.amazoncognito.com` - Cognito OAuth
- `fonts.googleapis.com` / `fonts.gstatic.com` - Google Fonts
- New API endpoints

### Users seeing old CSP after update:
1. Invalidate CloudFront cache (see above)
2. Users may need to clear browser cache or service worker
3. For PWA users: may need to remove and re-add the app

---

## File Locations

| File | Purpose |
|------|---------|
| `infra/frontend.tf` | CloudFront + CSP configuration |
| `infra/terraform.tfvars` | Production variables |
| `infra/staging.tfvars` | Staging variables |
| `infra/terraform.tfstate` | Production state |
| `infra/terraform-staging.tfstate` | Staging state |
