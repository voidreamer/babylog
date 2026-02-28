# ============================================================================
# URLs
# ============================================================================

output "frontend_url" {
  description = "CloudFront URL for the frontend"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

# ============================================================================
# Deploy Commands
# ============================================================================

output "deploy_frontend_command" {
  description = "Command to deploy frontend to S3"
  value       = <<-EOT
    # From the frontend directory:
    npm run build
    aws s3 sync dist/ s3://${aws_s3_bucket.frontend.id}/ --delete
    aws cloudfront create-invalidation \
      --distribution-id ${aws_cloudfront_distribution.frontend.id} \
      --paths "/*"
  EOT
}

# ============================================================================
# S3 Bucket Name (for scripts)
# ============================================================================

output "s3_bucket_name" {
  description = "S3 bucket name for frontend"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}
