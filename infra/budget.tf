# ============================================================================
# AWS Budget Alert
# ============================================================================
# Sends an email when monthly spend exceeds thresholds.
# Free to create — no cost for the budget itself.
# ============================================================================

variable "budget_limit_usd" {
  description = "Monthly budget limit in USD"
  type        = string
  default     = "10"
}

variable "budget_alert_email" {
  description = "Email to notify when budget thresholds are hit"
  type        = string
  default     = ""
}

resource "aws_budgets_budget" "monthly" {
  name         = "${var.project_name}-monthly-${var.environment}"
  budget_type  = "COST"
  limit_amount = var.budget_limit_usd
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # Alert at 50% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_email != "" ? [var.budget_alert_email] : []
  }

  # Alert at 80% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_email != "" ? [var.budget_alert_email] : []
  }

  # Alert at 100% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_email != "" ? [var.budget_alert_email] : []
  }

  # Forecasted to exceed budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.budget_alert_email != "" ? [var.budget_alert_email] : []
  }
}
