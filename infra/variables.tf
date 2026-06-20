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
  default     = "https://app.heybub.app,https://heybub.app,https://previews.heybub.app,http://localhost:5173,capacitor://localhost"
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

variable "groq_api_key" {
  description = "Groq API key for voice command parsing"
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

# ============================================================================
# Toggle: AWS infra is dormant by default (production moved to Oracle Cloud)
# ============================================================================
variable "enable_aws" {
  description = "Provision the AWS module (Lambda/S3/CloudFront/IAM/budgets). Off by default; the app runs on Oracle Cloud. Set true to rebuild on a fresh AWS account."
  type        = bool
  default     = false
}

# ============================================================================
# Oracle Cloud (primary API host)
# ============================================================================
variable "oci_config_profile" {
  description = "Profile in ~/.oci/config used to authenticate (API key)."
  type        = string
  default     = "HEYBUB"
}
variable "oci_region" {
  type    = string
  default = "ca-toronto-1"
}
variable "oci_tenancy_ocid" {
  type    = string
  default = "ocid1.tenancy.oc1..aaaaaaaaoidpevgnu74on5qx2i7kex4ea52262q42eqywrkqdbljogasquvq"
}
variable "oci_compartment_ocid" {
  description = "Compartment for the VM + network (defaults to the root tenancy)."
  type        = string
  default     = "ocid1.tenancy.oc1..aaaaaaaaoidpevgnu74on5qx2i7kex4ea52262q42eqywrkqdbljogasquvq"
}
variable "oci_availability_domain" {
  description = "AD for the instance; empty = first AD in the region."
  type        = string
  default     = ""
}
variable "oci_instance_shape" {
  type    = string
  default = "VM.Standard.A1.Flex"
}
variable "oci_ocpus" {
  description = "OCPUs (Always Free Ampere pool: up to 4)."
  type        = number
  default     = 2
}
variable "oci_memory_gb" {
  description = "Memory in GB (Always Free Ampere pool: up to 24)."
  type        = number
  default     = 16
}
variable "ssh_public_key" {
  description = "SSH public key injected into the instance (opc user)."
  type        = string
  default     = ""
}

# AWS pass-through vars (declared here at root because main.tf forwards them to
# the aws module; their in-module twins live in monitoring.tf / budget.tf).
variable "alert_email" {
  description = "Email for CloudWatch alarm notifications"
  type        = string
  default     = ""
}
variable "budget_limit_usd" {
  description = "Monthly AWS budget limit in USD"
  type        = string
  default     = "10"
}
variable "budget_alert_email" {
  description = "Email to notify when AWS budget thresholds are hit"
  type        = string
  default     = ""
}
