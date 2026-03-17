# -------------------------------------------------------
# EventBridge — Attester schedule
# -------------------------------------------------------

resource "aws_cloudwatch_event_rule" "schedule" {
  name                = "attester-schedule-${var.environment}"
  description         = "Triggers the attester Lambda on a recurring schedule"
  schedule_expression = var.schedule

  tags = {
    Environment = var.environment
    Component   = "attester"
  }
}

resource "aws_cloudwatch_event_target" "this" {
  rule = aws_cloudwatch_event_rule.schedule.name
  arn  = aws_lambda_function.this.arn
}

resource "aws_lambda_permission" "eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.schedule.arn
}
