# -------------------------------------------------------
# EventBridge — Custom Issuer Rotation schedule
# -------------------------------------------------------

resource "aws_cloudwatch_event_rule" "schedule" {
  name                = "custom-issuer-rotation-schedule-${var.environment}"
  description         = "Triggers the custom-issuer-rotation Lambda on a recurring schedule"
  schedule_expression = var.schedule

  tags = {
    Environment = var.environment
    Component   = "custom-issuer-rotation"
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
