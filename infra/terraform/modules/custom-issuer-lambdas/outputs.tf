output "kms_signing_previous_key_id" {
  description = "KMS key ID for signing-previous"
  value       = aws_kms_key.signing_previous.key_id
}

output "kms_signing_current_key_id" {
  description = "KMS key ID for signing-current"
  value       = aws_kms_key.signing_current.key_id
}

output "kms_signing_next_key_id" {
  description = "KMS key ID for signing-next"
  value       = aws_kms_key.signing_next.key_id
}

output "attester_lambda_arn" {
  description = "ARN of the attester Lambda function"
  value       = aws_lambda_function.attester.arn
}

output "attester_lambda_name" {
  description = "Name of the attester Lambda function"
  value       = aws_lambda_function.attester.function_name
}

output "rotation_lambda_arn" {
  description = "ARN of the custom-issuer-rotation Lambda function"
  value       = aws_lambda_function.rotation.arn
}

output "rotation_lambda_name" {
  description = "Name of the custom-issuer-rotation Lambda function"
  value       = aws_lambda_function.rotation.function_name
}

output "attester_secret_arn" {
  description = "ARN of the attester Secrets Manager secret"
  value       = aws_secretsmanager_secret.attester_config.arn
}

output "attester_eventbridge_rule_arn" {
  description = "ARN of the attester EventBridge schedule rule"
  value       = aws_cloudwatch_event_rule.attester_schedule.arn
}

output "rotation_eventbridge_rule_arn" {
  description = "ARN of the rotation EventBridge schedule rule"
  value       = aws_cloudwatch_event_rule.rotation_schedule.arn
}
