terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.30"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  # Backend configured via -backend-config in CI/CD
  # Each environment uses a different state key
  backend "s3" {
    bucket = "simplebaby-terraform-state"
    region = "ca-central-1"
    # key is set dynamically: staging/terraform.tfstate or prod/terraform.tfstate
  }
}

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
