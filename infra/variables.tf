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

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  default     = ""
}

variable "supabase_jwt_secret" {
  description = "Supabase JWT secret for token verification"
  type        = string
  sensitive   = true
  default     = ""
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
