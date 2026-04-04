variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "simplebaby"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ca-central-1"
}

variable "database_url" {
  description = "Supabase PostgreSQL connection URL"
  type        = string
  sensitive   = true
}

variable "supabase_jwt_secret" {
  description = "Supabase JWT Secret (from Supabase Dashboard > Settings > API)"
  type        = string
  sensitive   = true
}

variable "cors_origins" {
  description = "Comma-separated list of allowed CORS origins"
  type        = string
  default     = "http://localhost:5173"
}

variable "admin_api_key" {
  description = "API key for admin endpoints (migrations, etc.)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_secret_key" {
  description = "Stripe secret API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_price_monthly" {
  description = "Stripe price ID for monthly plan"
  type        = string
  default     = ""
}

variable "stripe_price_yearly" {
  description = "Stripe price ID for yearly plan"
  type        = string
  default     = ""
}

variable "custom_domain" {
  description = "Custom domain for CloudFront (e.g. app.heybub.app). Leave empty for no custom domain."
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN in us-east-1 for the custom domain"
  type        = string
  default     = ""
}

variable "sentry_dsn" {
  description = "Sentry DSN for backend error monitoring"
  type        = string
  sensitive   = true
  default     = ""
}

# BabyHub Integration
variable "babyhub_cloudfront_arn" {
  description = "ARN of BabyHub's CloudFront distribution (for unified routing)"
  type        = string
  default     = ""
}
