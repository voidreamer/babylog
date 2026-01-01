# Terraform Region Migration Troubleshooting

This document describes the issues encountered when changing AWS regions from `us-east-1` to `ca-central-1` and how they were resolved.

---

## Problem

After changing the `aws_region` variable in `variables.tf` from `us-east-1` to `ca-central-1`, running `terraform apply` or `terraform destroy` failed with S3-related errors.

### Error Messages

```
Error: reading S3 Bucket Public Access Block (huckle-frontend-ukqytkz2): 
operation error S3: GetPublicAccessBlock, https response error StatusCode: 301, 
RequestID: TNY3QYPQHF3YTSJV, api error PermanentRedirect: 
The bucket you are attempting to access must be addressed using the specified endpoint.
```

---

## Root Cause

1. **S3 buckets are region-specific** - When you create an S3 bucket in one region, it exists only in that region
2. **Terraform state mismatch** - Terraform state still referenced resources in `us-east-1`, but the provider was now configured for `ca-central-1`
3. **CloudFront OAC is global** - CloudFront Origin Access Controls are global resources and can't be recreated with the same name

---

## Solution Steps

### 1. Identify Existing Resources

Check what's in the Terraform state:
```bash
cd infra
terraform state list | grep -i s3
```

Output:
```
aws_s3_bucket.frontend
aws_s3_bucket_policy.frontend
aws_s3_bucket_public_access_block.frontend
```

Get bucket details:
```bash
terraform state show aws_s3_bucket.frontend | grep -E "(bucket\s*=|region\s*=)"
```

Output:
```
bucket = "huckle-frontend-ukqytkz2"
region = "us-east-1"
```

### 2. Empty the S3 Bucket

S3 buckets must be empty before they can be deleted:
```bash
aws s3 rm s3://huckle-frontend-ukqytkz2 --recursive --region us-east-1
```

### 3. Remove S3 Resources from State

Since Terraform can't access the bucket from the wrong region, remove it from state:
```bash
terraform state rm aws_s3_bucket_public_access_block.frontend
terraform state rm aws_s3_bucket_policy.frontend
```

### 4. Delete the S3 Bucket

```bash
aws s3 rb s3://huckle-frontend-ukqytkz2 --region us-east-1 --force
```

### 5. Remove CloudFront Resources from State

CloudFront distributions take time to delete, so remove them from state:
```bash
terraform state rm aws_s3_bucket.frontend
terraform state rm aws_cloudfront_distribution.frontend
terraform state rm aws_cloudfront_origin_access_control.frontend
```

### 6. Destroy Remaining Resources

```bash
terraform destroy -auto-approve
```

This successfully removed:
- IAM roles
- Random strings (for naming)
- Other region-agnostic resources

### 7. Handle CloudFront OAC Conflict

When applying the new infrastructure, CloudFront OAC failed because it already existed globally:

```
Error: creating CloudFront Origin Access Control (huckle-frontend-oac): 
OriginAccessControlAlreadyExists: An origin access control with the same name already exists.
```

**Solution:** Import the existing OAC instead of creating a new one:

```bash
# Find the OAC ID
aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='huckle-frontend-oac'].Id" \
  --output text

# Import it into Terraform
terraform import aws_cloudfront_origin_access_control.frontend ELYKM7J3IQ82H
```

### 8. Apply New Infrastructure

```bash
terraform apply -auto-approve
```

This successfully created all resources in `ca-central-1`:
- ✅ S3 bucket (new name with random suffix)
- ✅ CloudFront distribution
- ✅ Lambda function
- ✅ API Gateway
- ✅ Cognito User Pool
- ✅ All supporting resources

---

## Key Learnings

### S3 Buckets
- **Region-specific**: Can't be moved between regions, must be recreated
- **Must be empty**: Delete all objects before deleting the bucket
- **Use correct region flag**: Always specify `--region` when using AWS CLI

### CloudFront
- **Global resources**: Origin Access Controls are global, not regional
- **Import existing**: Use `terraform import` instead of recreating
- **Takes time**: CloudFront distributions take 3-5 minutes to create

### Terraform State
- **Manual cleanup**: Sometimes you need to manually remove resources from state
- **Region changes**: Changing provider region doesn't automatically migrate resources
- **State list**: Use `terraform state list` to see what's tracked

---

## Prevention

To avoid this issue in the future:

1. **Plan region before deployment**: Choose your AWS region before creating resources
2. **Use separate workspaces**: Consider using Terraform workspaces for different regions
3. **Destroy before changing**: If you must change regions, destroy all resources first:
   ```bash
   terraform destroy
   # Then change region in variables.tf
   terraform apply
   ```

---

## Quick Reference Commands

```bash
# List Terraform state
terraform state list

# Show specific resource
terraform state show <resource_name>

# Remove from state
terraform state rm <resource_name>

# Empty S3 bucket
aws s3 rm s3://<bucket-name> --recursive --region <region>

# Delete S3 bucket
aws s3 rb s3://<bucket-name> --region <region> --force

# List CloudFront OACs
aws cloudfront list-origin-access-controls

# Import resource
terraform import <resource_type>.<resource_name> <resource_id>
```

---

## Final Result

Infrastructure successfully migrated from `us-east-1` to `ca-central-1`:
- API: `https://a4h1jfeguj.execute-api.ca-central-1.amazonaws.com`
- Frontend: `https://d3nsr7lzhub0bz.cloudfront.net`
- Cognito: `https://huckle-nah7qom7.auth.ca-central-1.amazoncognito.com`
