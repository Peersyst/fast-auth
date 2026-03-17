# -------------------------------------------------------
# EventBridge — Attester schedule
# -------------------------------------------------------

resource "aws_cloudwatch_event_rule" "attester_schedule" {
  name                = "attester-schedule-${var.environment}"
  description         = "Triggers the attester Lambda on a recurring schedule"
  schedule_expression = var.attester_schedule

  tags = {
    Environment = var.environment
    Component   = "attester"
  }
}

resource "aws_cloudwatch_event_target" "attester" {
  rule = aws_cloudwatch_event_rule.attester_schedule.name
  arn  = aws_lambda_function.attester.arn
}

resource "aws_lambda_permission" "attester_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.attester.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.attester_schedule.arn
}

# -------------------------------------------------------
# EventBridge — Custom Issuer Rotation schedule
# -------------------------------------------------------

resource "aws_cloudwatch_event_rule" "rotation_schedule" {
  name                = "custom-issuer-rotation-schedule-${var.environment}"
  description         = "Triggers the custom-issuer-rotation Lambda on a recurring schedule"
  schedule_expression = var.rotation_schedule

  tags = {
    Environment = var.environment
    Component   = "custom-issuer-rotation"
  }
}

resource "aws_cloudwatch_event_target" "rotation" {
  rule = aws_cloudwatch_event_rule.rotation_schedule.name
  arn  = aws_lambda_function.rotation.arn
}

resource "aws_lambda_permission" "rotation_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rotation.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.rotation_schedule.arn
}
