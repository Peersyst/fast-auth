output "lambda_arn" {
  description = "ARN of the custom-issuer-rotation Lambda function"
  value       = aws_lambda_function.this.arn
}

output "lambda_name" {
  description = "Name of the custom-issuer-rotation Lambda function"
  value       = aws_lambda_function.this.function_name
}

output "eventbridge_rule_arn" {
  description = "ARN of the rotation EventBridge schedule rule"
  value       = aws_cloudwatch_event_rule.schedule.arn
}
