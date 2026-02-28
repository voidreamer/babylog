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

# BabyHub Integration
variable "babyhub_cloudfront_arn" {
  description = "ARN of BabyHub's CloudFront distribution (for unified routing)"
  type        = string
  default     = ""
}
