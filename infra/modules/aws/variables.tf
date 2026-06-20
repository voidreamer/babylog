# Inputs for the (dormant) AWS module — all supplied by the root module.
variable "project_name" { type = string }
variable "environment" { type = string }
variable "database_url" {
  type      = string
  sensitive = true
}
variable "supabase_jwt_secret" {
  type      = string
  sensitive = true
}
variable "cors_origins" { type = string }
variable "admin_api_key" {
  type      = string
  sensitive = true
}
variable "stripe_secret_key" {
  type      = string
  sensitive = true
}
variable "stripe_webhook_secret" {
  type      = string
  sensitive = true
}
variable "stripe_price_monthly" { type = string }
variable "stripe_price_yearly" { type = string }
variable "custom_domain" { type = string }
variable "acm_certificate_arn" { type = string }
variable "sentry_dsn" {
  type      = string
  sensitive = true
}
variable "groq_api_key" {
  type      = string
  sensitive = true
}
variable "babyhub_cloudfront_arn" { type = string }

# NOTE: alert_email, budget_limit_usd and budget_alert_email are declared inline
# in monitoring.tf / budget.tf (kept there to stay next to their resources).
