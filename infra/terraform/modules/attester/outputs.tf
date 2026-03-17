output "lambda_arn" {
  description = "ARN of the attester Lambda function"
  value       = aws_lambda_function.this.arn
}

output "lambda_name" {
  description = "Name of the attester Lambda function"
  value       = aws_lambda_function.this.function_name
}

output "secret_arn" {
  description = "ARN of the attester Secrets Manager secret"
  value       = aws_secretsmanager_secret.config.arn
}

output "eventbridge_rule_arn" {
  description = "ARN of the attester EventBridge schedule rule"
  value       = aws_cloudwatch_event_rule.schedule.arn
}
