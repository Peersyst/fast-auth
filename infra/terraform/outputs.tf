output "kms_signing_previous_key_id" {
  description = "KMS key ID for signing-previous"
  value       = module.kms_signing_keys.signing_previous_key_id
}

output "kms_signing_current_key_id" {
  description = "KMS key ID for signing-current"
  value       = module.kms_signing_keys.signing_current_key_id
}

output "kms_signing_next_key_id" {
  description = "KMS key ID for signing-next"
  value       = module.kms_signing_keys.signing_next_key_id
}

output "attester_lambda_arn" {
  description = "ARN of the attester Lambda function"
  value       = module.attester.lambda_arn
}

output "attester_lambda_name" {
  description = "Name of the attester Lambda function"
  value       = module.attester.lambda_name
}

output "rotation_lambda_arn" {
  description = "ARN of the custom-issuer-rotation Lambda function"
  value       = module.custom_issuer_rotation.lambda_arn
}

output "rotation_lambda_name" {
  description = "Name of the custom-issuer-rotation Lambda function"
  value       = module.custom_issuer_rotation.lambda_name
}

output "attester_secret_arn" {
  description = "ARN of the attester Secrets Manager secret"
  value       = module.attester.secret_arn
}

output "attester_eventbridge_rule_arn" {
  description = "ARN of the attester EventBridge schedule rule"
  value       = module.attester.eventbridge_rule_arn
}

output "rotation_eventbridge_rule_arn" {
  description = "ARN of the rotation EventBridge schedule rule"
  value       = module.custom_issuer_rotation.eventbridge_rule_arn
}
