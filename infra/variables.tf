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

# BabyHub Integration
variable "babyhub_cloudfront_arn" {
  description = "ARN of BabyHub's CloudFront distribution (for unified routing)"
  type        = string
  default     = ""
}
