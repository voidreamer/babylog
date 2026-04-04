# ============================================================================
# Notification scheduler Lambda + EventBridge rule
# ============================================================================

resource "aws_lambda_function" "notification_scheduler" {
  function_name = "${var.project_name}-scheduler-${var.environment}"
  runtime       = "python3.11"
  handler       = "app.scheduler.handler"
  timeout       = 60
  memory_size   = 256

  role = aws_iam_role.lambda.arn # Reuse existing Lambda role

  # Placeholder - actual code deployed via CI/CD
  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  environment {
    variables = {
      DATABASE_URL        = var.database_url
      ENVIRONMENT         = var.environment
      VAPID_PRIVATE_KEY   = var.vapid_private_key
      VAPID_PUBLIC_KEY    = var.vapid_public_key
      VAPID_CONTACT_EMAIL = "support@heybub.app"
    }
  }

  tags = {
    Name = "${var.project_name}-scheduler-${var.environment}"
  }
}

# EventBridge rule - every 15 minutes
resource "aws_cloudwatch_event_rule" "scheduler_rule" {
  name                = "${var.project_name}-scheduler-${var.environment}"
  description         = "Triggers notification scheduler every 15 minutes"
  schedule_expression = "rate(15 minutes)"

  tags = {
    Name = "${var.project_name}-scheduler-${var.environment}"
  }
}

resource "aws_cloudwatch_event_target" "scheduler_target" {
  rule      = aws_cloudwatch_event_rule.scheduler_rule.name
  target_id = "notification-scheduler"
  arn       = aws_lambda_function.notification_scheduler.arn
}

resource "aws_lambda_permission" "scheduler_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.notification_scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scheduler_rule.arn
}

# CloudWatch log group for scheduler
resource "aws_cloudwatch_log_group" "scheduler_logs" {
  name              = "/aws/lambda/${aws_lambda_function.notification_scheduler.function_name}"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-scheduler-logs-${var.environment}"
  }
}
