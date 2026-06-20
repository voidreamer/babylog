terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }

  # The previous backend was s3://simplebaby-terraform-state, which lives in the
  # now-suspended AWS account and is abandoned. Using local state.
  # NOTE: terraform.tfstate can contain secrets and is gitignored. For shared/CI
  # use, switch to OCI Object Storage (S3-compatible) or Terraform Cloud.
  backend "local" {}
}

# AWS provider — only exercised when enable_aws = true (account dormant by default).
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Oracle Cloud provider — authenticates via the API-key profile in ~/.oci/config.
provider "oci" {
  config_file_profile = var.oci_config_profile
  region              = var.oci_region
}

# ============================================================================
# AWS infrastructure — DORMANT by default.
# Lambda + API Gateway + S3 + CloudFront + IAM + budgets/alarms, preserved for
# disaster recovery or moving back to AWS on a fresh account. Enable with:
#   terraform apply -var enable_aws=true
# ============================================================================
module "aws" {
  count  = var.enable_aws ? 1 : 0
  source = "./modules/aws"

  project_name           = var.project_name
  environment            = var.environment
  database_url           = var.database_url
  supabase_jwt_secret    = var.supabase_jwt_secret
  cors_origins           = var.cors_origins
  admin_api_key          = var.admin_api_key
  stripe_secret_key      = var.stripe_secret_key
  stripe_webhook_secret  = var.stripe_webhook_secret
  stripe_price_monthly   = var.stripe_price_monthly
  stripe_price_yearly    = var.stripe_price_yearly
  custom_domain          = var.custom_domain
  acm_certificate_arn    = var.acm_certificate_arn
  sentry_dsn             = var.sentry_dsn
  groq_api_key           = var.groq_api_key
  alert_email            = var.alert_email
  budget_limit_usd       = var.budget_limit_usd
  budget_alert_email     = var.budget_alert_email
  babyhub_cloudfront_arn = var.babyhub_cloudfront_arn
}
